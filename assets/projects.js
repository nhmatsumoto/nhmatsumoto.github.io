import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

/**
 * Technical Knowledge OS — 3D Project Flow
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
    const h = window.innerHeight - 80 // Maximize height
    
    this.camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 2000)
    this.camera.position.z = 700

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(w, h)
    this.container.appendChild(this.renderer.domElement)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05
    this.controls.autoRotate = true
    this.controls.autoRotateSpeed = 0.4
    this.controls.enablePan = false

    // Lights
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.5))
    const p1 = new THREE.PointLight(0x00C2FF, 2, 1000)
    p1.position.set(200, 200, 200)
    this.scene.add(p1)

    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()
    
    // UI Helpers
    this.createBackBtn()
  }

  createBackBtn() {
    this.backBtn = document.createElement('button')
    this.backBtn.className = 'nav-button'
    this.backBtn.style.cssText = 'position:absolute;top:20px;right:20px;z-index:100;display:none;align-items:center;gap:8px;background:rgba(10,15,25,0.8);border:1px solid var(--accent);color:var(--accent);padding:10px 20px;border-radius:6px;font-size:12px;font-weight:700;text-transform:uppercase;cursor:pointer;transition:all 0.2s;backdrop-filter:blur(8px);box-shadow:0 8px 32px rgba(0,0,0,0.4);'
    this.backBtn.innerHTML = '<i data-lucide="arrow-left" style="width:14px;height:14px"></i> Back to Map'
    this.container.appendChild(this.backBtn)
    this.backBtn.onclick = () => this.transitionToExplorer()
    if (window.lucide) window.lucide.createIcons()
  }

  transitionToReader(project) {
    this.mode = MODE.READ
    this.backBtn.style.display = 'flex'
    this.controls.autoRotate = false
    
    // Fade out explore nodes
    this.nodes.forEach(n => { n.visible = false })
    
    this.treeGroup = new THREE.Group()
    this.scene.add(this.treeGroup)
    
    const sections = project.sections || []
    const nodeMap = {}
    
    sections.forEach(s => {
      const card = this.createSectionCard(s)
      nodeMap[s.id] = card
      this.treeGroup.add(card)
    })

    const NODE_GAP_X = 400, NODE_GAP_Y = -350
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
    
    // Focus Camera on Tree
    this.camera.position.set(0, 0, 1000)
    this.controls.target.set(0, 0, 0)
    this.controls.enablePan = true
    this.controls.update()
  }

  createSectionCard(section) {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    canvas.width = 512; canvas.height = 300
    
    // Glass Terminal Card
    ctx.fillStyle = 'rgba(10, 15, 25, 0.95)'
    ctx.fillRect(0, 0, 512, 300)
    ctx.strokeStyle = KIND_COLOR[this.selected.userData.item.kind] || '#00C2FF'
    ctx.lineWidth = 6
    ctx.strokeRect(0, 0, 512, 300)
    
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 32px "Inter"'
    ctx.fillText(section.title, 40, 60)
    
    ctx.font = '22px "Inter"'
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    const words = section.content.split(' ')
    let line = '', y = 110
    for (const w of words) {
        if (ctx.measureText(line + w).width > 420) { ctx.fillText(line, 40, y); line = w + ' '; y += 32 }
        else line += w + ' '
    }
    ctx.fillText(line, 40, y)

    const tex = new THREE.CanvasTexture(canvas)
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide })
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(350, 205), mat)
    plane.userData = { section }
    return plane
  }

  createTreeLink(p1, p2) {
    const points = [p1, p2]
    const geo = new THREE.BufferGeometry().setFromPoints(points)
    const mat = new THREE.LineBasicMaterial({ color: 0x00C2FF, transparent: true, opacity: 0.2 })
    this.treeGroup.add(new THREE.Line(geo, mat))
  }

  transitionToExplorer() {
    this.mode = MODE.EXPLORE
    this.backBtn.style.display = 'none'
    this.controls.autoRotate = true
    this.controls.enablePan = false
    if (this.treeGroup) { this.scene.remove(this.treeGroup); this.treeGroup = null }
    this.nodes.forEach(n => n.visible = true)
    this.camera.position.set(0,0,700); this.controls.target.set(0,0,0)
    this.deselectNode()
  }

  createNodes() {
    // Hiro
    this.addNode({ kind: 'central', name: 'Hiro', headline: 'Central Intelligence' }, new THREE.Vector3(0, 0, 0), true)

    const items = this.data
    const count = items.length
    const radius = 350
    const phi = Math.PI * (3 - Math.sqrt(5))

    for (let i = 0; i < count; i++) {
        const y = 1 - (i / (count - 1)) * 2
        const r = Math.sqrt(1 - y * y)
        const theta = phi * i
        
        const pos = new THREE.Vector3(
          Math.cos(theta) * r * radius,
          y * radius,
          Math.sin(theta) * r * radius
        )
        this.addNode(items[i], pos)
    }
  }

  addNode(item, position, isCentral = false) {
    const color = KIND_COLOR[item.kind] || 0x64748b
    const group = new THREE.Group()
    group.position.copy(position)
    group.userData = { item, isCentral }

    // Sphere
    const geo = new THREE.SphereGeometry(isCentral ? 10 : 7, 32, 32)
    const mat = new THREE.MeshPhysicalMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.7,
      metalness: 0.1,
      roughness: 0.1,
      transmission: 0.9,
      thickness: 0.5,
      transparent: true,
      opacity: 0.9
    })
    const sphere = new THREE.Mesh(geo, mat)
    group.add(sphere)

    // Halo (Sprite for text/glow)
    if (!isCentral) {
       const canvas = document.createElement('canvas')
       const ctx = canvas.getContext('2d')
       canvas.width = 256; canvas.height = 64
       ctx.font = 'bold 24px "Inter"'
       ctx.fillStyle = '#ffffff'
       ctx.textAlign = 'center'
       ctx.fillText(item.name || item.title, 128, 32)
       
       const tex = new THREE.CanvasTexture(canvas)
       const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.8 })
       const sprite = new THREE.Sprite(spriteMat)
       sprite.position.y = 15
       sprite.scale.set(100, 25, 1)
       group.add(sprite)
    }

    this.scene.add(group)
    this.nodes.push(group)
  }

  createConnections() {
    const central = this.nodes[0].position
    const mat = new THREE.LineBasicMaterial({ color: 0x00C2FF, transparent: true, opacity: 0.1 })
    
    this.nodes.slice(1).forEach(n => {
      const geo = new THREE.BufferGeometry().setFromPoints([central, n.position])
      const line = new THREE.Line(geo, mat)
      this.scene.add(line)
    })
  }

  addEventHandlers() {
    window.addEventListener('resize', () => this.onResize())
    this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e))
    this.renderer.domElement.addEventListener('click', (e) => this.onClick(e))
  }

  onResize() {
    const w = this.container.clientWidth
    const h = window.innerHeight - 80
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
      const target = hits[0].object.parent
      target.scale.lerp(new THREE.Vector3(1.3, 1.3, 1.3), 0.2)
      document.body.style.cursor = 'pointer'
    } else {
      document.body.style.cursor = 'default'
    }
  }

  onClick(e) {
    this.raycaster.setFromCamera(this.mouse, this.camera)
    const hits = this.raycaster.intersectObjects(this.nodes, true)
    if (hits.length > 0) {
      const node = hits[0].object.parent
      this.handleNodeClick(node)
    } else {
      this.deselectNode()
    }
  }

  handleNodeClick(node) {
    this.selected = node
    this.controls.autoRotate = false
    const item = node.userData.item
    
    // Fly-to animation (camera focuses on node)
    const targetPos = node.position.clone().add(new THREE.Vector3(0, 0, 150))
    this.camera.position.lerp(targetPos, 0.1) // This is just a frame logic, should be in animate for full effect
    
    window.showPanel(item)
  }

  deselectNode() {
    this.selected = null
    this.controls.autoRotate = true
    window.hidePanel()
  }

  animate() {
    requestAnimationFrame(() => this.animate())
    this.controls.update()
    
    const time = performance.now() * 0.001
    this.nodes.forEach((n, i) => {
      if (i > 0) n.position.y += Math.sin(time + i) * 0.03
    })

    this.renderer.render(this.scene, this.camera)
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const wrapper = document.querySelector('[data-project-flow]')
  const dataEl = document.getElementById('projects-data')
  if (!wrapper || !dataEl) return

  const data = JSON.parse(dataEl.textContent)
  window.projectMap = new ProjectMap3D(wrapper, data)
  
  window.showPanel = (p) => {
    const panel = document.querySelector('[data-project-panel]')
    if (!panel) return
    panel.querySelector('[data-panel-name]').textContent = p.name || p.title
    panel.querySelector('[data-panel-role]').textContent = p.kind.toUpperCase()
    panel.querySelector('[data-panel-headline]').textContent = p.headline || p.summary
    panel.querySelector('[data-panel-summary]').textContent = p.summary
    
    const stackEl = panel.querySelector('[data-panel-stack]')
    if (stackEl) stackEl.innerHTML = (p.stack || []).map(s => `<span class="stack-chip">${s}</span>`).join('')
    
    const link = panel.querySelector('[data-panel-link]')
    if (link) {
      link.href = '#'
      link.onclick = (e) => {
        e.preventDefault()
        window.projectMap.transitionToReader(p)
      }
    }

    panel.dataset.open = 'true'
  }

  window.hidePanel = () => {
    const panel = document.querySelector('[data-project-panel]')
    if (panel) panel.dataset.open = 'false'
  }
})
