import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

/**
 * Technical Knowledge OS — 3D Project Flow (V7 — Full Article Reader)
 */

const KIND_COLOR = {
  post: 0x00C2FF, project: 0x7C5CFF, document: 0x10B981, central: 0xFFFFFF,
}
const KIND_HEX = {
  post: '#00C2FF', project: '#7C5CFF', document: '#10B981', central: '#FFFFFF',
}
const KIND_LABEL = {
  post: 'Publicação', project: 'Projeto', document: 'Documento',
}

function createGlowTexture(size = 128) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')
  const h = size / 2, g = ctx.createRadialGradient(h, h, 0, h, h, h)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.15, 'rgba(255,255,255,0.8)')
  g.addColorStop(0.4, 'rgba(255,255,255,0.15)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size)
  return new THREE.CanvasTexture(c)
}

function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML }

function findRelated(item, all) {
  if (!item.stack?.length) return []
  const tags = new Set(item.stack.map(t => t.toLowerCase()))
  return all.filter(d => d.id !== (item.id || '')).map(d => {
    const ov = [...tags].filter(t => new Set((d.stack || []).map(s => s.toLowerCase())).has(t)).length
    return { ...d, overlap: ov }
  }).filter(d => d.overlap > 0).sort((a, b) => b.overlap - a.overlap).slice(0, 5)
}

class ProjectMap3D {
  constructor(container, data) {
    this.container = container
    this.data = data
    this.nodes = []
    this.connections = []
    this.selected = null
    this.cameraGoal = null
    this.cameraTarget = null
    this.transitioning = false
    this.glowTex = createGlowTexture(256)
    this.readerActive = false

    this.initScene()
    this.createStarfield()
    this.createNebula()
    this.createNodes()
    this.createConnections()
    this.buildReaderDOM()
    this.addEventHandlers()
    this.animate()
  }

  // ── Scene ─────────────────────────────────────────────────────────────
  initScene() {
    this.scene = new THREE.Scene()
    this.scene.fog = new THREE.FogExp2(0x020408, 0.00035)
    const w = this.container.clientWidth, h = this.container.clientHeight
    this.camera = new THREE.PerspectiveCamera(60, w / h, 1, 8000)
    this.camera.position.set(0, 300, 900)
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    this.renderer.setClearColor(0x020408, 1)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(w, h)
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.2
    this.container.appendChild(this.renderer.domElement)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    Object.assign(this.controls, { enableDamping: true, dampingFactor: 0.06, autoRotate: true, autoRotateSpeed: 0.3, enablePan: false, minDistance: 300, maxDistance: 2000, zoomSpeed: 0.4 })
    this.scene.add(new THREE.AmbientLight(0x1a1a2e, 0.6))
    const kl = new THREE.PointLight(0x00C2FF, 3, 1800); kl.position.set(400, 400, 400); this.scene.add(kl)
    const fl = new THREE.PointLight(0x7C5CFF, 1.5, 1400); fl.position.set(-300, -200, 300); this.scene.add(fl)
    const rl = new THREE.PointLight(0x10B981, 1, 1000); rl.position.set(0, -400, -300); this.scene.add(rl)
    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()
  }

