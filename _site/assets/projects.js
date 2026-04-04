import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

/**
 * Technical Knowledge OS — 3D Project Flow (V5 — Reader Mode)
 */

const KIND_COLOR = {
  post:     0x00C2FF,
  project:  0x7C5CFF,
  document: 0x10B981,
  central:  0xFFFFFF,
}

const KIND_HEX = {
  post:     '#00C2FF',
  project:  '#7C5CFF',
  document: '#10B981',
  central:  '#FFFFFF',
}

// ── Glow texture ─────────────────────────────────────────────────────────
function createGlowTexture(size = 128) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')
  const half = size / 2
  const g = ctx.createRadialGradient(half, half, 0, half, half, half)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.15, 'rgba(255,255,255,0.8)')
  g.addColorStop(0.4, 'rgba(255,255,255,0.15)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return new THREE.CanvasTexture(c)
}

// ── Transition effects for reader cards ──────────────────────────────────
const TRANSITIONS = {
  fade:        { from: { opacity: 0, y: 0, scale: 0.92 },   to: { opacity: 1, y: 0, scale: 1 } },
  slideUp:     { from: { opacity: 0, y: 80, scale: 1 },     to: { opacity: 1, y: 0, scale: 1 } },
  slideDown:   { from: { opacity: 0, y: -80, scale: 1 },    to: { opacity: 1, y: 0, scale: 1 } },
  zoomIn:      { from: { opacity: 0, y: 0, scale: 0.6 },    to: { opacity: 1, y: 0, scale: 1 } },
  zoomRotate:  { from: { opacity: 0, y: 0, scale: 0.7 },    to: { opacity: 1, y: 0, scale: 1 } },
}
const TRANSITION_NAMES = Object.keys(TRANSITIONS)

class ProjectMap3D {
  constructor(container, data) {
    this.container = container
    this.data = data
    this.nodes = []
    this.connections = []
    this.selected = null
    this.cameraTarget = null
    this.cameraGoal = null
    this.transitioning = false
    this.glowTex = createGlowTexture(256)

    // Reader state
    this.readerActive = false
    this.readerCards = []
    this.readerIndex = 0
    this.readerGroup = null
    this.readerItem = null

    this.initScene()
    this.createStarfield()
    this.createNebula()
    this.createNodes()
    this.createConnections()
    this.createReaderUI()
    this.addEventHandlers()
    this.animate()
  }

  initScene() {
    this.scene = new THREE.Scene()
    this.scene.fog = new THREE.FogExp2(0x020408, 0.00035)

    const w = this.container.clientWidth
    const h = this.container.clientHeight

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
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.06
    this.controls.autoRotate = true
    this.controls.autoRotateSpeed = 0.3
    this.controls.enablePan = false
    this.controls.minDistance = 300
    this.controls.maxDistance = 2000
    this.controls.zoomSpeed = 0.4

    this.scene.add(new THREE.AmbientLight(0x1a1a2e, 0.6))
    const keyLight = new THREE.PointLight(0x00C2FF, 3, 1800)
    keyLight.position.set(400, 400, 400)
    this.scene.add(keyLight)
    const fillLight = new THREE.PointLight(0x7C5CFF, 1.5, 1400)
    fillLight.position.set(-300, -200, 300)
    this.scene.add(fillLight)
    const rimLight = new THREE.PointLight(0x10B981, 1, 1000)
    rimLight.position.set(0, -400, -300)
    this.scene.add(rimLight)

    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()
  }

