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
    this.renderer.domElement.style.pointerEvents = 'auto' // Ensure canvas captures events
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    Object.assign(this.controls, { 
      enableDamping: true, 
      dampingFactor: 0.05, 
      autoRotate: true, 
      autoRotateSpeed: 0.3, 
      enablePan: false, 
      enableRotate: true, 
      enableZoom: true,
      minDistance: 300, 
      maxDistance: 2000, 
      zoomSpeed: 0.5 
    })
    this.controls.saveState()
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
  getPanelOffset(dist) {
    const pnl = document.querySelector('[data-project-panel]')
    if (!pnl) return new THREE.Vector3()
    const fovRad = this.camera.fov * Math.PI / 180
    const viewDir = this.camera.position.clone().sub(this.controls.target).normalize()
    const forward = viewDir.clone().negate()
    const worldUp = new THREE.Vector3(0, 1, 0)
    const right = new THREE.Vector3().crossVectors(forward, worldUp).normalize()
    if (window.innerWidth >= 769) {
      const panelRatio = pnl.offsetWidth / this.container.clientWidth
      const visibleWidth = 2 * dist * Math.tan(fovRad / 2) * this.camera.aspect
      return right.multiplyScalar((panelRatio / 2) * visibleWidth)
    } else {
      const visibleHeight = 2 * dist * Math.tan(fovRad / 2)
      const up = new THREE.Vector3().crossVectors(right, forward).normalize()
      return up.multiplyScalar(-(0.35 / 2) * visibleHeight)
    }
  }

  focusOnNode(ng) {
    const p = ng.position.clone()
    const d = this.camera.position.clone().sub(this.controls.target).normalize()
    const dist = 420
    const offset = this.getPanelOffset(dist)
    this.cameraGoal = p.clone().add(d.multiplyScalar(dist)).add(offset)
    this.cameraTarget = p.clone().add(offset)
    this.transitioning = true
  }

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
    this.controls.enabled = false
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
    this.controls.enabled = true
    this.controls.autoRotate = true
    this.resetCameraFocus()
    this.restoreNodeVisibility()
    this.selected = null
    this.controls.update()
  }

  // ── Events ────────────────────────────────────────────────────────────
  addEventHandlers() {
    window.addEventListener('resize', () => this.onResize())
    this.renderer.domElement.addEventListener('mousemove', e => this.onMouseMove(e))
    this.renderer.domElement.addEventListener('click', e => this.onClick(e))
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (this.readerActive) this.exitReader()
        else if (this.selected) this.deselectNode()
      }
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
    this.selected = null
    this.controls.enabled = true
    this.controls.autoRotate = true
    this.restoreNodeVisibility()
    this.resetCameraFocus()
    this.controls.update()
    window.hidePanel()
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

// ══════════════════════════════════════════════════════════════════════════
//  ARAUCÁRIA TREE — 2D hierarchical visualization (inverted, canopy shape)
// ══════════════════════════════════════════════════════════════════════════

class AraucariaTree {
  constructor(wrapper, data, onSelect) {
    this.wrapper = wrapper; this.data = data; this.onSelect = onSelect
    this.canvas = document.createElement('canvas')
    this.canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:none;'
    this.ctx = this.canvas.getContext('2d')
    this.wrapper.appendChild(this.canvas)
    this.nodes = []; this.edges = []; this.root = null
    this.panX = 0; this.panY = 0; this.zoom = 1
    this.drag = null; this.dragMoved = false; this.selected = null; this.hovered = null
    this._raf = null; this.t = 0; this._centered = false
    this.build()
  }