  createStarfield() {
    const N = 4000, pos = new Float32Array(N * 3), col = new Float32Array(N * 3)
    const pal = [new THREE.Color(0xffffff), new THREE.Color(0xaaddff), new THREE.Color(0xffeedd), new THREE.Color(0xddccff)]
    for (let i = 0; i < N; i++) {
      const r = 1500 + Math.random() * 3000, t = Math.random() * Math.PI * 2, p = Math.acos(2 * Math.random() - 1)
      pos[i*3] = r*Math.sin(p)*Math.cos(t); pos[i*3+1] = r*Math.sin(p)*Math.sin(t); pos[i*3+2] = r*Math.cos(p)
      const c = pal[Math.floor(Math.random() * pal.length)]; col[i*3] = c.r; col[i*3+1] = c.g; col[i*3+2] = c.b
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
    this.starfield = new THREE.Points(geo, new THREE.PointsMaterial({ size: 3, map: this.glowTex, transparent: true, opacity: 0.9, vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }))
    this.scene.add(this.starfield)
  }

  createNebula() {
    [0x0a1628, 0x120a30, 0x081420].forEach((c, i) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(800+i*300, 16, 16), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.08-i*0.02, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false }))
      m.rotation.set(Math.random()*3, Math.random()*3, 0); this.scene.add(m)
    })
  }

  // ── Camera ────────────────────────────────────────────────────────────
  focusOnNode(ng) { const p = ng.position.clone(), d = this.camera.position.clone().sub(this.controls.target).normalize(); this.cameraGoal = p.clone().add(d.multiplyScalar(420)); this.cameraTarget = p.clone(); this.transitioning = true }
  resetCameraFocus() { this.cameraGoal = new THREE.Vector3(0, 200, 800); this.cameraTarget = new THREE.Vector3(0, 0, 0); this.transitioning = true }
  updateCameraTransition() { if (!this.transitioning) return; this.camera.position.lerp(this.cameraGoal, 0.045); this.controls.target.lerp(this.cameraTarget, 0.045); if (this.camera.position.distanceTo(this.cameraGoal) < 1) this.transitioning = false }

  // ── Highlight ─────────────────────────────────────────────────────────
  highlightNode(sel) {
    this.nodes.forEach(n => { const s = n === sel; n.traverse(c => { if (c.material?.opacity !== undefined) { c.material._s = c.material._s ?? c.material.opacity; c.material.opacity = s ? c.material._s : c.material._s * 0.15 } }) })
    this.connections.forEach(c => { c.material._s = c.material._s ?? c.material.opacity; c.material.opacity = c.material._s * 0.08 })
  }
  restoreNodeVisibility() {
    this.nodes.forEach(n => n.traverse(c => { if (c.material?._s !== undefined) c.material.opacity = c.material._s }))
    this.connections.forEach(c => { if (c.material?._s !== undefined) c.material.opacity = c.material._s })
  }

  // ── Nodes ─────────────────────────────────────────────────────────────
  createNodes() {
    this.addNode({ kind: 'central', name: 'Hiro' }, new THREE.Vector3(0,0,0), true)
    const items = this.data, R = 400, GA = Math.PI * (3 - Math.sqrt(5))
    for (let i = 0; i < items.length; i++) {
      const y = 1-(i/(items.length-1))*2, r = Math.sqrt(1-y*y), t = GA*i
      this.addNode(items[i], new THREE.Vector3(Math.cos(t)*r*R, y*R, Math.sin(t)*r*R))
    }
  }

  addNode(item, position, isCentral = false) {
    const cc = KIND_COLOR[item.kind] || 0x64748b, color = new THREE.Color(cc)
    const g = new THREE.Group(); g.position.copy(position)
    g.userData = { item, isCentral, rings: [], pulsePhase: Math.random()*Math.PI*2 }
    const sz = isCentral ? 16 : 10
    g.add(new THREE.Mesh(new THREE.SphereGeometry(sz, 48, 48), new THREE.MeshPhysicalMaterial({ color: cc, emissive: cc, emissiveIntensity: isCentral ? 2 : 1.5, metalness: 0.1, roughness: 0.05, transmission: 0.85, thickness: 2, transparent: true, opacity: 0.95, clearcoat: 1, clearcoatRoughness: 0.1, ior: 1.5 })))
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: cc, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }))
    const gs = isCentral ? 80 : 50; glow.scale.set(gs, gs, 1); g.add(glow); g.userData.glowSprite = glow
    for (let r = 0; r < (isCentral ? 3 : 1); r++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(sz*1.8+r*7, 0.3, 8, 100), new THREE.MeshBasicMaterial({ color: cc, transparent: true, opacity: 0.5-r*0.12, blending: THREE.AdditiveBlending, depthWrite: false }))
      ring.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, 0); g.add(ring)
      g.userData.rings.push({ mesh: ring, speedX: (Math.random()-0.5)*0.008, speedY: (Math.random()-0.5)*0.012 })
    }
    const label = (item.name || item.title || '').toUpperCase()
    if (label) {
      const lc = document.createElement('canvas'); lc.width = 512; lc.height = 96
      const lx = lc.getContext('2d'); lx.font = isCentral ? 'bold 40px "JetBrains Mono"' : '600 26px "JetBrains Mono"'
      lx.textAlign = 'center'; lx.textBaseline = 'middle'; lx.fillStyle = '#fff'
      lx.shadowBlur = isCentral ? 20 : 12; lx.shadowColor = isCentral ? '#fff' : `#${color.getHexString()}`
      lx.fillText(label.length > 28 ? label.slice(0, 26)+'..' : label, 256, 48)
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(lc), transparent: true, opacity: isCentral ? 0.95 : 0.85, depthWrite: false }))
      sp.position.y = sz + (isCentral ? 26 : 18); sp.scale.set(isCentral ? 80 : 140, isCentral ? 30 : 26, 1); g.add(sp)
    }
    this.scene.add(g); this.nodes.push(g)
  }

  createConnections() {
    const ctr = this.nodes[0].position
    this.nodes.slice(1).forEach(n => {
      const t = n.position, cc = KIND_COLOR[n.userData.item.kind] || 0x00C2FF
      const mid = ctr.clone().add(t).multiplyScalar(0.5); mid.y += 30+Math.random()*40
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(new THREE.QuadraticBezierCurve3(ctr, mid, t).getPoints(32)), new THREE.LineBasicMaterial({ color: cc, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false }))
      this.scene.add(line); this.connections.push(line)
    })
  }

  // ══════════════════════════════════════════════════════════════════════
  //  READER MODE — full scrollable article overlay
  // ══════════════════════════════════════════════════════════════════════

  buildReaderDOM() {
    this.readerEl = document.createElement('div')
    this.readerEl.className = 'reader-article'
    this.readerEl.innerHTML = `
      <header class="reader-article-bar">
        <div class="reader-article-bar-left">
          <button class="reader-article-back" data-r-close>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>
            Voltar ao Mapa
          </button>
        </div>
        <div class="reader-article-bar-center">
          <span class="reader-article-kind" data-r-kind></span>
          <span class="reader-article-bar-title" data-r-bar-title></span>
        </div>
        <div class="reader-article-bar-right">
          <a class="reader-article-link" data-r-fullpage href="#" target="_blank" rel="noopener">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            Página completa
          </a>
          <a class="reader-article-link" data-r-repo href="#" target="_blank" rel="noopener">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
            Repositório
          </a>
        </div>
      </header>
      <main class="reader-article-body" data-r-body>
        <article class="reader-article-content prose" data-r-content></article>
      </main>
    `
    this.container.appendChild(this.readerEl)
    this.readerEl.querySelector('[data-r-close]').onclick = () => this.exitReader()
  }

  enterReader(item) {
    this.readerActive = true
    this.nodes.forEach(n => n.visible = false)
    this.connections.forEach(c => c.visible = false)
    this.controls.autoRotate = false
    window.hidePanel()

    const accent = KIND_HEX[item.kind] || KIND_HEX.post
    this.readerEl.style.setProperty('--reader-accent', accent)
    this.readerEl.querySelector('[data-r-kind]').textContent = (KIND_LABEL[item.kind] || item.kind).toUpperCase()
    this.readerEl.querySelector('[data-r-bar-title]').textContent = item.name || item.title

    // Links
    const fullpageLink = this.readerEl.querySelector('[data-r-fullpage]')
    const repoLink = this.readerEl.querySelector('[data-r-repo]')
    const pageUrl = item.resolved_url || item.url || ''
    fullpageLink.href = pageUrl || '#'
    fullpageLink.style.display = pageUrl ? '' : 'none'
    const repoUrl = item.repo_url || ''
    repoLink.href = repoUrl || '#'
    repoLink.style.display = repoUrl ? '' : 'none'

    // Build article header + body
    const title = esc(item.name || item.title)
    const summary = esc(item.headline || item.summary || '')
    const stackHtml = (item.stack || []).map(s => `<span class="reader-chip">${esc(s)}</span>`).join('')
    const bodyHtml = item.body_html || `<p>${summary}</p>`

    const content = this.readerEl.querySelector('[data-r-content]')
    content.innerHTML = `
      <header class="reader-article-header">
        <span class="reader-article-header-kind" style="color:${accent};border-color:${accent}">${(KIND_LABEL[item.kind] || item.kind).toUpperCase()}</span>
        <h1 class="reader-article-h1">${title}</h1>
        <p class="reader-article-summary">${summary}</p>
        ${stackHtml ? `<div class="reader-article-stack">${stackHtml}</div>` : ''}
      </header>
      <div class="reader-article-divider" style="background:${accent}"></div>
      <section class="reader-article-prose">${bodyHtml}</section>
    `

    // Scroll to top
    this.readerEl.querySelector('[data-r-body]').scrollTop = 0
    this.readerEl.classList.add('open')

    // Re-render mermaid diagrams and MathJax
    requestAnimationFrame(() => {
      try { if (window.mermaid) { window.mermaid.run({ nodes: content.querySelectorAll('.mermaid') }) } } catch(_) {}
      try { if (window.MathJax?.typesetPromise) { window.MathJax.typesetPromise([content]) } } catch(_) {}
      try { if (window.lucide) { window.lucide.createIcons({ nodes: content.querySelectorAll('[data-lucide]') }) } } catch(_) {}
    })
  }

  exitReader() {
    this.readerActive = false
    this.readerEl.classList.remove('open')
    this.nodes.forEach(n => n.visible = true)
    this.connections.forEach(c => c.visible = true)
    this.controls.autoRotate = true
    this.resetCameraFocus()
    this.restoreNodeVisibility()
    this.selected = null
  }

  // ── Events ────────────────────────────────────────────────────────────
  addEventHandlers() {
    window.addEventListener('resize', () => this.onResize())
    this.renderer.domElement.addEventListener('mousemove', e => this.onMouseMove(e))
    this.renderer.domElement.addEventListener('click', e => this.onClick(e))
    window.addEventListener('keydown', e => {
      if (this.readerActive && e.key === 'Escape') this.exitReader()
    })
  }

  onResize() { const w = this.container.clientWidth, h = this.container.clientHeight; this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.renderer.setSize(w, h) }

  onMouseMove(e) {
    if (this.readerActive) return
    const r = this.renderer.domElement.getBoundingClientRect()
    this.mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1
    this.mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1
    this.raycaster.setFromCamera(this.mouse, this.camera)
    const hits = this.raycaster.intersectObjects(this.nodes, true)
    this.nodes.forEach(n => n.scale.lerp(new THREE.Vector3(1,1,1), 0.08))
    if (hits.length) {
      let tg = hits[0].object; while (tg.parent && !tg.userData.item) tg = tg.parent
      if (tg.userData.item) { tg.scale.lerp(new THREE.Vector3(1.25,1.25,1.25), 0.15); document.body.style.cursor = 'pointer'; return }
    }
    document.body.style.cursor = 'default'
  }

  onClick(e) {
    if (this.readerActive) return
    this.raycaster.setFromCamera(this.mouse, this.camera)
    const hits = this.raycaster.intersectObjects(this.nodes, true)
    if (hits.length) { let tg = hits[0].object; while (tg.parent && !tg.userData.item) tg = tg.parent; if (tg.userData.item) { this.handleNodeClick(tg); return } }
    this.deselectNode()
  }

  handleNodeClick(node) {
    if (this.selected === node) { this.deselectNode(); return }
    this.selected = node; this.controls.autoRotate = false
    this.focusOnNode(node); this.highlightNode(node)
    window.showPanel(node.userData.item, this.data)
  }

  deselectNode() {
    this.selected = null; this.controls.autoRotate = true
    this.restoreNodeVisibility(); this.resetCameraFocus(); window.hidePanel()
  }

  // ── Animate ───────────────────────────────────────────────────────────
  animate() {
    requestAnimationFrame(() => this.animate())
    this.updateCameraTransition(); this.controls.update()
    const t = performance.now() * 0.001
    if (this.starfield) { this.starfield.rotation.y = t * 0.005; this.starfield.rotation.x = Math.sin(t*0.003)*0.02 }
    if (!this.readerActive) {
      this.nodes.forEach((g, i) => {
        if (i > 0) g.position.y += Math.sin(t*0.8+i*0.7)*0.04
        g.userData.rings?.forEach(r => { r.mesh.rotation.x += r.speedX; r.mesh.rotation.y += r.speedY })
        const gl = g.userData.glowSprite; if (gl) gl.material.opacity = 0.28+Math.sin(t*1.2+(g.userData.pulsePhase||0))*0.08
      })
    }
    this.renderer.render(this.scene, this.camera)
  }
}