  // ── Starfield ──────────────────────────────────────────────────────────
  createStarfield() {
    const COUNT = 4000
    const positions = new Float32Array(COUNT * 3)
    const sizes = new Float32Array(COUNT)
    const colors = new Float32Array(COUNT * 3)
    const palette = [new THREE.Color(0xffffff), new THREE.Color(0xaaddff), new THREE.Color(0xffeedd), new THREE.Color(0xddccff)]

    for (let i = 0; i < COUNT; i++) {
      const r = 1500 + Math.random() * 3000
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)
      sizes[i] = 1.5 + Math.random() * 3
      const c = palette[Math.floor(Math.random() * palette.length)]
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    this.starfield = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 3, map: this.glowTex, transparent: true, opacity: 0.9,
      vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    }))
    this.scene.add(this.starfield)
  }

  createNebula() {
    ;[0x0a1628, 0x120a30, 0x081420].forEach((color, i) => {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(800 + i * 300, 16, 16),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.08 - i * 0.02, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false })
      )
      mesh.rotation.set(Math.random() * 3, Math.random() * 3, 0)
      this.scene.add(mesh)
    })
  }

  // ── Camera ────────────────────────────────────────────────────────────
  focusOnNode(nodeGroup) {
    const nodePos = nodeGroup.position.clone()
    const dir = this.camera.position.clone().sub(this.controls.target).normalize()
    this.cameraGoal = nodePos.clone().add(dir.multiplyScalar(420))
    this.cameraTarget = nodePos.clone()
    this.transitioning = true
  }

  resetCameraFocus() {
    this.cameraGoal = new THREE.Vector3(0, 200, 800)
    this.cameraTarget = new THREE.Vector3(0, 0, 0)
    this.transitioning = true
  }

  updateCameraTransition() {
    if (!this.transitioning) return
    this.camera.position.lerp(this.cameraGoal, 0.045)
    this.controls.target.lerp(this.cameraTarget, 0.045)
    if (this.camera.position.distanceTo(this.cameraGoal) < 1) this.transitioning = false
  }

  // ── Highlight ─────────────────────────────────────────────────────────
  highlightNode(selectedGroup) {
    this.nodes.forEach(n => {
      const sel = n === selectedGroup
      n.traverse(child => {
        if (child.material && child.material.opacity !== undefined) {
          child.material._saved = child.material._saved ?? child.material.opacity
          child.material.opacity = sel ? child.material._saved : child.material._saved * 0.15
        }
      })
    })
    this.connections.forEach(c => {
      c.material._saved = c.material._saved ?? c.material.opacity
      c.material.opacity = c.material._saved * 0.08
    })
  }

  restoreNodeVisibility() {
    this.nodes.forEach(n => {
      n.traverse(child => {
        if (child.material && child.material._saved !== undefined) child.material.opacity = child.material._saved
      })
    })
    this.connections.forEach(c => {
      if (c.material._saved !== undefined) c.material.opacity = c.material._saved
    })
  }

  // ── Nodes ─────────────────────────────────────────────────────────────
  createNodes() {
    this.addNode({ kind: 'central', name: 'Hiro', headline: 'Central Intelligence System' }, new THREE.Vector3(0, 0, 0), true)
    const items = this.data
    const count = items.length
    const R = 400, GA = Math.PI * (3 - Math.sqrt(5))

    for (let i = 0; i < count; i++) {
      const y = 1 - (i / (count - 1)) * 2
      const r = Math.sqrt(1 - y * y)
      const theta = GA * i
      this.addNode(items[i], new THREE.Vector3(Math.cos(theta) * r * R, y * R, Math.sin(theta) * r * R))
    }
  }

  addNode(item, position, isCentral = false) {
    const colorCode = KIND_COLOR[item.kind] || 0x64748b
    const color = new THREE.Color(colorCode)
    const group = new THREE.Group()
    group.position.copy(position)
    group.userData = { item, isCentral, rings: [], pulsePhase: Math.random() * Math.PI * 2 }

    const coreSize = isCentral ? 16 : 10
    group.add(new THREE.Mesh(
      new THREE.SphereGeometry(coreSize, 48, 48),
      new THREE.MeshPhysicalMaterial({
        color: colorCode, emissive: colorCode, emissiveIntensity: isCentral ? 2 : 1.5,
        metalness: 0.1, roughness: 0.05, transmission: 0.85, thickness: 2,
        transparent: true, opacity: 0.95, clearcoat: 1, clearcoatRoughness: 0.1, ior: 1.5,
      })
    ))

    const glowMat = new THREE.SpriteMaterial({ map: this.glowTex, color: colorCode, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false })
    const glow = new THREE.Sprite(glowMat)
    glow.scale.set(isCentral ? 80 : 50, isCentral ? 80 : 50, 1)
    group.add(glow)
    group.userData.glowSprite = glow

    const ringCount = isCentral ? 3 : 1
    for (let r = 0; r < ringCount; r++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(coreSize * 1.8 + r * 7, 0.3, 8, 100),
        new THREE.MeshBasicMaterial({ color: colorCode, transparent: true, opacity: 0.5 - r * 0.12, blending: THREE.AdditiveBlending, depthWrite: false })
      )
      ring.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0)
      group.add(ring)
      group.userData.rings.push({ mesh: ring, speedX: (Math.random() - 0.5) * 0.008, speedY: (Math.random() - 0.5) * 0.012 })
    }

    const label = (item.name || item.title || '').toUpperCase()
    if (label) {
      const lc = document.createElement('canvas')
      const lctx = lc.getContext('2d')
      lc.width = 512; lc.height = 96
      lctx.font = isCentral ? 'bold 40px "JetBrains Mono"' : '600 26px "JetBrains Mono"'
      lctx.textAlign = 'center'; lctx.textBaseline = 'middle'
      lctx.fillStyle = '#ffffff'
      lctx.shadowBlur = isCentral ? 20 : 12
      lctx.shadowColor = isCentral ? '#ffffff' : `#${color.getHexString()}`
      lctx.fillText(label.length > 28 ? label.slice(0, 26) + '..' : label, 256, 48)
      const tex = new THREE.CanvasTexture(lc)
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: isCentral ? 0.95 : 0.85, depthWrite: false }))
      sprite.position.y = coreSize + (isCentral ? 26 : 18)
      sprite.scale.set(isCentral ? 80 : 140, isCentral ? 30 : 26, 1)
      group.add(sprite)
    }

    this.scene.add(group)
    this.nodes.push(group)
  }

  // ── Connections ────────────────────────────────────────────────────────
  createConnections() {
    const center = this.nodes[0].position
    this.nodes.slice(1).forEach(node => {
      const target = node.position
      const colorCode = KIND_COLOR[node.userData.item.kind] || 0x00C2FF
      const mid = center.clone().add(target).multiplyScalar(0.5)
      mid.y += 30 + Math.random() * 40
      const points = new THREE.QuadraticBezierCurve3(center, mid, target).getPoints(32)
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({ color: colorCode, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false })
      )
      this.scene.add(line)
      this.connections.push(line)
    })
  }

  // ══════════════════════════════════════════════════════════════════════
  //  READER MODE — presents sections as canvas cards with transitions
  // ══════════════════════════════════════════════════════════════════════

  createReaderUI() {
    // Overlay navigation
    this.readerOverlay = document.createElement('div')
    this.readerOverlay.className = 'reader-overlay'
    this.readerOverlay.style.cssText = 'position:absolute;inset:0;z-index:50;display:none;pointer-events:none;'
    this.readerOverlay.innerHTML = `
      <div class="reader-nav" style="position:absolute;bottom:32px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:16px;pointer-events:auto;background:rgba(4,8,16,0.85);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:10px 20px;">
        <button class="reader-btn reader-prev" style="background:none;border:none;color:rgba(255,255,255,0.6);cursor:pointer;font:600 13px 'JetBrains Mono';padding:6px 14px;border-radius:6px;transition:all 0.2s;" data-reader-prev>&larr; Anterior</button>
        <span class="reader-counter" style="font:500 12px 'JetBrains Mono';color:rgba(255,255,255,0.4);min-width:60px;text-align:center;" data-reader-counter>1 / 1</span>
        <button class="reader-btn reader-next" style="background:none;border:none;color:rgba(255,255,255,0.6);cursor:pointer;font:600 13px 'JetBrains Mono';padding:6px 14px;border-radius:6px;transition:all 0.2s;" data-reader-next>Próximo &rarr;</button>
      </div>
      <button class="reader-close" style="position:absolute;top:20px;right:20px;pointer-events:auto;background:rgba(4,8,16,0.8);border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.7);cursor:pointer;font:600 11px 'JetBrains Mono';padding:10px 18px;border-radius:8px;text-transform:uppercase;letter-spacing:0.1em;transition:all 0.2s;" data-reader-close>Voltar ao Mapa</button>
      <div class="reader-title-bar" style="position:absolute;top:20px;left:20px;pointer-events:none;">
        <span style="font:700 10px 'JetBrains Mono';text-transform:uppercase;letter-spacing:0.15em;color:rgba(255,255,255,0.3);" data-reader-kind></span>
        <h2 style="font:700 18px 'Inter';color:#fff;margin:4px 0 0;" data-reader-title></h2>
      </div>
    `
    this.container.appendChild(this.readerOverlay)

    this.readerOverlay.querySelector('[data-reader-prev]').onclick = () => this.readerNavigate(-1)
    this.readerOverlay.querySelector('[data-reader-next]').onclick = () => this.readerNavigate(1)
    this.readerOverlay.querySelector('[data-reader-close]').onclick = () => this.exitReader()

    // Hover styles
    this.readerOverlay.querySelectorAll('.reader-btn').forEach(btn => {
      btn.onmouseenter = () => { btn.style.color = '#fff'; btn.style.background = 'rgba(255,255,255,0.08)' }
      btn.onmouseleave = () => { btn.style.color = 'rgba(255,255,255,0.6)'; btn.style.background = 'none' }
    })
  }

  enterReader(item) {
    this.readerActive = true
    this.readerItem = item
    this.readerIndex = 0

    // Hide explore elements
    this.nodes.forEach(n => n.visible = false)
    this.connections.forEach(c => c.visible = false)
    this.controls.autoRotate = false
    this.controls.enablePan = true

    // Build section cards as 3D planes
    this.readerGroup = new THREE.Group()
    this.scene.add(this.readerGroup)

    const sections = item.sections || []
    if (sections.length === 0) {
      sections.push({ title: item.name || item.title, content: item.summary || '', type: 'intro' })
    }

    const kindColor = KIND_COLOR[item.kind] || 0x00C2FF
    this.readerCards = sections.map((sec, idx) => {
      const card = this._createReaderCard(sec, idx, kindColor)
      card.visible = false
      this.readerGroup.add(card)
      card.position.set(0, 0, 0)
      return { mesh: card, section: sec, transition: TRANSITION_NAMES[idx % TRANSITION_NAMES.length] }
    })

    // Camera for reader
    this.cameraGoal = new THREE.Vector3(0, 0, 500)
    this.cameraTarget = new THREE.Vector3(0, 0, 0)
    this.transitioning = true

    // Show overlay
    this.readerOverlay.style.display = 'block'
    this.readerOverlay.querySelector('[data-reader-kind]').textContent = item.kind.toUpperCase()
    this.readerOverlay.querySelector('[data-reader-title]').textContent = item.name || item.title

    // Hide panel
    window.hidePanel()

    this._showReaderCard(0)
  }

  _createReaderCard(section, index, kindColor) {
    const W = 720, H = 440
    const canvas = document.createElement('canvas')
    canvas.width = W; canvas.height = H
    const ctx = canvas.getContext('2d')

    // Background
    ctx.fillStyle = 'rgba(6, 10, 20, 0.96)'
    ctx.beginPath()
    ctx.roundRect(0, 0, W, H, 16)
    ctx.fill()

    // Accent border
    const hexColor = `#${new THREE.Color(kindColor).getHexString()}`
    ctx.strokeStyle = hexColor
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.roundRect(2, 2, W - 4, H - 4, 14)
    ctx.stroke()

    // Section number
    ctx.fillStyle = hexColor
    ctx.font = 'bold 14px "JetBrains Mono"'
    ctx.globalAlpha = 0.5
    ctx.fillText(`${String(index + 1).padStart(2, '0')}`, 36, 50)
    ctx.globalAlpha = 1

    // Title
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 28px "Inter"'
    ctx.fillText(section.title || 'Section', 36, 96)

    // Divider
    ctx.fillStyle = hexColor
    ctx.globalAlpha = 0.3
    ctx.fillRect(36, 112, 120, 2)
    ctx.globalAlpha = 1

    // Content — word wrap
    ctx.font = '17px "Inter"'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.72)'
    const content = section.content || ''
    const words = content.split(/\s+/)
    let line = '', y = 148, maxW = W - 72
    for (const word of words) {
      const test = line + word + ' '
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line.trim(), 36, y)
        line = word + ' '
        y += 28
        if (y > H - 40) { ctx.fillText('...', 36, y); break }
      } else {
        line = test
      }
    }
    if (y <= H - 40) ctx.fillText(line.trim(), 36, y)

    const tex = new THREE.CanvasTexture(canvas)
    tex.minFilter = THREE.LinearFilter
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false })
    return new THREE.Mesh(new THREE.PlaneGeometry(500, 305), mat)
  }

  _showReaderCard(index) {
    // Hide all
    this.readerCards.forEach(c => { c.mesh.visible = false; c.mesh.material.opacity = 0 })

    const card = this.readerCards[index]
    if (!card) return

    card.mesh.visible = true
    card.mesh.position.set(0, 0, 0)
    card.mesh.scale.set(1, 1, 1)
    card.mesh.rotation.set(0, 0, 0)

    // Animate in
    const tr = TRANSITIONS[card.transition] || TRANSITIONS.fade
    card.mesh.material.opacity = tr.from.opacity
    card.mesh.position.y = tr.from.y
    card.mesh.scale.setScalar(tr.from.scale)

    const start = performance.now()
    const duration = 600
    const anim = () => {
      const elapsed = performance.now() - start
      const p = Math.min(elapsed / duration, 1)
      const ease = 1 - Math.pow(1 - p, 3) // easeOutCubic
      card.mesh.material.opacity = tr.from.opacity + (tr.to.opacity - tr.from.opacity) * ease
      card.mesh.position.y = tr.from.y + (tr.to.y - tr.from.y) * ease
      const s = tr.from.scale + (tr.to.scale - tr.from.scale) * ease
      card.mesh.scale.setScalar(s)
      if (p < 1) requestAnimationFrame(anim)
    }
    requestAnimationFrame(anim)

    // Update counter
    const counter = this.readerOverlay.querySelector('[data-reader-counter]')
    if (counter) counter.textContent = `${index + 1} / ${this.readerCards.length}`

    // Update button states
    const prev = this.readerOverlay.querySelector('[data-reader-prev]')
    const next = this.readerOverlay.querySelector('[data-reader-next]')
    if (prev) prev.style.opacity = index === 0 ? '0.3' : '1'
    if (next) next.style.opacity = index === this.readerCards.length - 1 ? '0.3' : '1'
  }

  readerNavigate(dir) {
    const newIndex = this.readerIndex + dir
    if (newIndex < 0 || newIndex >= this.readerCards.length) return

    // Fade out current
    const current = this.readerCards[this.readerIndex]
    if (current) {
      const fadeStart = performance.now()
      const fadeDuration = 250
      const fadeAnim = () => {
        const p = Math.min((performance.now() - fadeStart) / fadeDuration, 1)
        current.mesh.material.opacity = 1 - p
        current.mesh.position.y = -dir * 40 * p
        if (p < 1) requestAnimationFrame(fadeAnim)
        else current.mesh.visible = false
      }
      requestAnimationFrame(fadeAnim)
    }

    this.readerIndex = newIndex
    setTimeout(() => this._showReaderCard(newIndex), 280)
  }

  exitReader() {
    this.readerActive = false
    this.readerOverlay.style.display = 'none'
    this.controls.enablePan = false

    if (this.readerGroup) {
      this.scene.remove(this.readerGroup)
      this.readerGroup = null
    }
    this.readerCards = []
    this.readerItem = null

    // Restore explore
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
    this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e))
    this.renderer.domElement.addEventListener('click', (e) => this.onClick(e))

    // Keyboard nav for reader
    window.addEventListener('keydown', (e) => {
      if (!this.readerActive) return
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') this.readerNavigate(1)
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') this.readerNavigate(-1)
      else if (e.key === 'Escape') this.exitReader()
    })
  }

  onResize() {
    const w = this.container.clientWidth, h = this.container.clientHeight
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
  }

  onMouseMove(e) {
    if (this.readerActive) return
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    this.raycaster.setFromCamera(this.mouse, this.camera)
    const hits = this.raycaster.intersectObjects(this.nodes, true)
    this.nodes.forEach(n => n.scale.lerp(new THREE.Vector3(1, 1, 1), 0.08))
    if (hits.length > 0) {
      let tg = hits[0].object
      while (tg.parent && !tg.userData.item) tg = tg.parent
      if (tg.userData.item) { tg.scale.lerp(new THREE.Vector3(1.25, 1.25, 1.25), 0.15); document.body.style.cursor = 'pointer'; return }
    }
    document.body.style.cursor = 'default'
  }

  onClick(e) {
    if (this.readerActive) return
    this.raycaster.setFromCamera(this.mouse, this.camera)
    const hits = this.raycaster.intersectObjects(this.nodes, true)
    if (hits.length > 0) {
      let tg = hits[0].object
      while (tg.parent && !tg.userData.item) tg = tg.parent
      if (tg.userData.item) { this.handleNodeClick(tg); return }
    }
    this.deselectNode()
  }

  handleNodeClick(node) {
    if (this.selected === node) { this.deselectNode(); return }
    this.selected = node
    this.controls.autoRotate = false
    this.focusOnNode(node)
    this.highlightNode(node)
    window.showPanel(node.userData.item, this.data)
  }

  deselectNode() {
    this.selected = null
    this.controls.autoRotate = true
    this.restoreNodeVisibility()
    this.resetCameraFocus()
    window.hidePanel()
  }

  // ── Animate ───────────────────────────────────────────────────────────
  animate() {
    requestAnimationFrame(() => this.animate())
    this.updateCameraTransition()
    this.controls.update()
    const t = performance.now() * 0.001
    if (this.starfield) { this.starfield.rotation.y = t * 0.005; this.starfield.rotation.x = Math.sin(t * 0.003) * 0.02 }
    if (!this.readerActive) {
      this.nodes.forEach((group, i) => {
        if (i > 0) group.position.y += Math.sin(t * 0.8 + i * 0.7) * 0.04
        if (group.userData.rings) group.userData.rings.forEach(r => { r.mesh.rotation.x += r.speedX; r.mesh.rotation.y += r.speedY })
        const glow = group.userData.glowSprite
        if (glow) glow.material.opacity = 0.28 + Math.sin(t * 1.2 + (group.userData.pulsePhase || 0)) * 0.08
      })
    }
    this.renderer.render(this.scene, this.camera)
  }
}

