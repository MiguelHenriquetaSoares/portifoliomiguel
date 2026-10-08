<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Activity, ArrowDownToLine, Check, ChevronRight, Command, Database, ExternalLink, FileUser, FolderKanban, Github, Layers3, Mail, Minus, Monitor, PanelsTopLeft, Send, Terminal, UserRound, Wrench, X } from 'lucide-vue-next'
import { apps, projects, skills } from './data'

const windows = ref([])
const active = ref(null)
const z = ref(10)
const startOpen = ref(false)
const clock = ref(new Date())
const isMobile = ref(false)
const updateSize = () => { isMobile.value = window.innerWidth <= 680 }
let timer
onMounted(() => { timer = setInterval(() => clock.value = new Date(), 1000); updateSize(); window.addEventListener('resize', updateSize) })
onUnmounted(() => { clearInterval(timer); window.removeEventListener('resize', updateSize) })
const dateTime = computed(() => new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(clock.value))
const dateLabel = computed(() => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(clock.value))
const info = id => apps.find(app => app.id === id)
const openApp = id => { let win = windows.value.find(w => w.id === id); if (!win) { const index = windows.value.length; win = { id, minimized: false, x: isMobile.value ? 12 : 95 + (index % 4) * 34, y: isMobile.value ? 10 : 54 + (index % 4) * 27, z: ++z.value }; windows.value.push(win) } win.minimized = false; win.z = ++z.value; active.value = id; startOpen.value = false }
const focus = win => { win.z = ++z.value; active.value = win.id }
const close = id => { windows.value = windows.value.filter(w => w.id !== id); active.value = windows.value.filter(w => !w.minimized).at(-1)?.id ?? null }
const minimize = win => { win.minimized = true; active.value = null }
const toggleTask = win => { if (win.minimized) { win.minimized = false; focus(win) } else if (active.value === win.id) minimize(win); else focus(win) }
let drag = null
const beginDrag = (event, win) => { if (isMobile.value || event.button !== 0) return; focus(win); drag = { win, x: event.clientX - win.x, y: event.clientY - win.y }; window.addEventListener('pointermove', moveDrag); window.addEventListener('pointerup', endDrag, { once: true }) }
const moveDrag = event => { if (!drag) return; const el = document.querySelector(`[data-window="${drag.win.id}"]`); const maxX = window.innerWidth - (el?.offsetWidth ?? 400) + 12; const maxY = window.innerHeight - (el?.offsetHeight ?? 400) - 68; drag.win.x = Math.max(0, Math.min(maxX, event.clientX - drag.x)); drag.win.y = Math.max(0, Math.min(maxY, event.clientY - drag.y)) }
const endDrag = () => { drag = null; window.removeEventListener('pointermove', moveDrag) }
const details = ref(null)
const form = ref({ name: '', email: '', message: '' })
const formState = ref('')
const sending = ref(false)
const sendMessage = async () => {
  if (sending.value) return
  sending.value = true
  formState.value = ''
  try {
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.value.name.trim(), email: form.value.email.trim(), message: form.value.message.trim() }),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(result.error || 'Não foi possível enviar a mensagem. Tente novamente.')
    formState.value = 'Mensagem enviada com sucesso!'
    form.value = { name: '', email: '', message: '' }
  } catch (error) {
    formState.value = error.message || 'Não foi possível enviar a mensagem. Tente novamente.'
  } finally {
    sending.value = false
  }
}
const terminalInput = ref('')
const terminalHistory = ref([{ prompt: 'miguel@miguelos:~$', output: 'Olá! Digite help para ver os comandos disponíveis.' }])
const runCommand = command => { const value = command.trim(); if (!value) return; const answers = { help: 'Comandos: help, about, projects, skills, contact, clear', about: 'MiguelOS — portfólio de estudante de Técnico em Informática para Internet. Estou construindo minha trajetória com projetos web e mobile.', projects: projects.map(p => `• ${p.name} — ${p.status}`).join('\n'), skills: skills.map(g => `${g.category}: ${g.items.join(', ')}`).join('\n'), contact: 'Use a aplicação Contato para preparar uma mensagem.' }; if (value.toLowerCase() === 'clear') terminalHistory.value = []; else terminalHistory.value.push({ prompt: `miguel@miguelos:~$ ${value}`, output: answers[value.toLowerCase()] ?? `Comando não encontrado: ${value}. Digite help para ver as opções.` }); terminalInput.value = '' }
const submitTerminal = () => runCommand(terminalInput.value)
const iconMap = { 'user-round': UserRound, 'folder-kanban': FolderKanban, 'layers-3': Layers3, 'file-user': FileUser, send: Send, terminal: Terminal, 'panels-top-left': PanelsTopLeft, database: Database, wrench: Wrench }
const appIcon = id => iconMap[info(id)?.icon] ?? Command
const skillIcon = name => iconMap[name] ?? Command
const windowStyle = win => isMobile.value ? { zIndex: win.z } : { left: `${win.x}px`, top: `${win.y}px`, zIndex: win.z }
</script>

