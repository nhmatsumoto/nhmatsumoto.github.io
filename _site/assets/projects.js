import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

/**
 * Technical Knowledge OS — 3D Project Flow (V4 — Nebula & Starfield)
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

// ── Glow sprite texture (procedural) ─────────────────────────────────────
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

    this.initScene()
    this.createStarfield()
    this.createNebula()
    this.createNodes()
    this.createConnections()
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

    // Lighting — warm + cool contrast
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

    const palette = [
      new THREE.Color(0xffffff),
      new THREE.Color(0xaaddff),
      new THREE.Color(0xffeedd),
      new THREE.Color(0xddccff),
    ]

    for (let i = 0; i < COUNT; i++) {
      const r = 1500 + Math.random() * 3000
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)
      sizes[i] = 1.5 + Math.random() * 3
      const c = palette[Math.floor(Math.random() * palette.length)]
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const mat = new THREE.PointsMaterial({
      size: 3,
      map: this.glowTex,
      transparent: true,
      opacity: 0.9,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    })

    this.starfield = new THREE.Points(geo, mat)
    this.scene.add(this.starfield)
  }

  // ── Nebula clouds ──────────────────────────────────────────────────────
  createNebula() {
    const nebulaColors = [0x0a1628, 0x120a30, 0x081420]
    nebulaColors.forEach((color, i) => {
      const geo = new THREE.SphereGeometry(800 + i * 300, 16, 16)
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.08 - i * 0.02,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.rotation.set(Math.random() * 3, Math.random() * 3, 0)
      this.scene.add(mesh)
    })
  }

  // ── Smooth camera ─────────────────────────────────────────────────────
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

  // ── Node highlight ────────────────────────────────────────────────────
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
    const sphereRadius = 400
    const GA = Math.PI * (3 - Math.sqrt(5))

    for (let i = 0; i < count; i++) {
      const y = 1 - (i / (count - 1)) * 2
      const r = Math.sqrt(1 - y * y)
      const theta = GA * i
      this.addNode(items[i], new THREE.Vector3(
        Math.cos(theta) * r * sphereRadius,
        y * sphereRadius,
        Math.sin(theta) * r * sphereRadius
      ))
    }
  }

  addNode(item, position, isCentral = false) {
    const color = new THREE.Color(KIND_COLOR[item.kind] || 0x64748b)
    const colorCode = KIND_COLOR[item.kind] || 0x64748b
    const group = new THREE.Group()
    group.position.copy(position)
    group.userData = { item, isCentral, rings: [], pulsePhase: Math.random() * Math.PI * 2 }

    // Core sphere — glass-like with inner glow
    const coreSize = isCentral ? 16 : 10
    const coreGeo = new THREE.SphereGeometry(coreSize, 48, 48)
    const coreMat = new THREE.MeshPhysicalMaterial({
      color: colorCode,
      emissive: colorCode,
      emissiveIntensity: isCentral ? 2 : 1.5,
      metalness: 0.1,
      roughness: 0.05,
      transmission: 0.85,
      thickness: 2,
      transparent: true,
      opacity: 0.95,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      ior: 1.5,
    })
    group.add(new THREE.Mesh(coreGeo, coreMat))

    // Outer glow sprite
    const glowScale = isCentral ? 80 : 50
    const glowMat = new THREE.SpriteMaterial({
      map: this.glowTex,
      color: colorCode,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const glow = new THREE.Sprite(glowMat)
    glow.scale.set(glowScale, glowScale, 1)
    group.add(glow)
    group.userData.glowSprite = glow

    // Orbital rings — thinner, more elegant
    const ringCount = isCentral ? 3 : 1
    for (let r = 0; r < ringCount; r++) {
      const radius = coreSize * 1.8 + r * 7
      const ringGeo = new THREE.TorusGeometry(radius, 0.3, 8, 100)
      const ringMat = new THREE.MeshBasicMaterial({
        color: colorCode,
        transparent: true,
        opacity: 0.5 - r * 0.12,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
      const ring = new THREE.Mesh(ringGeo, ringMat)
      ring.rotation.x = Math.random() * Math.PI
      ring.rotation.y = Math.random() * Math.PI
      group.add(ring)
      group.userData.rings.push({
        mesh: ring,
        speedX: (Math.random() - 0.5) * 0.008,
        speedY: (Math.random() - 0.5) * 0.012,
      })
    }

    // Label sprite
    const label = (item.name || item.title || '').toUpperCase()
    if (label && !isCentral) {
      const lc = document.createElement('canvas')
      const lctx = lc.getContext('2d')
      lc.width = 512; lc.height = 96
      lctx.font = '600 26px "JetBrains Mono", monospace'
      lctx.textAlign = 'center'
      lctx.textBaseline = 'middle'
      lctx.fillStyle = '#ffffff'
      lctx.shadowBlur = 12
      lctx.shadowColor = `#${color.getHexString()}`
      lctx.fillText(label.length > 28 ? label.slice(0, 26) + '..' : label, 256, 48)
      const tex = new THREE.CanvasTexture(lc)
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.85, depthWrite: false })
      const sprite = new THREE.Sprite(mat)
      sprite.position.y = coreSize + 18
      sprite.scale.set(140, 26, 1)
      group.add(sprite)
    }

    // Hiro label (special)
    if (isCentral) {
      const lc = document.createElement('canvas')
      const lctx = lc.getContext('2d')
      lc.width = 256; lc.height = 96
      lctx.font = 'bold 40px "JetBrains Mono", monospace'
      lctx.textAlign = 'center'
      lctx.textBaseline = 'middle'
      lctx.fillStyle = '#ffffff'
      lctx.shadowBlur = 20
      lctx.shadowColor = '#ffffff'
      lctx.fillText('HIRO', 128, 48)
      const tex = new THREE.CanvasTexture(lc)
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.95, depthWrite: false })
      const sprite = new THREE.Sprite(mat)
      sprite.position.y = coreSize + 26
      sprite.scale.set(80, 30, 1)
      group.add(sprite)
    }

    this.scene.add(group)
    this.nodes.push(group)
  }

  // ── Connections — curved lines ─────────────────────────────────────────
  createConnections() {
    const center = this.nodes[0].position

    this.nodes.slice(1).forEach(node => {
      const target = node.position
      const colorCode = KIND_COLOR[node.userData.item.kind] || 0x00C2FF

      // Curved connection via quadratic bezier
      const mid = center.clone().add(target).multiplyScalar(0.5)
      mid.y += 30 + Math.random() * 40
      const curve = new THREE.QuadraticBezierCurve3(center, mid, target)
      const points = curve.getPoints(32)

      const geo = new THREE.BufferGeometry().setFromPoints(points)
      const mat = new THREE.LineBasicMaterial({
        color: colorCode,
        transparent: true,
        opacity: 0.12,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
      const line = new THREE.Line(geo, mat)
      this.scene.add(line)
      this.connections.push(line)
    })
  }

  // ── Events ────────────────────────────────────────────────────────────
  addEventHandlers() {
    window.addEventListener('resize', () => this.onResize())
    this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e))
    this.renderer.domElement.addEventListener('click', (e) => this.onClick(e))
  }

  onResize() {
    const w = this.container.clientWidth
    const h = this.container.clientHeight
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
  }

  onMouseMove(e) {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

    this.raycaster.setFromCamera(this.mouse, this.camera)
    const hits = this.raycaster.intersectObjects(this.nodes, true)

    this.nodes.forEach(n => n.scale.lerp(new THREE.Vector3(1, 1, 1), 0.08))

    if (hits.length > 0) {
      let tg = hits[0].object
      while (tg.parent && !tg.userData.item) tg = tg.parent
      if (tg.userData.item) {
        tg.scale.lerp(new THREE.Vector3(1.25, 1.25, 1.25), 0.15)
        document.body.style.cursor = 'pointer'
        return
      }
    }
    document.body.style.cursor = 'default'
  }

  onClick(e) {
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

    // Slow starfield rotation
    if (this.starfield) {
      this.starfield.rotation.y = t * 0.005
      this.starfield.rotation.x = Math.sin(t * 0.003) * 0.02
    }

    this.nodes.forEach((group, i) => {
      // Gentle floating
      if (i > 0) group.position.y += Math.sin(t * 0.8 + i * 0.7) * 0.04

      // Ring orbits
      if (group.userData.rings) {
        group.userData.rings.forEach(r => {
          r.mesh.rotation.x += r.speedX
          r.mesh.rotation.y += r.speedY
        })
      }

      // Glow pulse
      const glow = group.userData.glowSprite
      if (glow) {
        const phase = group.userData.pulsePhase || 0
        const pulse = 0.28 + Math.sin(t * 1.2 + phase) * 0.08
        glow.material.opacity = pulse
      }
    })

    this.renderer.render(this.scene, this.camera)
  }
}

// ── Panel controller ───────────────────────────────────────────────────────
function escapeHtml(s) {
  const div = document.createElement('div')
  div.textContent = s
  return div.innerHTML
}

function findRelatedItems(item, allData) {
  if (!item.stack || !item.stack.length) return []
  const myTags = new Set(item.stack.map(t => t.toLowerCase()))
  const myId = item.id || ''
  return allData
    .filter(d => d.id !== myId)
    .map(d => {
      const dTags = new Set((d.stack || []).map(t => t.toLowerCase()))
      const overlap = [...myTags].filter(t => dTags.has(t)).length
      return { ...d, overlap }
    })
    .filter(d => d.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, 5)
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

    const headlineEl = pnl.querySelector('[data-panel-headline]')
    const summaryEl = pnl.querySelector('[data-panel-summary]')
    headlineEl.textContent = item.headline || item.summary || ''
    summaryEl.textContent = (item.headline && item.summary !== item.headline) ? item.summary : ''

    const stk = pnl.querySelector('[data-panel-stack]')
    if (stk) {
      stk.innerHTML = (item.stack || [])
        .map(s => `<span class="stack-chip">${escapeHtml(s)}</span>`)
        .join('')
    }

    let sectionsEl = pnl.querySelector('[data-panel-sections]')
    if (!sectionsEl) {
      sectionsEl = document.createElement('div')
      sectionsEl.setAttribute('data-panel-sections', '')
      sectionsEl.setAttribute('data-reveal', '')
      sectionsEl.className = 'panel-sections'
      const actionsEl = pnl.querySelector('.panel-actions')
      if (actionsEl) pnl.insertBefore(sectionsEl, actionsEl)
      else pnl.appendChild(sectionsEl)
    }

    const sections = item.sections || []
    if (sections.length > 0) {
      sectionsEl.innerHTML = sections.map(sec => `
        <details class="panel-section" open>
          <summary class="panel-section-title">${escapeHtml(sec.title)}</summary>
          <div class="panel-section-content">${escapeHtml(sec.content).replace(/\n/g, '<br>')}</div>
        </details>
      `).join('')
    } else {
      sectionsEl.innerHTML = ''
    }

    let relatedEl = pnl.querySelector('[data-panel-related]')
    if (!relatedEl) {
      relatedEl = document.createElement('div')
      relatedEl.setAttribute('data-panel-related', '')
      relatedEl.setAttribute('data-reveal', '')
      relatedEl.className = 'panel-related'
      const actionsEl = pnl.querySelector('.panel-actions')
      if (actionsEl) pnl.insertBefore(relatedEl, actionsEl)
      else pnl.appendChild(relatedEl)
    }

    const related = findRelatedItems(item, allData || [])
    if (related.length > 0) {
      relatedEl.innerHTML = `
        <h3 class="panel-related-title">Relacionados</h3>
        <ul class="panel-related-list">
          ${related.map(r => `
            <li class="panel-related-item">
              <a href="${escapeHtml(r.url || '#')}" class="panel-related-link">
                <span class="panel-related-kind" style="color:${KIND_HEX[r.kind] || KIND_HEX.post}">${escapeHtml(r.kind)}</span>
                <span class="panel-related-name">${escapeHtml(r.name || r.title)}</span>
              </a>
            </li>
          `).join('')}
        </ul>
      `
    } else {
      relatedEl.innerHTML = ''
    }

    const btn = pnl.querySelector('[data-panel-link]')
    if (btn && item.url) {
      btn.href = item.url
      btn.onclick = null
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

  const closeBtn = document.querySelector('[data-panel-close]')
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (window.projectMap) window.projectMap.deselectNode()
    })
  }
})