// ── Panel controller ───────────────────────────────────────────────────────
function escapeHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML }

function findRelatedItems(item, allData) {
  if (!item.stack || !item.stack.length) return []
  const myTags = new Set(item.stack.map(t => t.toLowerCase()))
  const myId = item.id || ''
  return allData.filter(d => d.id !== myId).map(d => {
    const overlap = [...myTags].filter(t => new Set((d.stack || []).map(s => s.toLowerCase())).has(t)).length
    return { ...d, overlap }
  }).filter(d => d.overlap > 0).sort((a, b) => b.overlap - a.overlap).slice(0, 5)
}

document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('[data-project-flow]')
  const jsonEl = document.getElementById('projects-data')
  if (!container || !jsonEl) return

  const projectData = JSON.parse(jsonEl.textContent)
  window.projectMap = new ProjectMap3D(container, projectData)

  window.showPanel = (item, allData) => {
    const pnl = document.querySelector('[data-project-panel]')
    if (!pnl) return

    pnl.querySelector('[data-panel-name]').textContent = item.name || item.title
    pnl.querySelector('[data-panel-role]').textContent = item.kind.toUpperCase()
    pnl.querySelector('[data-panel-role]').style.color = KIND_HEX[item.kind] || KIND_HEX.post

    pnl.querySelector('[data-panel-headline]').textContent = item.headline || item.summary || ''
    const summaryEl = pnl.querySelector('[data-panel-summary]')
    summaryEl.textContent = (item.headline && item.summary !== item.headline) ? item.summary : ''

    const stk = pnl.querySelector('[data-panel-stack]')
    if (stk) stk.innerHTML = (item.stack || []).map(s => `<span class="stack-chip">${escapeHtml(s)}</span>`).join('')

    let sectionsEl = pnl.querySelector('[data-panel-sections]')
    if (!sectionsEl) {
      sectionsEl = document.createElement('div')
      sectionsEl.setAttribute('data-panel-sections', '')
      sectionsEl.setAttribute('data-reveal', '')
      sectionsEl.className = 'panel-sections'
      const act = pnl.querySelector('.panel-actions')
      if (act) pnl.insertBefore(sectionsEl, act); else pnl.appendChild(sectionsEl)
    }
    const sections = item.sections || []
    sectionsEl.innerHTML = sections.length > 0
      ? sections.map(sec => `<details class="panel-section" open><summary class="panel-section-title">${escapeHtml(sec.title)}</summary><div class="panel-section-content">${escapeHtml(sec.content).replace(/\n/g, '<br>')}</div></details>`).join('')
      : ''

    let relatedEl = pnl.querySelector('[data-panel-related]')
    if (!relatedEl) {
      relatedEl = document.createElement('div')
      relatedEl.setAttribute('data-panel-related', '')
      relatedEl.setAttribute('data-reveal', '')
      relatedEl.className = 'panel-related'
      const act = pnl.querySelector('.panel-actions')
      if (act) pnl.insertBefore(relatedEl, act); else pnl.appendChild(relatedEl)
    }
    const related = findRelatedItems(item, allData || [])
    relatedEl.innerHTML = related.length > 0
      ? `<h3 class="panel-related-title">Relacionados</h3><ul class="panel-related-list">${related.map(r => `<li class="panel-related-item"><a href="${escapeHtml(r.url || '#')}" class="panel-related-link"><span class="panel-related-kind" style="color:${KIND_HEX[r.kind] || KIND_HEX.post}">${escapeHtml(r.kind)}</span><span class="panel-related-name">${escapeHtml(r.name || r.title)}</span></a></li>`).join('')}</ul>`
      : ''

    // "Ver projeto" enters reader mode
    const btn = pnl.querySelector('[data-panel-link]')
    if (btn) {
      btn.href = '#'
      btn.onclick = (ev) => { ev.preventDefault(); window.projectMap.enterReader(item) }
    }

    pnl.dataset.open = 'true'
    pnl.setAttribute('aria-hidden', 'false')
    requestAnimationFrame(() => {
      pnl.querySelectorAll('[data-reveal]').forEach((el, i) => {
        el.classList.remove('reveal-in')
        setTimeout(() => el.classList.add('reveal-in'), 60 * i)
      })
    })
  }

  window.hidePanel = () => {
    const pnl = document.querySelector('[data-project-panel]')
    if (!pnl) return
    pnl.dataset.open = 'false'
    pnl.setAttribute('aria-hidden', 'true')
    pnl.querySelectorAll('[data-reveal]').forEach(el => el.classList.remove('reveal-in'))
  }

  document.querySelector('[data-panel-close]')?.addEventListener('click', () => window.projectMap?.deselectNode())
})
