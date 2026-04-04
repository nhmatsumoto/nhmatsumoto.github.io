import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

/**
 * Technical Knowledge OS — 3D Project Flow (V3 — Focus & Interactive Panel)
 * Powered by Three.js + WebGL.
 */

const KIND_COLOR = {
  post:     0x00C2FF,
  project:  0x7C5CFF,
  document: 0x10B981,
  central:  0xFF3E00,
}

const KIND_HEX = {
  post:     '#00C2FF',
  project:  '#7C5CFF',
  document: '#10B981',
  central:  '#FF3E00',
}

const MODE = { EXPLORE: 'explore', READ: 'read' }

// Simple lerp for smooth camera transitions
function lerpVec3(from, to, t) {
  return new THREE.Vector3(
    from.x + (to.x - from.x) * t,
    from.y + (to.y - from.y) * t,
    from.z + (to.z - from.z) * t
  )
}

class ProjectMap3D {
  constructor(container, data) {
    this.container = container
    this.data = data
    this.nodes = []
    this.connections = []
    this.mode = MODE.EXPLORE
    this.selected = null
    this.cameraTarget = null
    this.cameraGoal = null
    this.transitioning = false

    this.initScene()
    this.createNodes()
    this.createConnections()
    this.addEventHandlers()
    this.animate()
  }