// ── Panel ───────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('[data-project-flow]')
  const jsonEl = document.getElementById('projects-data')
  if (!container || !jsonEl) return
  const data = JSON.parse(jsonEl.textContent)
  window.projectMap = new ProjectMap3D(container, data)

  window.showPanel = (item, allData) => {
    const pnl = document.querySelector('[data-project-panel]'); if (!pnl) return
    pnl.querySelector('[data-panel-name]').textContent = item.name || item.title
    pnl.querySelector('[data-panel-role]').textContent = item.kind.toUpperCase()
    pnl.querySelector('[data-panel-role]').style.color = KIND_HEX[item.kind] || KIND_HEX.post
    pnl.querySelector('[data-panel-headline]').textContent = item.headline || item.summary || ''
    pnl.querySelector('[data-panel-summary]').textContent = (item.headline && item.summary !== item.headline) ? item.summary : ''
    const stk = pnl.querySelector('[data-panel-stack]'); if (stk) stk.innerHTML = (item.stack||[]).map(s=>`<span class="stack-chip">${esc(s)}</span>`).join('')
    let secEl = pnl.querySelector('[data-panel-sections]')
    if (!secEl) { secEl = document.createElement('div'); secEl.setAttribute('data-panel-sections',''); secEl.setAttribute('data-reveal',''); secEl.className = 'panel-sections'; const a = pnl.querySelector('.panel-actions'); a ? pnl.insertBefore(secEl, a) : pnl.appendChild(secEl) }
    secEl.innerHTML = ''
    let relEl = pnl.querySelector('[data-panel-related]')
    if (!relEl) { relEl = document.createElement('div'); relEl.setAttribute('data-panel-related',''); relEl.setAttribute('data-reveal',''); relEl.className = 'panel-related'; const a = pnl.querySelector('.panel-actions'); a ? pnl.insertBefore(relEl, a) : pnl.appendChild(relEl) }
    const rel = findRelated(item, allData||[])
    relEl.innerHTML = rel.length ? `<h3 class="panel-related-title">Relacionados</h3><ul class="panel-related-list">${rel.map(r=>`<li class="panel-related-item"><a href="${esc(r.url||'#')}" class="panel-related-link"><span class="panel-related-kind" style="color:${KIND_HEX[r.kind]||KIND_HEX.post}">${esc(r.kind)}</span><span class="panel-related-name">${esc(r.name||r.title)}</span></a></li>`).join('')}</ul>` : ''
    const btn = pnl.querySelector('[data-panel-link]')
    if (btn) { btn.href = '#'; btn.onclick = ev => { ev.preventDefault(); window.projectMap.enterReader(item) } }
    pnl.dataset.open = 'true'; pnl.setAttribute('aria-hidden','false')
    requestAnimationFrame(() => pnl.querySelectorAll('[data-reveal]').forEach((el,i) => { el.classList.remove('reveal-in'); setTimeout(()=>el.classList.add('reveal-in'), 60*i) }))
  }

  window.hidePanel = () => { const p = document.querySelector('[data-project-panel]'); if (!p) return; p.dataset.open='false'; p.setAttribute('aria-hidden','true'); p.querySelectorAll('[data-reveal]').forEach(e=>e.classList.remove('reveal-in')) }
  document.querySelector('[data-panel-close]')?.addEventListener('click', () => window.projectMap?.deselectNode())
})