  build() {
    this.nodes = []; this.edges = [];
    const groups = {}
    for (const d of this.data) (groups[d.kind] ??= []).push(d)

    this.root = { id: '_root', label: 'Technical Knowledge OS', kind: 'central', depth: 0, children: [], x: 0, y: 0 }
    this.nodes.push(this.root)

    for (const [kind, label] of [['project','Projetos'],['post','Publicações'],['document','Documentos']]) {
      const items = groups[kind]; if (!items?.length) continue
      const cat = { id: `_${kind}`, label: `${label} (${items.length})`, kind, depth: 1, children: [], x: 0, y: 0 }
      this.root.children.push(cat); this.nodes.push(cat); this.edges.push([this.root, cat])
      
      const hierarchy = this._buildBinaryHierarchy(items, 2, kind)
      if (hierarchy) {
        cat.children.push(hierarchy)
        this.edges.push([cat, hierarchy])
      }
    }
  }

  _buildBinaryHierarchy(items, depth, kind) {
    if (items.length === 0) return null
    if (items.length === 1) {
      const d = items[0]
      const leaf = { id: d.id, label: d.name || d.title, kind, depth: 5, item: d, x: 0, y: 0, children: [] }
      this.nodes.push(leaf); return leaf
    }
    const mid = Math.ceil(items.length / 2)
    const left = this._buildBinaryHierarchy(items.slice(0, mid), depth + 1, kind)
    const right = this._buildBinaryHierarchy(items.slice(mid), depth + 1, kind)
    const branch = { id: `_b_${Math.random()}`, label: '', kind: 'branch', depth, children: [left, right], x: 0, y: 0 }
    this.nodes.push(branch)
    if (left) this.edges.push([branch, left])
    if (right) this.edges.push([branch, right])
    return branch
  }

  resize() {
    const dpr = Math.min(devicePixelRatio, 2)
    const W = this.wrapper.clientWidth, H = this.wrapper.clientHeight
    this.canvas.width = W * dpr; this.canvas.height = H * dpr
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    this.W = W; this.H = H; this.layout()
  }

  layout() {
    const cats = this.root.children; if (!cats.length) return
    
    // Araucária Parameters
    const trunkHeight = 500
    const canopyWidth = 900
    const crownY = -trunkHeight * 0.4
    
    this.root.x = 0; this.root.y = trunkHeight * 0.6
    
    const numCats = cats.length
    cats.forEach((cat, i) => {
      const angle = (i / (numCats - 1) - 0.5) * Math.PI * 0.7
      cat.x = Math.sin(angle) * (canopyWidth * 0.25)
      cat.y = crownY - Math.abs(Math.cos(angle)) * 40
      
      if (cat.children[0]) {
        this._layoutBranch(cat.children[0], cat.x, cat.y, angle, canopyWidth * 0.35, 1)
      }
    })

    if (!this._centered) {
      const xs = this.nodes.map(n => n.x), ys = this.nodes.map(n => n.y)
      const bx = Math.min(...xs) - 150, by = Math.min(...ys) - 150
      const bw = Math.max(...xs) - bx + 300, bh = Math.max(...ys) - by + 300
      this.zoom = Math.min(this.W / bw, this.H / bh) * 0.85
      this.panX = this.W / 2 - (bx + bw / 2) * this.zoom
      this.panY = this.H / 2 - (by + bh / 2) * this.zoom
      this._centered = true
    }
  }

  _layoutBranch(node, px, py, pAngle, length, level) {
    const spread = 0.5 / Math.sqrt(level)
    node.children.forEach((child, i) => {
      const angle = pAngle + (i === 0 ? -spread : spread)
      child.x = px + Math.sin(angle) * length
      child.y = py - Math.abs(Math.cos(angle)) * (length * 0.22) // Flatten for Araucária look
      this._layoutBranch(child, child.x, child.y, angle, length * 0.75, level + 1)
    })
  }

  sx(wx) { return wx * this.zoom + this.panX }
  sy(wy) { return wy * this.zoom + this.panY }
  wx(sx) { return (sx - this.panX) / this.zoom }
  wy(sy) { return (sy - this.panY) / this.zoom }