  initScene() {
    this.scene = new THREE.Scene()

    const w = this.container.clientWidth
    const h = this.container.clientHeight

    this.camera = new THREE.PerspectiveCamera(60, w / h, 5, 5000)
    this.camera.position.set(0, 300, 900)

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(w, h)
    this.container.appendChild(this.renderer.domElement)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.autoRotate = true
    this.controls.autoRotateSpeed = 0.5
    this.controls.enablePan = false
    this.controls.minDistance = 300
    this.controls.maxDistance = 2000
    this.controls.zoomSpeed = 0.4

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.7))
    const p1 = new THREE.PointLight(0x00C2FF, 2.5, 1200)
    p1.position.set(300, 300, 300)
    this.scene.add(p1)

    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()
  }

  // ── Smooth camera focus on a node ──────────────────────────────────────
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
    const speed = 0.045

    this.camera.position.lerp(this.cameraGoal, speed)
    this.controls.target.lerp(this.cameraTarget, speed)

    if (this.camera.position.distanceTo(this.cameraGoal) < 1) {
      this.transitioning = false
    }
  }

  // ── Node visibility: dim non-selected ──────────────────────────────────
  highlightNode(selectedGroup) {
    this.nodes.forEach(n => {
      const isSelected = n === selectedGroup
      n.traverse(child => {
        if (child.material) {
          if (child.material.opacity !== undefined) {
            child.material._savedOpacity = child.material._savedOpacity ?? child.material.opacity
            child.material.opacity = isSelected ? child.material._savedOpacity : child.material._savedOpacity * 0.2
          }
        }
      })
    })
    this.connections.forEach(c => {
      c.material._savedOpacity = c.material._savedOpacity ?? c.material.opacity
      c.material.opacity = c.material._savedOpacity * 0.1
    })
  }

  restoreNodeVisibility() {
    this.nodes.forEach(n => {
      n.traverse(child => {
        if (child.material && child.material._savedOpacity !== undefined) {
          child.material.opacity = child.material._savedOpacity
        }
      })
    })
    this.connections.forEach(c => {
      if (c.material._savedOpacity !== undefined) {
        c.material.opacity = c.material._savedOpacity
      }
    })
  }

  // ── Nodes ──────────────────────────────────────────────────────────────
  createNodes() {
    this.addNode({ kind: 'central', name: 'Hiro', headline: 'Central Intelligence System' }, new THREE.Vector3(0, 0, 0), true)

    const items = this.data
    const count = items.length
    const sphereRadius = 400
    const GoldenAngle = Math.PI * (3 - Math.sqrt(5))

    for (let i = 0; i < count; i++) {
      const y = 1 - (i / (count - 1)) * 2
      const rAcross = Math.sqrt(1 - y * y)
      const theta = GoldenAngle * i

      const pos = new THREE.Vector3(
        Math.cos(theta) * rAcross * sphereRadius,
        y * sphereRadius,
        Math.sin(theta) * rAcross * sphereRadius
      )
      this.addNode(items[i], pos)
    }
  }

  addNode(item, position, isCentral = false) {
    const colorCode = KIND_COLOR[item.kind] || 0x64748b
    const nodeGroup = new THREE.Group()
    nodeGroup.position.copy(position)
    nodeGroup.userData = { item, isCentral, rings: [] }

    const sphereGeo = new THREE.SphereGeometry(isCentral ? 14 : 9, 32, 32)
    const sphereMat = new THREE.MeshPhysicalMaterial({
      color: colorCode,
      emissive: colorCode,
      emissiveIntensity: 1.2,
      metalness: 0,
      roughness: 0,
      transmission: 0.9,
      thickness: 1,
      transparent: true,
      opacity: 0.95
    })
    nodeGroup.add(new THREE.Mesh(sphereGeo, sphereMat))

    const ringCount = isCentral ? 3 : 2
    for (let r = 0; r < ringCount; r++) {
      const radius = (isCentral ? 22 : 15) + r * 6
      const ringGeo = new THREE.RingGeometry(radius, radius + 0.8, 64)
      const ringMat = new THREE.MeshBasicMaterial({
        color: colorCode,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.4 - r * 0.1,
        blending: THREE.AdditiveBlending
      })
      const ring = new THREE.Mesh(ringGeo, ringMat)
      ring.rotation.x = Math.random() * Math.PI
      ring.rotation.y = Math.random() * Math.PI
      nodeGroup.add(ring)
      nodeGroup.userData.rings.push({
        mesh: ring,
        speedX: (Math.random() - 0.5) * 0.02,
        speedY: (Math.random() - 0.5) * 0.02
      })
    }

    if (!isCentral) {
      const labelCanvas = document.createElement('canvas')
      const lctx = labelCanvas.getContext('2d')
      labelCanvas.width = 512; labelCanvas.height = 128
      lctx.font = 'bold 32px "JetBrains Mono"'
      lctx.fillStyle = '#ffffff'
      lctx.textAlign = 'center'
      lctx.shadowBlur = 10
      lctx.shadowColor = 'rgba(0,194,255,0.5)'
      lctx.fillText((item.name || item.title).toUpperCase(), 256, 64)

      const labelTex = new THREE.CanvasTexture(labelCanvas)
      const labelMat = new THREE.SpriteMaterial({ map: labelTex, transparent: true, opacity: 0.7 })
      const sprite = new THREE.Sprite(labelMat)
      sprite.position.y = 28
      sprite.scale.set(160, 40, 1)
      nodeGroup.add(sprite)
    }

    this.scene.add(nodeGroup)
    this.nodes.push(nodeGroup)
  }

  // ── Connections ────────────────────────────────────────────────────────
  createConnections() {
    const centralPos = this.nodes[0].position

    this.nodes.slice(1).forEach(node => {
      const targetPos = node.position
      const colorCode = KIND_COLOR[node.userData.item.kind] || 0x00C2FF

      const lineGeo = new THREE.BufferGeometry().setFromPoints([centralPos, targetPos])
      const lineMat = new THREE.LineBasicMaterial({
        color: colorCode,
        transparent: true,
        opacity: 0.15,
        blending: THREE.AdditiveBlending
      })
      const line = new THREE.Line(lineGeo, lineMat)
      this.scene.add(line)
      this.connections.push(line)

      const glowMat = new THREE.LineBasicMaterial({
        color: colorCode,
        transparent: true,
        opacity: 0.05,
        linewidth: 2,
        blending: THREE.AdditiveBlending
      })
      this.scene.add(new THREE.Line(lineGeo, glowMat))
      this.connections.push(new THREE.Line(lineGeo, glowMat))
    })
  }

  // ── Events ─────────────────────────────────────────────────────────────
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
    const r = this.renderer.domElement.getBoundingClientRect()
    this.mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1
    this.mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1

    this.raycaster.setFromCamera(this.mouse, this.camera)
    const hits = this.raycaster.intersectObjects(this.nodes, true)

    this.nodes.forEach(n => n.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1))

    if (hits.length > 0) {
      let tg = hits[0].object
      while (tg.parent && !tg.userData.item) tg = tg.parent
      if (tg.userData.item) {
        tg.scale.lerp(new THREE.Vector3(1.3, 1.3, 1.3), 0.2)
        document.body.style.cursor = 'pointer'
      }
    } else {
      document.body.style.cursor = 'default'
    }
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

  // ── Animate ────────────────────────────────────────────────────────────
  animate() {
    requestAnimationFrame(() => this.animate())
    this.updateCameraTransition()
    this.controls.update()

    const elapsed = performance.now() * 0.001

    this.nodes.forEach((group, i) => {
      if (i > 0) group.position.y += Math.sin(elapsed + i) * 0.05
      if (group.userData.rings) {
        group.userData.rings.forEach(r => {
          r.mesh.rotation.x += r.speedX
          r.mesh.rotation.y += r.speedY
        })
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

    // Header
    pnl.querySelector('[data-panel-name]').textContent = item.name || item.title
    pnl.querySelector('[data-panel-role]').textContent = item.kind.toUpperCase()
    pnl.querySelector('[data-panel-role]').style.color = KIND_HEX[item.kind] || KIND_HEX.post

    // Summary content
    const headlineEl = pnl.querySelector('[data-panel-headline]')
    const summaryEl = pnl.querySelector('[data-panel-summary]')
    headlineEl.textContent = item.headline || item.summary || ''
    summaryEl.textContent = (item.headline && item.summary !== item.headline) ? item.summary : ''

    // Stack chips
    const stk = pnl.querySelector('[data-panel-stack]')
    if (stk) {
      stk.innerHTML = (item.stack || [])
        .map(s => `<span class="stack-chip">${escapeHtml(s)}</span>`)
        .join('')
    }

    // Sections content
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

    // Related items
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

    // Main action link
    const btn = pnl.querySelector('[data-panel-link]')
    if (btn && item.url) {
      btn.href = item.url
      btn.onclick = null
    }

    // Open panel
    pnl.dataset.open = 'true'
    pnl.setAttribute('aria-hidden', 'false')

    // Trigger reveal animations
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

  // Close panel button
  const closeBtn = document.querySelector('[data-panel-close]')
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (window.projectMap) window.projectMap.deselectNode()
    })
  }
})
