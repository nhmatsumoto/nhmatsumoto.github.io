import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import TWEEN from '@tweenjs/tween.js'

/**
 * Technical Knowledge OS — 3D Project Flow (V9 — Atom & Araucária)
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
const esc = (s) => (s||'').toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function createGlowTexture(size = 128) {
  const c = document.createElement('canvas'); c.width = c.height = size
  const ctx = c.getContext('2d'), h = size / 2, g = ctx.createRadialGradient(h, h, 0, h, h, h)
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.15, 'rgba(255,255,255,0.8)')
  g.addColorStop(0.4, 'rgba(255,255,255,0.15)'); g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size)
  return new THREE.CanvasTexture(c)
}


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
    if (!container) return
    this.container = container; this.data = data
    this.nodes = []; this.connections = []; this.selected = null
    this.cameraGoal = null; this.cameraTarget = null; this.transitioning = false
    this.glowTex = createGlowTexture(256); this.readerActive = false; this.layoutMode = 'atomo'
    
    // Structure Groups
    this.atomGroup = new THREE.Group()
    this.araucariaGroup = new THREE.Group()
    
    this.initScene()
    this.createStarfield()
    this.createNebula()
    this.createAtomOrbits()
    this.createNodes()
    this.createConnections()
    this.buildAraucariaTree()
    this.buildAraucariaBase() // New Pedestal
    this.buildReaderDOM()
    this.addEventHandlers()
    
    // Initial Visibility
    this.araucariaGroup.visible = false
    this.animate()
  }

  initScene() {
    this.container.innerHTML = '' // Fix legacy canvas overlap
    this.scene = new THREE.Scene()
    this.scene.fog = new THREE.FogExp2(0x020408, 0.0003)
    const w = this.container.clientWidth, h = this.container.clientHeight
    this.camera = new THREE.PerspectiveCamera(60, w / h, 1, 10000)
    this.camera.position.set(0, 400, 1000)
    
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    this.renderer.setClearColor(0x020408, 1); this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(w, h); this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.container.appendChild(this.renderer.domElement)
    this.renderer.domElement.style.pointerEvents = 'auto'
    
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    Object.assign(this.controls, { 
      enableDamping: true, dampingFactor: 0.06, autoRotate: true, autoRotateSpeed: 0.25,
      enablePan: true, screenSpacePanning: true, 
      minDistance: 150, maxDistance: 6000
    })
    
    // Stop auto-rotation when user takes control
    this.controls.addEventListener('start', () => {
      this.controls.autoRotate = false
    })
    
    this.scene.add(new THREE.AmbientLight(0x1a1a2e, 0.8))
    const p1 = new THREE.PointLight(0x00C2FF, 3, 2000); p1.position.set(500, 500, 500); this.scene.add(p1)
    const p2 = new THREE.PointLight(0x7C5CFF, 2, 1500); p2.position.set(-500, -200, 0); this.scene.add(p2)
    
    this.scene.add(this.atomGroup); this.scene.add(this.araucariaGroup)
    
    // Dedicated Pedestal Lighting
    this.pedestalLight = new THREE.SpotLight(0x00C2FF, 0, 1000, Math.PI/6, 0.5, 1)
    this.pedestalLight.position.set(200, 600, 200)
    this.scene.add(this.pedestalLight)

    this.raycaster = new THREE.Raycaster(); this.mouse = new THREE.Vector2()
  }

  createStarfield() {
    const N = 5000, pos = new Float32Array(N * 3), col = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) {
      const r = 2000 + Math.random() * 4000, t = Math.random()*Math.PI*2, p = Math.acos(2*Math.random()-1)
      pos[i*3] = r*Math.sin(p)*Math.cos(t); pos[i*3+1] = r*Math.sin(p)*Math.sin(t); pos[i*3+2] = r*Math.cos(p)
      col[i*3] = col[i*3+1] = col[i*3+2] = 0.5 + Math.random()*0.5
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
    const stars = new THREE.Points(geo, new THREE.PointsMaterial({ size: 4, map: this.glowTex, transparent: true, vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false }))
    this.atomGroup.add(stars)
  }

  createNebula() {
    [0x0a1628, 0x120a30].forEach((c, i) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(1200+i*400, 32, 32), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.05, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false }))
      this.atomGroup.add(m)
    })
  }

  createAtomOrbits() {
    const radii = [300, 450, 600]
    radii.forEach((r, idx) => {
      const curve = new THREE.EllipseCurve(0, 0, r, r * 0.8, 0, Math.PI * 2)
      const points = curve.getPoints(100)
      const geometry = new THREE.BufferGeometry().setFromPoints(points)
      const material = new THREE.LineBasicMaterial({ color: 0x00C2FF, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending })
      const orbit = new THREE.Line(geometry, material)
      orbit.rotation.x = Math.PI / 2 + (idx * 0.4)
      orbit.rotation.y = (idx * 0.3)
      this.atomGroup.add(orbit)
    })
  }

  buildAraucariaTree() {
    this.araucariaGroup = new THREE.Group(); this.araucariaGroup.visible = false; this.scene.add(this.araucariaGroup)
    
    // 1. Mature Trunk (10-11 Years)
    const trunkH = 1500, baseR = 28 
    const numSegments = 20
    for (let i = 0; i < numSegments; i++) {
        const r1 = baseR * Math.pow(1 - i / numSegments, 0.7)
        const r2 = baseR * Math.pow(1 - (i + 1) / numSegments, 0.7)
        const isWhorlBase = i > (numSegments * 0.6) && i % 2 === 0
        const m = isWhorlBase ? 1.08 : 1.0
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(r2, r1 * m, trunkH / numSegments, 12), new THREE.MeshStandardMaterial({ color: 0x0a0a0a, metalness: 0.2, roughness: 0.8 }))
        seg.position.y = (i * (trunkH / numSegments)) + (trunkH / numSegments / 2) + 125
        this.araucariaGroup.add(seg)
    }

    // 2. High-Fidelity Branching (Mature Umbrella Crown)
    const items = [...this.data].sort((a,b) => this.getNodeTier(a) - this.getNodeTier(b))
    const startH = trunkH * 0.6 + 125 // Mature trees have clear trunks
    const whorlSpacing = 80, b0 = 5 
    let itemIdx = 0, whorlIdx = 0
    const numWhorls = Math.ceil(items.length / b0)

    const fPos = [], fCol = [], bPos = [], bCol = [], pPos = [], pCol = []
    this.foliageRanges = new Map()

    while (itemIdx < items.length) {
      const tier = this.getNodeTier(items[itemIdx])
      const h_progress = whorlIdx / numWhorls
      // Steeper distribution for flattened crown
      const h_n = startH + (whorlIdx * whorlSpacing * (0.8 + Math.pow(h_progress, 1.5) * 0.4))
      const b_n = Math.min(b0 + Math.floor(h_progress * 6), items.length - itemIdx)
      const L_n = (320 + tier * 80 + h_progress * 450)
      
      for (let m = 0; m < b_n; m++) {
        const item = items[itemIdx]
        const node = this.nodes.find(n => n.userData.item === item)
        if (!node) { itemIdx++; continue }

        const theta = (m * Math.PI * 2) / b_n + (whorlIdx * 1.1)
        // Upward tilt for mature branches
        const pos = new THREE.Vector3(Math.cos(theta) * L_n, h_n + Math.pow(L_n/400, 2.5) * 180, Math.sin(theta) * L_n)
        node.userData.treePos = pos
        
        // Branch Curve (Stronger profile)
        const start = new THREE.Vector3(0, h_n, 0), mid = start.clone().lerp(pos, 0.7); mid.y += 20
        const curve = new THREE.QuadraticBezierCurve3(start, mid, pos)
        const pts = curve.getPoints(24)
        for (let i = 0; i < pts.length-1; i++) { 
          bPos.push(pts[i].x, pts[i].y, pts[i].z, pts[i+1].x, pts[i+1].y, pts[i+1].z)
          const bClr = tier === 0 ? [0, 0.8, 1] : [0, 0.66, 1]
          bCol.push(...bClr, ...bClr) 
        }

        // Fruits (Pinhas) for Projects
        if (item.kind === 'project') {
          this.addFruitData(pos, pPos, pCol)
        }

        // Foliage Data
        const fStart = fPos.length / 3
        this.addFoliageData(curve, fPos, fCol)
        this.foliageRanges.set(node, { start: fStart, count: (fPos.length / 3) - fStart })
        
        itemIdx++
      }
      whorlIdx++
    }

    // 3. Final Merged Objects
    const bGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(bPos), 3)).setAttribute('color', new THREE.BufferAttribute(new Float32Array(bCol), 3))
    this.mergedBranches = new THREE.LineSegments(bGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.2 }))
    this.araucariaGroup.add(this.mergedBranches)

    const fGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(fPos), 3)).setAttribute('color', new THREE.BufferAttribute(new Float32Array(fCol), 3))
    this.mergedFoliage = new THREE.LineSegments(fGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }))
    this.araucariaGroup.add(this.mergedFoliage)

    // 4. Pinhas (Fruits) - Merged Meshes
    const pGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(pPos), 3)).setAttribute('color', new THREE.BufferAttribute(new Float32Array(pCol), 3))
    const pMat = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.8, roughness: 0.2, emissiveIntensity: 0.5 })
    this.mergedFruits = new THREE.Mesh(pGeo, pMat)
    this.araucariaGroup.add(this.mergedFruits)
  }

  addFruitData(pos, vertices, colors) {
    const geo = new THREE.IcosahedronGeometry(12, 0)
    const vArr = geo.attributes.position.array
    for (let i = 0; i < vArr.length; i += 3) {
      vertices.push(vArr[i] + pos.x, vArr[i+1] + pos.y, vArr[i+2] + pos.z)
      colors.push(0, 0.7, 1) // Pine cone cyan glow
    }
  }

  addFoliageData(curve, pos, col) {
    const points = curve.getPoints(20)
    points.forEach((p, i) => {
      if (i === 0) return
      const dir = p.clone().sub(points[i-1]).normalize()
      const side1 = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0,1,0)).normalize()
      const side2 = new THREE.Vector3().crossVectors(dir, side1).normalize()
      const l_mult = i / points.length
      const tier = this.getNodeTier({ stack: [] }) // Default check
      const d_mult = l_mult > 0.6 ? 8 : 4 // More density at tips
      for (let j = 0; j < d_mult; j++) {
        const ang = (j / d_mult) * Math.PI * 2 + i * 0.5
        const s = side1.clone().multiplyScalar(Math.cos(ang)).add(side2.clone().multiplyScalar(Math.sin(ang)))
        const reach = (3 + l_mult * 10) * (0.8 + Math.random()*0.4)
        const start = p.clone().add(s.clone().multiplyScalar(reach*0.5)), end = start.clone().add(dir.clone().multiplyScalar(18)).add(s.clone().multiplyScalar(reach))
        pos.push(start.x, start.y, start.z, end.x, end.y, end.z)
        col.push(0, 0.4, 0.35, 0, 0.25, 0.18)
      }
    })
  }

  getNodeTier(item) {
    const fnd = ['solid','filas','estruturas-de-dados','ddd','arquitetura','architecture','clean-architecture','oop','algorithms','patterns','teoria','computacao']
    const stk = (item.stack || []).map(s => s.toLowerCase())
    if (stk.some(s => fnd.includes(s))) return 0
    return item.kind === 'project' ? 1 : 2
  }

  buildAraucariaBase() {
    const baseGroup = new THREE.Group(); this.araucariaGroup.add(baseGroup)
    
    // 1. Concrete Blocks (Triangle)
    const blockGeo = new THREE.BoxGeometry(100, 30, 100)
    const blockMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.1, roughness: 0.9 })
    const positions = [[-60, 15, -35], [60, 15, -35], [0, 45, 60]] // Tiered triangle
    positions.forEach(p => {
      const b = new THREE.Mesh(blockGeo, blockMat); b.position.set(...p); baseGroup.add(b)
      // Neon Edge
      const edges = new THREE.EdgesGeometry(blockGeo); const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x00C2FF, transparent: true, opacity: 0.3 }))
      line.position.copy(b.position); baseGroup.add(line)
    })

    // 2. Plant Pot (Vaso)
    const potGeo = new THREE.CylinderGeometry(55, 40, 80, 32)
    const potMat = new THREE.MeshPhysicalMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.05, clearcoat: 1 })
    const pot = new THREE.Mesh(potGeo, potMat); pot.position.set(0, 85, 0); baseGroup.add(pot)
    
    // Pot Rim Glow
    const rim = new THREE.Mesh(new THREE.TorusGeometry(55, 1, 16, 100), new THREE.MeshBasicMaterial({ color: 0x00C2FF, transparent: true, opacity: 0.5 }))
    rim.rotation.x = Math.PI/2; rim.position.set(0, 125, 0); baseGroup.add(rim)

    // Adjust entire group for cinematic focus
    this.araucariaGroup.position.y = -100 
  }

  createNodes() {
    const central = { kind: 'central', name: 'Hiro' }; this.nodes = []
    this.addNode(central, new THREE.Vector3(0,0,0), true)
    
    const items = this.data, R = 450, GA = Math.PI * (3 - Math.sqrt(5))
    items.forEach((item, i) => {
      const y = 1-(i/(items.length-1))*2, r = Math.sqrt(1-y*y), t = GA*i
      const pos = new THREE.Vector3(Math.cos(t)*r*R + (Math.random()-0.5)*20, y*R, Math.sin(t)*r*R)
      const n = this.addNode(item, pos); n.userData.atomPos = pos.clone()
    })
  }

  addNode(item, pos, isCentral = false) {
    const cc = KIND_COLOR[item.kind] || 0x64748b, g = new THREE.Group(); g.position.copy(pos)
    g.userData = { item, isCentral, rings: [], pulsePhase: Math.random()*Math.PI*2 }
    const sz = isCentral ? 18 : 12
    g.add(new THREE.Mesh(new THREE.SphereGeometry(sz, 32, 24), new THREE.MeshPhysicalMaterial({ color: cc, emissive: cc, emissiveIntensity: isCentral ? 2.5 : 1.8, transmission: 0.9, transparent: true })))
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: cc, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending }))
    glow.scale.set(sz*6, sz*6, 1); g.add(glow); g.userData.glow = glow
    
    for (let r = 0; r < (isCentral ? 3 : 1); r++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(sz*1.8+r*8, 0.4, 8, 50), new THREE.MeshBasicMaterial({ color: cc, transparent: true, opacity: 0.4-r*0.1, blending: THREE.AdditiveBlending }))
      ring.rotation.set(Math.random()*3, Math.random()*3, 0); g.add(ring)
      g.userData.rings.push({ mesh: ring, rx: (Math.random()-0.5)*0.012, ry: (Math.random()-0.5)*0.018 })
    }
    
    // Label
    const txt = (item.name || item.title || '').toUpperCase(); if (txt) {
      const cv = document.createElement('canvas'); cv.width = 512; cv.height = 100
      const cx = cv.getContext('2d'); cx.font = isCentral ? 'bold 42px "JetBrains Mono"' : '600 30px "JetBrains Mono"'
      cx.textAlign = 'center'; cx.fillStyle = '#fff'; cx.fillText(txt.length > 24 ? txt.slice(0, 22)+'..' : txt, 256, 50)
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, opacity: 0.9 })); 
      sp.position.y = sz + 25; sp.scale.set(isCentral ? 90 : 150, isCentral ? 30 : 28, 1); g.add(sp)
    }
    this.scene.add(g); this.nodes.push(g); return g
  }

  createConnections() {
    // 1. Atom Center Links
    this.atomConnections = new THREE.Group(); const ctr = this.nodes[0].position
    this.nodes.slice(1).forEach(n => {
      const t = n.position, cc = KIND_COLOR[n.userData.item.kind]
      const mid = ctr.clone().lerp(t, 0.5); mid.y += 40 + Math.random()*60
      const link = new THREE.Line(new THREE.BufferGeometry().setFromPoints(new THREE.QuadraticBezierCurve3(ctr, mid, t).getPoints(30)), new THREE.LineBasicMaterial({ color: cc, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending }))
      n.userData.atomLink = link
      this.atomConnections.add(link)
    })
    this.atomGroup.add(this.atomConnections)
  }

  setLayout(mode) {
    if (this.layoutMode === mode) return
    this.layoutMode = mode; const isTree = mode === 'arvore'
    this.atomGroup.visible = !isTree; this.araucariaGroup.visible = isTree
    this.transitioning = true
    
    // Node Transitions
    this.nodes.forEach(n => {
      const target = isTree ? (n.userData.isCentral ? new THREE.Vector3(0,0,0) : n.userData.treePos) : n.userData.atomPos
      if (target) new TWEEN.Tween(n.position).to({ x: target.x, y: target.y, z: target.z }, 1800).easing(TWEEN.Easing.Cubic.InOut).start()
    })
    
    // Cinematic Camera Sequences
    if (isTree) {
      // TAKE 1: Low-Angle gaze at pedestal
      new TWEEN.Tween(this.camera.position).to({ x: 500, y: 150, z: 500 }, 1000).easing(TWEEN.Easing.Quadratic.InOut)
        .chain(
          // TAKE 2: Wide Majestic Profile (Full View Zoom Out)
          new TWEEN.Tween(this.camera.position).to({ x: 2200, y: 1500, z: 2200 }, 2000).easing(TWEEN.Easing.Cubic.InOut)
        ).start()
      
      new TWEEN.Tween(this.controls.target).to({ x: 0, y: 100, z: 0 }, 1000).easing(TWEEN.Easing.Quadratic.InOut)
        .chain(
          // Centered at mid-tree for wide view
          new TWEEN.Tween(this.controls.target).to({ x: 0, y: 500, z: 0 }, 2000).easing(TWEEN.Easing.Cubic.InOut)
        ).start()
      
      new TWEEN.Tween(this.pedestalLight).to({ intensity: 6 }, 1500).start()
    } else {
      // TAKE 1: Dive into Atom
      new TWEEN.Tween(this.camera.position).to({ x: 0, y: 100, z: 400 }, 1000).easing(TWEEN.Easing.Cubic.In)
        .chain(
          // TAKE 2: Pull back to orbital
          new TWEEN.Tween(this.camera.position).to({ x: 0, y: 400, z: 1000 }, 1200).easing(TWEEN.Easing.Cubic.Out)
        ).start()
      
      new TWEEN.Tween(this.controls.target).to({ x: 0, y: 0, z: 0 }, 1500).start()
      new TWEEN.Tween(this.pedestalLight).to({ intensity: 0 }, 1000).start()
    }
  }

  focusOnNode(node) {
    const p = node.position.clone(), dist = 450
    this.cameraGoal = p.clone().add(this.camera.position.clone().sub(this.controls.target).normalize().multiplyScalar(dist))
    this.cameraTarget = p.clone(); this.transitioning = true
  }
  deselectNode() { this.selected = null; this.controls.autoRotate = true; this.restoreNodeVisibility(); this.resetCameraFocus(); if (window.hideIntelligencePanel) window.hideIntelligencePanel() }
  resetCameraFocus() { 
    const isTree = this.layoutMode === 'arvore'
    this.cameraGoal = isTree ? new THREE.Vector3(2200, 1500, 2200) : new THREE.Vector3(0, 400, 1000)
    this.cameraTarget = isTree ? new THREE.Vector3(0, 500, 0) : new THREE.Vector3(0, 0, 0)
    this.transitioning = true 
  }
  
  highlightNode(sel) {
    const isTree = this.layoutMode === 'arvore'
    this.nodes.forEach(n => { const s = n === sel; n.traverse(c => { if (c.material) { c.material._os = c.material._os ?? c.material.opacity; c.material.opacity = s ? c.material._os : c.material._os * 0.2; if (c.material.emissiveIntensity) c.material.emissiveIntensity = s ? 3 : 0.5 } }) })
    if (!isTree) {
        this.nodes.slice(1).forEach(n => { if (n.userData.atomLink) n.userData.atomLink.material.opacity = (n === sel) ? 0.8 : 0.05 })
    } else {
        this.mergedBranches.material.opacity = 0.05; this.mergedFoliage.material.opacity = 0.2
        const range = this.foliageRanges.get(sel)
        if (range) {
            const colors = this.mergedFoliage.geometry.attributes.color.array
            for (let i = 0; i < colors.length / 3; i++) {
                const active = i >= range.start && i < (range.start + range.count)
                const base = active ? [0, 0.8, 0.6] : [0, 0.2, 0.15]
                colors[i*3] = base[0]; colors[i*3+1] = base[1]; colors[i*3+2] = base[2]
            }
            this.mergedFoliage.geometry.attributes.color.needsUpdate = true
        }
    }
    if (sel) new TWEEN.Tween(sel.scale).to({ x: 1.4, y: 1.4, z: 1.4 }, 300).easing(TWEEN.Easing.Back.Out).start()
  }
  
  restoreNodeVisibility() {
    this.nodes.forEach(n => { n.traverse(c => { if (c.material?._os !== undefined) c.material.opacity = c.material._os; if (c.material?.emissiveIntensity) c.material.emissiveIntensity = 1.8 }); new TWEEN.Tween(n.scale).to({ x: 1, y: 1, z: 1 }, 200).start() })
    if (this.mergedBranches) this.mergedBranches.material.opacity = 0.2
    if (this.mergedFoliage) {
        this.mergedFoliage.material.opacity = 0.45
        const colors = this.mergedFoliage.geometry.attributes.color.array
        for (let i = 0; i < colors.length / 3; i++) { colors[i*3] = 0; colors[i*3+1] = 0.33; colors[i*3+2] = 0.26 }
        this.mergedFoliage.geometry.attributes.color.needsUpdate = true
    }
    this.nodes.slice(1).forEach(n => { if (n.userData.atomLink) n.userData.atomLink.material.opacity = 0.15 })
  }

  buildReaderDOM() {
    this.readerEl = document.createElement('div'); this.readerEl.className = 'reader-article'
    this.readerEl.innerHTML = `<header class="reader-article-bar"><div class="reader-article-bar-left"><button class="reader-article-back" data-r-close><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>Voltar</button></div><div class="reader-article-bar-center"><span class="reader-article-kind" data-r-kind></span><span class="reader-article-bar-title" data-r-bar-title></span></div><div class="reader-article-bar-right"><a class="reader-article-link" data-r-fullpage href="#" target="_blank">Página completa</a></div></header><main class="reader-article-body"><article class="reader-article-content prose" data-r-content></article></main>`
    this.container.appendChild(this.readerEl); this.readerEl.querySelector('[data-r-close]').onclick = () => this.exitReader()
  }

  enterReader(item) {
    this.readerActive = true; this.atomGroup.visible = this.araucariaGroup.visible = false; this.nodes.forEach(n => n.visible = false)
    this.controls.autoRotate = false; this.controls.enabled = false; if (window.hideIntelligencePanel) window.hideIntelligencePanel(); this.readerEl.classList.add('open')
    const cnt = this.readerEl.querySelector('[data-r-content]')
    cnt.innerHTML = `<h1>${esc(item.name || item.title)}</h1><div class="reader-article-divider"></div><section>${item.body_html || item.summary}</section>`
  }
  exitReader() {
    this.readerActive = false; this.readerEl.classList.remove('open'); this.nodes.forEach(n => n.visible = true)
    this.atomGroup.visible = (this.layoutMode === 'atomo'); this.araucariaGroup.visible = (this.layoutMode === 'arvore')
    this.controls.enabled = true; this.controls.autoRotate = true; this.resetCameraFocus(); this.selected = null
  }

  addEventHandlers() {
    window.addEventListener('resize', () => this.onResize())
    this.renderer.domElement.addEventListener('mousemove', e => this.onMouseMove(e))
    this.renderer.domElement.addEventListener('click', () => this.onClick())
    window.addEventListener('keydown', e => { if (e.key === 'Escape') this.selected ? this.deselectNode() : (this.readerActive && this.exitReader()) })
  }

  onResize() { const w = this.container.clientWidth, h = this.container.clientHeight; this.camera.aspect = w/h; this.camera.updateProjectionMatrix(); this.renderer.setSize(w, h) }
  onMouseMove(e) {
    if (this.readerActive) return
    const r = this.renderer.domElement.getBoundingClientRect()
    this.mouse.x = ((e.clientX-r.left)/r.width)*2-1; this.mouse.y = -((e.clientY-r.top)/r.height)*2+1
    this.raycaster.setFromCamera(this.mouse, this.camera)
    const hits = this.raycaster.intersectObjects(this.nodes, true)
    this.nodes.forEach(n => n.scale.lerp(new THREE.Vector3(1,1,1), 0.1))
    if (hits.length) { document.body.style.cursor = 'pointer'; let t = hits[0].object; while (t.parent && !t.userData.item) t = t.parent; if (t.userData.item) t.scale.set(1.2,1.2,1.2) }
    else document.body.style.cursor = 'default'
  }
  handleNodeClick(node) {
    if (this.selected === node) return
    this.selected = node; this.focusOnNode(node); this.highlightNode(node)
    if (window.showIntelligencePanel) {
      window.showIntelligencePanel(node.userData.item);
    }
  }

  onClick() {
    if (this.readerActive) return
    this.raycaster.setFromCamera(this.mouse, this.camera)
    const hits = this.raycaster.intersectObjects(this.nodes, true).filter(h => h.object.type === 'Mesh')
    if (hits.length) { 
      let t = hits[0].object; while (t.parent && !t.userData.item) t = t.parent
      if (t.userData.item) { this.handleNodeClick(t); return }
    }
    this.deselectNode()
  }

  animate() {
    requestAnimationFrame(() => this.animate()); TWEEN.update()
    if (this.transitioning) { this.camera.position.lerp(this.cameraGoal, 0.05); this.controls.target.lerp(this.cameraTarget, 0.05); if (this.camera.position.distanceTo(this.cameraGoal) < 1) this.transitioning = false }
    this.controls.update(); const t = performance.now()*0.001
    if (!this.readerActive) {
      this.atomGroup.rotation.y = t * 0.02
      this.nodes.forEach((n, i) => { 
        if (i > 0) n.position.y += Math.sin(t*1.1+i)*0.03
        n.userData.rings?.forEach(r => { r.mesh.rotation.x += r.rx; r.mesh.rotation.y += r.ry })
        if (n.userData.glow) n.userData.glow.material.opacity = 0.35 + Math.sin(t*1.5+n.userData.pulsePhase)*0.1
      })
    }
    this.renderer.render(this.scene, this.camera)
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('[data-project-flow]'), jsonEl = document.getElementById('projects-data')
  if (!container || !jsonEl) return
  const data = JSON.parse(jsonEl.textContent)
  window.projectMap = new ProjectMap3D(container, data)

  const shell = container.closest('.project-flow-shell') || container.parentElement
  if (shell) {
    shell.querySelectorAll('.view-mode-toggle').forEach(el => el.remove())
    const toggle = document.createElement('button'); toggle.className = 'view-mode-toggle'; toggle.style.zIndex = '9999'
    let current = 'atomo'
    const updateLabel = (m) => {
      toggle.innerHTML = m === 'atomo' 
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg><span>Árvore</span>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><path d="M12 2v2m0 16v2m-8-10H2m20 0h-2m-2.1-6.9l-1.4 1.4m-9 9l-1.4 1.4m0-11.8l1.4 1.4m9 9l1.4 1.4"/></svg><span>Átomo</span>'
    }
    updateLabel(current); shell.prepend(toggle)
    toggle.onclick = () => { current = (current === 'atomo' ? 'arvore' : 'atomo'); updateLabel(current); window.projectMap.setLayout(current) }
  }

  document.querySelector('[data-panel-close]')?.addEventListener('click', () => window.projectMap?.deselectNode())
  
  const params = new URLSearchParams(window.location.search), sid = params.get('select')
  if (sid) setTimeout(() => { const n = window.projectMap.nodes.find(v => v.userData.item?.id === sid); if (n) window.projectMap.handleNodeClick(n) }, 800)
})
