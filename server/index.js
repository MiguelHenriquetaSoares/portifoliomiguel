import 'dotenv/config'
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const port = Number(process.env.PORT || 3001)
const maxBodyBytes = 12_000
const requests = new Map()
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function json(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  })
  res.end(JSON.stringify(body))
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character])
}

async function handleContact(req, res) {
  const ip = req.socket.remoteAddress || 'unknown'
  const now = Date.now()
  const recent = (requests.get(ip) || []).filter(time => now - time < 10 * 60 * 1000)
  if (recent.length >= 5) return json(res, 429, { error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' })
  requests.set(ip, [...recent, now])

  if (!process.env.RESEND_API_KEY || !process.env.CONTACT_EMAIL || !process.env.CONTACT_FROM_EMAIL) {
    return json(res, 503, { error: 'Não foi possível enviar a mensagem. Tente novamente.' })
  }

  let raw = ''
  for await (const chunk of req) {
    raw += chunk
    if (Buffer.byteLength(raw) > maxBodyBytes) return json(res, 413, { error: 'A mensagem é muito grande.' })
  }

  let data
  try { data = JSON.parse(raw) } catch { return json(res, 400, { error: 'Os dados enviados são inválidos.' }) }
  const name = typeof data.name === 'string' ? data.name.trim() : ''
  const email = typeof data.email === 'string' ? data.email.trim() : ''
  const message = typeof data.message === 'string' ? data.message.trim() : ''
  if (name.length < 2 || name.length > 100 || !emailPattern.test(email) || email.length > 254 || message.length < 8 || message.length > 5000) {
    return json(res, 400, { error: 'Confira seu nome, e-mail e mensagem e tente novamente.' })
  }

  const text = `Nome: ${name}\nE-mail para resposta: ${email}\n\nMensagem:\n${message}`
  const safeName = escapeHtml(name)
  const safeEmail = escapeHtml(email)
  const safeMessage = escapeHtml(message).replace(/\r?\n/g, '<br>')
  try {
    const delivery = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.CONTACT_FROM_EMAIL,
        to: [process.env.CONTACT_EMAIL],
        reply_to: email,
        subject: `Mensagem do portfólio — ${name}`,
        text,
        html: `<p><strong>Nome:</strong> ${safeName}</p><p><strong>E-mail para resposta:</strong> ${safeEmail}</p><p><strong>Mensagem:</strong><br>${safeMessage}</p>`,
      }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!delivery.ok) {
      // Do not expose provider responses, recipient addresses, or credentials to the browser.
      console.error(`Resend delivery failed with HTTP ${delivery.status}`)
      return json(res, 502, { error: 'Não foi possível enviar a mensagem. Tente novamente.' })
    }
    return json(res, 200, { ok: true })
  } catch (error) {
    console.error(`Resend request failed: ${error.name}`)
    return json(res, 502, { error: 'Não foi possível enviar a mensagem. Tente novamente.' })
  }
}

async function serveStatic(req, res) {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
    const requested = pathname === '/' ? path.join(dist, 'index.html') : path.resolve(dist, `.${pathname}`)
    if (!requested.startsWith(`${dist}${path.sep}`) && requested !== path.join(dist, 'index.html')) {
      res.writeHead(403).end('Forbidden'); return
    }
    let file = requested
    try { if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html') } catch { file = path.join(dist, 'index.html') }
    const content = await readFile(file)
    const ext = path.extname(file)
    const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' }
    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' })
    res.end(content)
  } catch {
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Execute npm run build antes de iniciar o servidor de produção.')
  }
}

createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/api/contact') {
    if (!req.headers['content-type']?.includes('application/json')) return json(res, 415, { error: 'Formato de envio inválido.' })
    try { await handleContact(req, res) } catch { json(res, 400, { error: 'Não foi possível processar a mensagem.' }) }
    return
  }
  if (req.url?.startsWith('/api/')) return json(res, 404, { error: 'Endpoint não encontrado.' })
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return }
  await serveStatic(req, res)
}).listen(port, '0.0.0.0', () => console.log(`MiguelOS server running on port ${port}`))