  hitTest(screenX, screenY) {
    const mx = this.wx(screenX), my = this.wy(screenY)
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const n = this.nodes[i], r = [28, 20, 14][n.depth] || 14
      if (Math.hypot(mx - n.x, my - n.y) < r + 10) return n
    }
    return null
  }

  draw() {
    const { ctx, W, H, zoom } = this; this.t += 0.016
    ctx.fillStyle = '#020408'; ctx.fillRect(0, 0, W, H)

    // Ground glow at root
    const rx = this.sx(this.root.x), ry = this.sy(this.root.y)
    const rg = ctx.createRadialGradient(rx, ry, 0, rx, ry, 320 * zoom)
    rg.addColorStop(0, 'rgba(0,194,255,0.07)'); rg.addColorStop(1, 'transparent')
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H)

    // Dot grid
    const step = 40 * zoom
    if (step > 6) {
      ctx.fillStyle = 'rgba(255,255,255,0.02)'
      const mx = this.panX % step, my = this.panY % step
      for (let x = mx; x < W; x += step) for (let y = my; y < H; y += step) { ctx.beginPath(); ctx.arc(x, y, 0.7, 0, 6.28); ctx.fill() }
    }

    // Edges
    for (const [from, to] of this.edges) {
      const sel = this.selected
      const active = sel && (from === sel || to === sel || from.children?.includes(sel))
      const c = KIND_HEX[to.kind] || '#64748b'
      const x1 = this.sx(from.x), y1 = this.sy(from.y), x2 = this.sx(to.x), y2 = this.sy(to.y)
      
      ctx.beginPath(); ctx.moveTo(x1, y1)
      if (from.depth === 0) {
        // Straight trunk
        ctx.lineTo(x2, y2)
        ctx.strokeStyle = '#2d3748'; ctx.lineWidth = 10 * zoom
      } else {
        // Curved Araucária branch
        const cx = x1 + (x2 - x1) * 0.5
        const cy = Math.min(y1, y2) - 40 * zoom // Concave up
        ctx.quadraticCurveTo(cx, cy, x2, y2)
        ctx.strokeStyle = active ? c + 'cc' : c + '22'
        ctx.lineWidth = Math.max(1, (4 - from.depth) * zoom)
      }
      ctx.stroke()
    }

    // Nodes
    for (const n of [...this.nodes].sort((a, b) => b.depth - a.depth)) {
      const x = this.sx(n.x), y = this.sy(n.y)
      const baseR = [28, 20, 14][n.depth]; const r = baseR * zoom
      const c = KIND_HEX[n.kind] || '#ffffff'
      const isSel = n === this.selected, isHov = n === this.hovered
      const pulse = isSel ? 1 + Math.sin(this.t * 3) * 0.06 : 1

      // Glow
      if (isSel || n.depth === 0) {
        const g = ctx.createRadialGradient(x, y, r * pulse, x, y, r * 3.5 * pulse)
        g.addColorStop(0, c + '44'); g.addColorStop(1, c + '00')
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 3.5 * pulse, 0, 6.28); ctx.fill()
      }
      // Ring on hover/select
      if (isHov || isSel) {
        ctx.beginPath(); ctx.arc(x, y, r * pulse + 4, 0, 6.28)
        ctx.strokeStyle = c + (isSel ? 'cc' : '55'); ctx.lineWidth = 2; ctx.stroke()
      }
      // Body
      ctx.beginPath(); ctx.arc(x, y, r * pulse, 0, 6.28)
      const gr = ctx.createRadialGradient(x - r * 0.25, y - r * 0.25, 0, x, y, r * pulse)
      gr.addColorStop(0, c + 'ee'); gr.addColorStop(1, c + '77')
      ctx.fillStyle = gr; ctx.fill()

      // Label
      const fs = [13, 11.5, 9.5][n.depth] * Math.min(zoom, 1.6)
      if (fs > 4.5) {
        ctx.font = `${n.depth < 2 ? '700' : '500'} ${fs}px "Inter",system-ui,sans-serif`
        ctx.textAlign = 'center'; ctx.textBaseline = 'top'
        ctx.fillStyle = isSel ? '#fff' : 'rgba(255,255,255,0.6)'
        const lb = n.label.length > 28 ? n.label.slice(0, 26) + '..' : n.label
        ctx.fillText(lb, x, y + r * pulse + 6)
      }
    }
  }

  bindEvents() {
    const c = this.canvas
    c.addEventListener('pointerdown', e => { this.drag = { x: e.clientX, y: e.clientY, px: this.panX, py: this.panY }; this.dragMoved = false; c.setPointerCapture(e.pointerId) })
    c.addEventListener('pointermove', e => {
      const rect = c.getBoundingClientRect()
      if (this.drag) { const dx = e.clientX - this.drag.x, dy = e.clientY - this.drag.y; if (Math.abs(dx) + Math.abs(dy) > 4) this.dragMoved = true; this.panX = this.drag.px + dx; this.panY = this.drag.py + dy }
      this.hovered = this.hitTest(e.clientX - rect.left, e.clientY - rect.top)
      c.style.cursor = this.drag ? 'grabbing' : this.hovered ? 'pointer' : 'grab'
    })
    c.addEventListener('pointerup', e => {
      const wasDrag = this.dragMoved; this.drag = null; if (wasDrag) return
      const rect = c.getBoundingClientRect()
      const hit = this.hitTest(e.clientX - rect.left, e.clientY - rect.top)
      if (hit) {
        this.selected = hit === this.selected ? null : hit
        if (this.selected) { if (hit.item) this.onSelect?.(hit.item, this.data); else this.onSelect?.({ kind: 'central', name: hit.depth === 0 ? 'Hiro' : hit.label }, this.data) }
        else window.hidePanel?.()
      } else { this.selected = null; window.hidePanel?.() }
    })
    c.addEventListener('wheel', e => {
      e.preventDefault(); const rect = c.getBoundingClientRect()
      const mx = e.clientX - rect.left, my = e.clientY - rect.top
      const worldX = this.wx(mx), worldY = this.wy(my)
      this.zoom = Math.max(0.12, Math.min(5, this.zoom * (e.deltaY < 0 ? 1.12 : 0.89)))
      this.panX = mx - worldX * this.zoom; this.panY = my - worldY * this.zoom
    }, { passive: false })
    this._onResize = () => this.resize(); window.addEventListener('resize', this._onResize)
  }

  _loop() { this.draw(); this._raf = requestAnimationFrame(() => this._loop()) }
  show() { this.canvas.style.display = ''; this._centered = false; this.resize(); this.bindEvents(); this._loop() }
  hide() { this.canvas.style.display = 'none'; cancelAnimationFrame(this._raf); if (this._onResize) { window.removeEventListener('resize', this._onResize); this._onResize = null } }
  destroy() { this.hide(); this.canvas.remove() }
}