<template>
  <main class="desktop" @pointerdown.self="startOpen = false">
    <div class="wallpaper-orb orb-one"></div><div class="wallpaper-orb orb-two"></div><div class="wallpaper-grid"></div>
    <header class="brand"><div class="brand-mark"><Command :size="19" /></div><div><strong>MiguelOS</strong><span>PORTFÓLIO INTERATIVO</span></div></header>
    <div class="desktop-status"><span class="status-dot"></span> SISTEMA ONLINE <span class="status-divider">·</span> <span>PORTFÓLIO v1.0</span></div>
    <section class="icon-grid" aria-label="Aplicações do desktop">
      <button v-for="app in apps" :key="app.id" class="desktop-icon" @click="openApp(app.id)"><span class="desktop-icon-art" :style="{ '--app-color': app.color }"><component :is="appIcon(app.id)" :size="23" :stroke-width="1.7" /></span><span>{{ app.name }}</span></button>
    </section>
    <section class="welcome-card"><div class="eyebrow"><span class="status-dot"></span> DESKTOP PESSOAL</div><h1>Olá, eu sou o <span>Miguel.</span></h1><p>Estudante de Informática para Internet, explorando ideias e aprendendo a construir para a web.</p><button class="welcome-link" @click="openApp('about')">Conheça meu espaço <ChevronRight :size="15" /></button><div class="welcome-decoration"><span>{ }</span><span>01</span><span>;</span></div></section>
    <div class="desktop-hint"><span class="hint-key">↖</span> Abra uma aplicação para explorar</div>

    <section v-for="win in windows" v-show="!win.minimized" :key="win.id" :data-window="win.id" class="app-window" :class="{ focused: active === win.id }" :style="windowStyle(win)" @pointerdown="focus(win)">
      <header class="window-titlebar" @pointerdown="beginDrag($event, win)"><div class="window-app-icon" :style="{ color: info(win.id).color }"><component :is="appIcon(win.id)" :size="15" /></div><span class="window-title">{{ info(win.id).name }}</span><span class="window-path">MIGUELOS / {{ win.id.toUpperCase() }}</span><div class="window-actions"><button aria-label="Minimizar" @pointerdown.stop @click="minimize(win)"><Minus :size="15" /></button><button class="window-close" aria-label="Fechar" @pointerdown.stop @click="close(win.id)"><X :size="15" /></button></div></header>
      <div class="window-content">
        <template v-if="win.id === 'about'"><div class="app-heading"><div class="section-label">PERFIL</div><h2>Sobre Mim<span class="heading-period">.</span></h2><p>Um pouco sobre quem está por trás da tela.</p></div><div class="about-layout"><div class="profile-avatar"><UserRound :size="34" /><span>MS</span></div><div><div class="section-label">OI, EU SOU</div><h3>Miguel <span class="muted-inline">— estudante e criador</span></h3><p class="body-copy">Sou estudante do curso Técnico em Informática para Internet. Tenho aprendido desenvolvimento web e mobile na prática, criando projetos para entender como uma ideia sai do papel e ganha forma no navegador.</p><p class="body-copy">No momento, estou construindo minha base em programação, explorando interfaces e descobrindo em quais desafios quero me aprofundar.</p></div></div><div class="info-strip"><div><span>FORMAÇÃO</span><strong>Técnico em Informática para Internet</strong></div><div><span>INTERESSES</span><strong>Web · Mobile · Interfaces</strong></div><div><span>FOCO ATUAL</span><strong>Aprender construindo</strong></div></div></template>
        <template v-else-if="win.id === 'projects'"><div class="app-heading"><div class="section-label">PORTFÓLIO</div><h2>Meus Projetos<span class="heading-period">.</span></h2><p>Projetos de estudo e prática em desenvolvimento.</p></div><div class="project-grid"><article v-for="(project, index) in projects" :key="project.name" class="project-card"><div class="project-card-top"><span class="project-number">0{{ index + 1 }}</span><span class="project-status"><i></i>{{ project.status }}</span></div><h3>{{ project.name }}</h3><p>{{ project.description }}</p><div class="tech-list"><span v-for="tech in project.tech" :key="tech">{{ tech }}</span></div><button class="text-button" @click="details = project">Ver detalhes <ChevronRight :size="14" /></button></article></div><div v-if="details" class="detail-overlay" @click.self="details = null"><article class="detail-card"><button class="detail-close" aria-label="Fechar detalhes" @click="details = null"><X :size="17" /></button><span class="section-label">DETALHES DO PROJETO</span><h3>{{ details.name }}</h3><p>{{ details.detail }}</p><div class="tech-list"><span v-for="tech in details.tech" :key="tech">{{ tech }}</span></div></article></div><div class="content-note"><FolderOpen :size="14" /> Os projetos apresentados são exemplos de estudo; substitua ou complemente com seus trabalhos reais.</div></template>
        <template v-else-if="win.id === 'skills'"><div class="app-heading"><div class="section-label">CAIXA DE FERRAMENTAS</div><h2>Habilidades<span class="heading-period">.</span></h2><p>Tecnologias que estou estudando e usando nos projetos.</p></div><div class="skill-groups"><section v-for="group in skills" :key="group.category" class="skill-group"><h3><component :is="skillIcon(group.icon)" :size="17" />{{ group.category }}</h3><div class="skill-list"><div v-for="(skill, i) in group.items" :key="skill" class="skill-item"><div><span>{{ skill }}</span><span class="skill-dots"><i v-for="dot in 5" :key="dot" :class="{ filled: dot <= 2 + (i % 3) }"></i></span></div><div class="skill-track"><i :style="{ width: `${45 + ((i * 13) % 31)}%` }"></i></div></div></div></section></div><div class="content-note"><Activity :size="14" /> Os níveis são apenas uma referência visual: sigo aprendendo e praticando.</div></template>
        <template v-else-if="win.id === 'resume'"><div class="app-heading"><div class="section-label">PERFIL PROFISSIONAL</div><h2>Currículo<span class="heading-period">.</span></h2><p>Um resumo da minha formação e do caminho que estou construindo.</p></div><div class="resume-intro"><div><span class="section-label">MIGUEL</span><h3>Estudante de Informática para Internet</h3><p>Em formação, com interesse em desenvolvimento web e mobile.</p></div><span class="resume-badge">DISPONÍVEL PARA APRENDER</span></div><div class="resume-columns"><section><span class="section-label">FORMAÇÃO</span><div class="timeline-item"><i></i><div><strong>Técnico em Informática para Internet</strong><p>Formação técnica em andamento</p></div></div><span class="section-label">OBJETIVO</span><p class="body-copy">Desenvolver experiência na área de tecnologia, contribuir com projetos reais e continuar aprendendo desenvolvimento de aplicações web e mobile.</p></section><section><span class="section-label">CONHECIMENTOS</span><div class="resume-tags"><span v-for="item in ['HTML','CSS','JavaScript','Vue','Ionic','PHP','MySQL','Git']" :key="item">{{ item }}</span></div><span class="section-label resume-later">CURSOS E EXPERIÊNCIA</span><p class="body-copy">Espaço reservado para incluir cursos, experiências e projetos profissionais.</p></section></div><button class="secondary-button" disabled title="Adicione um PDF de currículo para habilitar o download"><ArrowDownToLine :size="16" /> Currículo em PDF ainda não disponível</button></template>
        <template v-else-if="win.id === 'contact'"><div class="app-heading"><div class="section-label">ENTRE EM CONTATO</div><h2>Vamos conversar<span class="heading-period">?</span></h2><p>Preencha os campos e envie sua mensagem.</p></div><form class="contact-form" @submit.prevent="sendMessage"><label>Seu nome<input v-model="form.name" required minlength="2" placeholder="Como posso te chamar?" :disabled="sending" /></label><label>Seu e-mail<input v-model="form.email" type="email" required placeholder="voce@exemplo.com" :disabled="sending" /></label><label>Mensagem<textarea v-model="form.message" required minlength="8" rows="4" placeholder="Escreva sua mensagem..." :disabled="sending"></textarea></label><button class="primary-button" type="submit" :disabled="sending"><Send :size="15" /> {{ sending ? 'Enviando...' : 'Enviar mensagem' }}</button><p v-if="formState" class="form-feedback" :class="{ 'form-error': formState !== 'Mensagem enviada com sucesso!' }"><Check v-if="formState === 'Mensagem enviada com sucesso!'" :size="15" /><X v-else :size="15" /> {{ formState }}</p></form><div class="contact-links"><span class="section-label">OUTROS CANAIS</span><p><Mail :size="15" /> E-mail e redes sociais podem ser adicionados aqui.</p><a href="https://github.com/" target="_blank" rel="noreferrer"><Github :size="15" /> GitHub <ExternalLink :size="13" /></a><span class="content-note">Adicione seus links pessoais para que as pessoas possam encontrar seu perfil.</span></div></template>
        <template v-else-if="win.id === 'terminal'"><div class="terminal-top"><span class="terminal-live"><i></i> MIGUELOS TERMINAL</span><span>zsh — 80 × 24</span></div><div class="terminal-screen" @click="$refs.termInput?.focus()"><div v-for="(line, i) in terminalHistory" :key="i" class="terminal-line"><div class="terminal-prompt">{{ line.prompt }}</div><pre>{{ line.output }}</pre></div><form class="terminal-command" @submit.prevent="submitTerminal"><span>miguel@miguelos:~$</span><input ref="termInput" v-model="terminalInput" aria-label="Comando do terminal" autocomplete="off" spellcheck="false" /><button type="submit" aria-label="Executar comando"><ChevronRight :size="16" /></button></form></div><div class="terminal-shortcuts"><span>EXPERIMENTE</span><button v-for="cmd in ['help','about','projects','skills','contact','clear']" :key="cmd" @click="runCommand(cmd)">{{ cmd }}</button></div></template>
      </div>
    </section>

    <Transition name="menu"><section v-if="startOpen" class="start-menu"><div class="start-menu-head"><div class="start-avatar">M</div><div><strong>MiguelOS</strong><span>Portfólio interativo</span></div></div><div class="start-menu-label">APLICAÇÕES</div><button v-for="app in apps" :key="app.id" class="start-app" @click="openApp(app.id)"><span :style="{ color: app.color }"><component :is="appIcon(app.id)" :size="18" /></span><span>{{ app.name }}</span><ChevronRight :size="14" /></button><div class="start-menu-foot"><span><span class="status-dot"></span> Tudo funcionando</span><Monitor :size="16" /></div></section></Transition>
    <footer class="taskbar"><button class="start-button" :class="{ selected: startOpen }" aria-label="Abrir menu iniciar" @click="startOpen = !startOpen"><span class="start-glyph"><i></i><i></i><i></i><i></i></span></button><span class="taskbar-separator"></span><div class="task-apps"><button v-for="app in apps" :key="app.id" class="task-app" :class="{ open: windows.some(w=>w.id===app.id), active: active===app.id && windows.some(w=>!w.minimized && w.id===app.id) }" :aria-label="app.name" :title="app.name" @click="windows.some(w=>w.id===app.id) ? toggleTask(windows.find(w=>w.id===app.id)) : openApp(app.id)"><component :is="appIcon(app.id)" :size="17" /></button></div><div class="taskbar-right"><div class="system-indicator"><span></span> <span class="system-label">ONLINE</span></div><div class="clock"><strong>{{ dateTime }}</strong><span>{{ dateLabel }}</span></div></div></footer>
  </main>
</template>
