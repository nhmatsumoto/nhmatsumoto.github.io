import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

/**
 * Technical Knowledge OS — 3D Project Flow (V2.5 — Full Depth & Neon Orbits)
 * Powered by Three.js + WebGL.
 */

const KIND_COLOR = {
  post:     0x00C2FF, // Vibrant Blue
  project:  0x7C5CFF, // Deep Purple
  document: 0x10B981, // Emerald Green
  central:  0xFF3E00, // Hiro Red/Orange
}

const MODE = { EXPLORE: 'explore', READ: 'read' }

class ProjectMap3D {
  constructor(container, data) {
    this.container = container
    this.data = data
    this.nodes = []
    this.connections = []
    this.mode = MODE.EXPLORE
    this.selected = null
    
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
    this.controls.minDistance = 100
    this.controls.maxDistance = 2500
    this.controls.zoomSpeed = 1.2

    // Lights
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.7))
    const p1 = new THREE.PointLight(0x00C2FF, 2.5, 1200)
    p1.position.set(300, 300, 300)
    this.scene.add(p1)

    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()
    
    this.createBackBtn()
  }

  createBackBtn() {
    this.backBtn = document.createElement('button')
    this.backBtn.className = 'nav-button'
    this.backBtn.style.cssText = 'position:absolute;top:24px;right:24px;z-index:100;display:none;align-items:center;gap:8px;background:rgba(10,15,25,0.8);border:1px solid var(--accent);color:var(--accent);padding:12px 24px;border-radius:6px;font-size:11px;font-weight:700;text-transform:uppercase;cursor:pointer;transition:all 0.2s;backdrop-filter:blur(10px);box-shadow:0 12px 40px rgba(0,0,0,0.5);letter-spacing:0.1em;'
    this.backBtn.innerHTML = '<i data-lucide="arrow-left" style="width:14px;height:14px"></i> Back to Map'
    this.container.appendChild(this.backBtn)
    this.backBtn.onclick = () => this.transitionToExplorer()
    if (window.lucide) window.lucide.createIcons()
  }

  transitionToReader(project) {
    this.mode = MODE.READ
    this.backBtn.style.display = 'flex'
    this.controls.autoRotate = false
    
    // Hide explore nodes with fade if possible
    this.nodes.forEach(n => { n.visible = false })
    this.connections.forEach(c => { c.visible = false })
    
    this.treeGroup = new THREE.Group()
    this.scene.add(this.treeGroup)
    
    const sections = project.sections || []
    const nodeMap = {}
    
    sections.forEach(s => {
      const card = this.createSectionCard(s)
      nodeMap[s.id] = card
      this.treeGroup.add(card)
    })

    const NODE_GAP_X = 450, NODE_GAP_Y = -350
    const layoutNode = (id, x, y, z) => {
      const node = nodeMap[id]
      if (!node) return
      node.position.set(x, y, z)
      
      const children = node.userData.section.children || []
      children.forEach((cid, i) => {
        const startX = x - ((children.length - 1) * NODE_GAP_X) / 2
        layoutNode(cid, startX + i * NODE_GAP_X, y + NODE_GAP_Y, z)
        this.createTreeLink(node.position, nodeMap[cid].position)
      })
    }

    if (sections.length > 0) layoutNode(sections[0].id, 0, 400, 0)
    
    this.camera.position.set(0, 0, 1100)
    this.controls.target.set(0, 0, 0)
    this.controls.enablePan = true
    this.controls.update()
  }

  createSectionCard(section) {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    canvas.width = 512; canvas.height = 300
    
    ctx.fillStyle = 'rgba(10, 15, 25, 0.98)'
    ctx.fillRect(0, 0, 512, 300)
    ctx.strokeStyle = KIND_COLOR[this.selected.userData.item.kind] || '#00C2FF'
    ctx.lineWidth = 8
    ctx.strokeRect(0, 0, 512, 300)
    
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 36px "Inter"'
    ctx.fillText(section.title, 40, 70)
    
    ctx.font = '22px "Inter"'
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    const wordList = section.content.split(' ')
    let currentLine = '', y = 130
    for (const w of wordList) {
        if (ctx.measureText(currentLine + w).width > 420) { ctx.fillText(currentLine, 40, y); currentLine = w + ' '; y += 34 }
        else currentLine += w + ' '
    }
    ctx.fillText(currentLine, 40, y)

    const tex = new THREE.CanvasTexture(canvas)
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide })
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(360, 210), mat)
    plane.userData = { section }
    return plane
  }

  createTreeLink(p1, p2) {
    const geo = new THREE.BufferGeometry().setFromPoints([p1, p2])
    const mat = new THREE.LineBasicMaterial({ color: 0x00C2FF, transparent: true, opacity: 0.3 })
    const line = new THREE.Line(geo, mat)
    this.treeGroup.add(line)
  }

  transitionToExplorer() {
    this.mode = MODE.EXPLORE
    this.backBtn.style.display = 'none'
    this.controls.autoRotate = true
    this.controls.enablePan = false
    if (this.treeGroup) { this.scene.remove(this.treeGroup); this.treeGroup = null }
    this.nodes.forEach(n => n.visible = true)
    this.connections.forEach(c => c.visible = true)
    this.camera.position.set(0, 200, 800)
    this.controls.target.set(0, 0, 0)
    this.deselectNode()
  }

  createNodes() {
    // Hiro — The Core
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

    // Core Luminous Sphere
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
    const core = new THREE.Mesh(sphereGeo, sphereMat)
    nodeGroup.add(core)

    // Neon Orbits (Rings)
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
      
      // Random initial rotation
      ring.rotation.x = Math.random() * Math.PI
      ring.rotation.y = Math.random() * Math.PI
      
      nodeGroup.add(ring)
      nodeGroup.userData.rings.push({
        mesh: ring,
        speedX: (Math.random() - 0.5) * 0.02,
        speedY: (Math.random() - 0.5) * 0.02
      })
    }

    // Interactive Sprite Label
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
       sprite.position.y = isCentral ? 35 : 28
       sprite.scale.set(160, 40, 1)
       nodeGroup.add(sprite)
    }

    this.scene.add(nodeGroup)
    this.nodes.push(nodeGroup)
  }

  createConnections() {
    const centralPos = this.nodes[0].position
    
    this.nodes.slice(1).forEach(node => {
      const targetPos = node.position
      const colorCode = KIND_COLOR[node.userData.item.kind] || 0x00C2FF
      
      // Main Connection Line
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
      
      // Secondary Luminous Path (Faint Glow)
      const glowMat = new THREE.LineBasicMaterial({ 
        color: colorCode, 
        transparent: true, 
        opacity: 0.05,
        linewidth: 2,
        blending: THREE.AdditiveBlending
      })
      const glowLine = new THREE.Line(lineGeo, glowMat)
      this.scene.add(glowLine)
      this.connections.push(glowLine)
    })
  }

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
    
    this.nodes.forEach(n => {
      n.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1)
    })

    if (hits.length > 0) {
      let targetGroup = hits[0].object
      while (targetGroup.parent && !targetGroup.userData.item) targetGroup = targetGroup.parent
      
      if (targetGroup.userData.item) {
        targetGroup.scale.lerp(new THREE.Vector3(1.3, 1.3, 1.3), 0.2)
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
      let targetGroup = hits[0].object
      while (targetGroup.parent && !targetGroup.userData.item) targetGroup = targetGroup.parent
      if (targetGroup.userData.item) this.handleNodeClick(targetGroup)
    } else {
      this.deselectNode()
    }
  }

  handleNodeClick(node) {
    if (this.selected === node) { this.deselectNode(); return }
    this.selected = node
    this.controls.autoRotate = false
    window.showPanel(node.userData.item)
  }

  deselectNode() {
    this.selected = null
    this.controls.autoRotate = true
    window.hidePanel()
  }

  animate() {
    requestAnimationFrame(() => this.animate())
    this.controls.update()
    
    const elapsed = performance.now() * 0.001
    
    this.nodes.forEach((group, i) => {
      // Floating animation
      if (i > 0) group.position.y += Math.sin(elapsed + i) * 0.05
      
      // Orbiting rings animation
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

document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('[data-project-flow]')
  const jsonEl = document.getElementById('projects-data')
  if (!container || !jsonEl) return

  const projectData = JSON.parse(jsonEl.textContent)
  window.projectMap = new ProjectMap3D(container, projectData)
  
  window.showPanel = (p) => {
    const pnl = document.querySelector('[data-project-panel]')
    if (!pnl) return
    pnl.querySelector('[data-panel-name]').textContent = p.name || p.title
    pnl.querySelector('[data-panel-role]').textContent = p.kind.toUpperCase()
    pnl.querySelector('[data-panel-headline]').textContent = p.headline || p.summary
    pnl.querySelector('[data-panel-summary]').textContent = p.summary
    
    const stk = pnl.querySelector('[data-panel-stack]')
    if (stk) stk.innerHTML = (p.stack || []).map(s => `<span class="stack-chip">${s}</span>`).join('')
    
    const btn = pnl.querySelector('[data-panel-link]')
    if (btn) {
      btn.href = '#'
      btn.onclick = (ev) => { ev.preventDefault(); window.projectMap.transitionToReader(p) }
    }
    pnl.dataset.open = 'true'
  }

  window.hidePanel = () => {
    const pnl = document.querySelector('[data-project-panel]')
    if (pnl) pnl.dataset.open = 'false'
  }
})