// ── Panel + View Toggle ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('[data-project-flow]')
  const jsonEl = document.getElementById('projects-data')
  if (!container || !jsonEl) return
  const data = JSON.parse(jsonEl.textContent)

  // ── Initialize visualizations ──
  let mode = '3d'
  window.projectMap = new ProjectMap3D(container, data)
  const araucaria = new AraucariaTree(container, data, (item, allData) => window.showPanel(item, allData))

  // ── View toggle button ──
  const shell = container.closest('.project-flow-shell') || container.parentElement
  if (shell) {
    // Remove existing toggle if any
    shell.querySelectorAll('.view-mode-toggle').forEach(el => el.remove())
    
    const toggle = document.createElement('button')
    toggle.className = 'view-mode-toggle'; toggle.title = 'Alternar visualização'
    toggle.style.zIndex = '9999' // Ensure it's on top
    
    const setToggleIcon = (m) => {
      toggle.innerHTML = m === '3d' 
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg><span>Araucária</span>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><path d="M12 2v2m0 16v2m-8-10H2m20 0h-2m-2.1-6.9l-1.4 1.4m-9 9l-1.4 1.4m0-11.8l1.4 1.4m9 9l1.4 1.4"/></svg><span>3D</span>'
    }
    
    setToggleIcon('3d')
    shell.prepend(toggle)
    
    toggle.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation()
      if (mode === '3d') {
        mode = 'tree'; setToggleIcon('tree')
        window.projectMap.renderer.domElement.style.display = 'none'
        window.projectMap.controls.enabled = false; window.projectMap.controls.autoRotate = false
        if (window.projectMap.readerActive) window.projectMap.exitReader()
        araucaria.show(); window.hidePanel()
      } else {
        mode = '3d'; setToggleIcon('3d')
        araucaria.hide()
        window.projectMap.renderer.domElement.style.display = ''
        window.projectMap.controls.enabled = true; window.projectMap.controls.autoRotate = true
        window.hidePanel()
      }
    })
  }

  window.showPanel = (item, allData) => {
    const pnl = document.querySelector('[data-project-panel]'); if (!pnl) return
    const scrollBody = pnl.querySelector('.panel-scroll-body')
    const actionsEl = pnl.querySelector('.panel-actions')

    // ── Central node: show full grouped content index ──
    if (item.kind === 'central') {
      pnl.querySelector('[data-panel-name]').textContent = item.name || 'Hiro'
      pnl.querySelector('[data-panel-role]').textContent = 'MAPA DO ECOSSISTEMA'
      pnl.querySelector('[data-panel-role]').style.color = KIND_HEX.central
      pnl.querySelector('[data-panel-headline]').textContent = 'Todo o conteudo do blog, agrupado por categoria.'
      pnl.querySelector('[data-panel-summary]').textContent = ''
      const stk = pnl.querySelector('[data-panel-stack]'); if (stk) stk.innerHTML = ''

      // Ensure dynamic containers exist
      let secEl = pnl.querySelector('[data-panel-sections]')
      if (!secEl) { secEl = document.createElement('div'); secEl.setAttribute('data-panel-sections',''); secEl.setAttribute('data-reveal',''); secEl.className = 'panel-sections'; scrollBody.appendChild(secEl) }
      let relEl = pnl.querySelector('[data-panel-related]')
      if (!relEl) { relEl = document.createElement('div'); relEl.setAttribute('data-panel-related',''); relEl.setAttribute('data-reveal',''); relEl.className = 'panel-related'; scrollBody.appendChild(relEl) }
      secEl.innerHTML = ''; relEl.innerHTML = ''

      // Group items by kind
      const groups = {}
      const kindOrder = ['project', 'post', 'document']
      for (const d of (allData || [])) {
        const k = d.kind || 'post'
        if (!groups[k]) groups[k] = []
        groups[k].push(d)
      }

      let html = ''
      for (const kind of kindOrder) {
        const items = groups[kind]
        if (!items?.length) continue
        const color = KIND_HEX[kind] || KIND_HEX.post
        const label = KIND_LABEL[kind] || kind
        html += `<div class="hub-group" style="--hub-color:${color}">
          <h3 class="hub-group-title"><span class="hub-group-dot" style="background:${color}"></span>${esc(label)}s <span class="hub-group-count">${items.length}</span></h3>
          <ul class="hub-group-list">${items.map(d =>
            `<li class="hub-group-item"><button type="button" class="hub-group-link" data-hub-id="${esc(d.id)}"><span class="hub-group-link-name">${esc(d.name || d.title)}</span></button></li>`
          ).join('')}</ul>
        </div>`
      }

      secEl.innerHTML = html

      // Wire up clicks → navigate to node in 3D canvas
      secEl.querySelectorAll('[data-hub-id]').forEach(btn => {
        btn.addEventListener('click', () => {
          const tNode = window.projectMap.nodes.find(n => n.userData.item?.id === btn.dataset.hubId)
          if (tNode) window.projectMap.handleNodeClick(tNode)
        })
      })

      if (actionsEl) actionsEl.style.display = 'none'
      pnl.dataset.open = 'true'; pnl.setAttribute('aria-hidden','false')
      if (scrollBody) scrollBody.scrollTop = 0
      requestAnimationFrame(() => pnl.querySelectorAll('[data-reveal]').forEach((el,i) => { el.classList.remove('reveal-in'); setTimeout(()=>el.classList.add('reveal-in'), 60*i) }))
      return
    }

    // ── Regular node panel ──
    if (actionsEl) actionsEl.style.display = ''
    pnl.querySelector('[data-panel-name]').textContent = item.name || item.title
    pnl.querySelector('[data-panel-role]').textContent = item.kind.toUpperCase()
    pnl.querySelector('[data-panel-role]').style.color = KIND_HEX[item.kind] || KIND_HEX.post
    pnl.querySelector('[data-panel-headline]').textContent = item.headline || item.summary || ''
    pnl.querySelector('[data-panel-summary]').textContent = (item.headline && item.summary !== item.headline) ? item.summary : ''
    const stk = pnl.querySelector('[data-panel-stack]'); if (stk) stk.innerHTML = (item.stack||[]).map(s=>`<span class="stack-chip">${esc(s)}</span>`).join('')
    let secEl = pnl.querySelector('[data-panel-sections]')
    if (!secEl) { secEl = document.createElement('div'); secEl.setAttribute('data-panel-sections',''); secEl.setAttribute('data-reveal',''); secEl.className = 'panel-sections'; scrollBody.appendChild(secEl) }
    secEl.innerHTML = ''
    let relEl = pnl.querySelector('[data-panel-related]')
    if (!relEl) { relEl = document.createElement('div'); relEl.setAttribute('data-panel-related',''); relEl.setAttribute('data-reveal',''); relEl.className = 'panel-related'; scrollBody.appendChild(relEl) }
    const rel = findRelated(item, allData||[])
    relEl.innerHTML = rel.length ? `<h3 class="panel-related-title">Relacionados</h3><ul class="panel-related-list">${rel.map(r=>`<li class="panel-related-item"><button type="button" class="panel-related-link" data-related-id="${esc(r.id)}"><span class="panel-related-kind" style="color:${KIND_HEX[r.kind]||KIND_HEX.post}">${esc(r.kind)}</span><span class="panel-related-name">${esc(r.name||r.title)}</span></button></li>`).join('')}</ul>` : ''
    // Related items click → navigate to that node in the 3D canvas
    relEl.querySelectorAll('[data-related-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.relatedId
        const targetNode = window.projectMap.nodes.find(n => n.userData.item?.id === targetId)
        if (targetNode) window.projectMap.handleNodeClick(targetNode)
      })
    })
    const btn = pnl.querySelector('[data-panel-link]')
    if (btn) { btn.href = '#'; btn.onclick = ev => { ev.preventDefault(); window.projectMap.enterReader(item) } }
    pnl.dataset.open = 'true'; pnl.setAttribute('aria-hidden','false')
    if (scrollBody) scrollBody.scrollTop = 0
    requestAnimationFrame(() => pnl.querySelectorAll('[data-reveal]').forEach((el,i) => { el.classList.remove('reveal-in'); setTimeout(()=>el.classList.add('reveal-in'), 60*i) }))
  }

  window.hidePanel = () => { const p = document.querySelector('[data-project-panel]'); if (!p) return; p.dataset.open='false'; p.setAttribute('aria-hidden','true'); p.querySelectorAll('[data-reveal]').forEach(e=>e.classList.remove('reveal-in')) }
  document.querySelector('[data-panel-close]')?.addEventListener('click', () => window.projectMap?.deselectNode())

  // ── Handle ?select=ID from URL ──
  const params = new URLSearchParams(window.location.search)
  const selectId = params.get('select')
  if (selectId) {
    setTimeout(() => {
      if (mode === '3d') {
        const node = window.projectMap.nodes.find(n => n.userData.item?.id === selectId)
        if (node) window.projectMap.handleNodeClick(node)
      } else {
        const node = araucaria.nodes.find(n => n.item?.id === selectId)
        if (node) window.showPanel(node.item, data)
      }
    }, 800)
  }
})
