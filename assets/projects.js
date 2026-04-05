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

/**
 * Zelda: Breath of the Wild Inspired Palette
 */
const ZELDA_PALETTE = {
  sky: 0x87CEEB,
  grass: 0x4CAF50,
  wood: 0x4E342E,
  leaf_deep: 0x1B5E20,
  leaf_vibrant: 0x66BB6A,
  sun: 0xFFF9C4,
}
const KIND_LABEL = {
  post: 'Publicação', project: 'Projeto', document: 'Documento',
}

/**
 * Periodic Table Essentials for Visual Representation
 */
const PERIODIC_TABLE = [
  { symbol: 'H', name: 'Hidrogênio', shells: [1], color: 0x00C2FF },
  { symbol: 'He', name: 'Hélio', shells: [2], color: 0xFFD700 }, // Noble
  { symbol: 'Li', name: 'Lítio', shells: [2, 1], color: 0xFF4500 }, // Alkali
  { symbol: 'Be', name: 'Berílio', shells: [2, 2], color: 0x32CD32 },
  { symbol: 'B', name: 'Boro', shells: [2, 3], color: 0x8B4513 },
  { symbol: 'C', name: 'Carbono', shells: [2, 4], color: 0xAAAAAA },
  { symbol: 'N', name: 'Nitrogênio', shells: [2, 5], color: 0x4169E1 },
  { symbol: 'O', name: 'Oxigênio', shells: [2, 6], color: 0xFFffff },
  { symbol: 'F', name: 'Flúor', shells: [2, 7], color: 0xDA70D6 },
  { symbol: 'Ne', name: 'Neônio', shells: [2, 8], color: 0xFF00FF }, // Noble
  { symbol: 'Na', name: 'Sódio', shells: [2, 8, 1], color: 0xFF8C00 },
  { symbol: 'Mg', name: 'Magnésio', shells: [2, 8, 2], color: 0x556B2F },
  { symbol: 'Al', name: 'Alumínio', shells: [2, 8, 3], color: 0xBDB76B },
  { symbol: 'Si', name: 'Silício', shells: [2, 8, 4], color: 0x708090 },
  { symbol: 'P', name: 'Fósforo', shells: [2, 8, 5], color: 0xFFA07A },
  { symbol: 'S', name: 'Enxofre', shells: [2, 8, 6], color: 0xFFFF00 },
  { symbol: 'Cl', name: 'Cloro', shells: [2, 8, 7], color: 0x00FF00 },
  { symbol: 'Ar', name: 'Argônio', shells: [2, 8, 8], color: 0x00FFFF }, // Noble
  { symbol: 'K', name: 'Potássio', shells: [2, 8, 8, 1], color: 0x9400D3 },
  { symbol: 'Ca', name: 'Cálcio', shells: [2, 8, 8, 2], color: 0x3CB371 },
]
const getElementForNode = (i) => PERIODIC_TABLE[i % PERIODIC_TABLE.length]
const esc = (s) => (s || '').toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

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
    this.createClouds()
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
    this.scene.background = new THREE.Color(0x020408)
    this.scene.fog = new THREE.Fog(0x87CEEB, 1500, 15000)
    // Initially hide fog
    this.scene.fog.near = 100000; this.scene.fog.far = 200000
    const w = this.container.clientWidth, h = this.container.clientHeight
    this.camera = new THREE.PerspectiveCamera(60, w / h, 1, 20000)
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
      minDistance: 150, maxDistance: 10000
    })

    // Stop auto-rotation when user takes control
    this.controls.addEventListener('start', () => {
      this.controls.autoRotate = false
    })

    this.scene.add(new THREE.AmbientLight(0x404040, 1.2))
    const p1 = new THREE.PointLight(0x00C2FF, 3, 2000); p1.position.set(500, 500, 500); this.scene.add(p1)
    const p2 = new THREE.PointLight(0x7C5CFF, 2, 1500); p2.position.set(-500, -200, 0); this.scene.add(p2)

    this.scene.add(this.atomGroup); this.scene.add(this.araucariaGroup)

    // Sun Light for Zelda Environment
    this.sunLight = new THREE.DirectionalLight(ZELDA_PALETTE.sun, 0)
    this.sunLight.position.set(1000, 2000, 1000)
    this.scene.add(this.sunLight)
    this.scene.add(this.sunLight.target)

    // Dedicated Pedestal Lighting (Legacy)
    this.pedestalLight = new THREE.PointLight(0x00C2FF, 0, 1000)
    this.pedestalLight.position.set(0, 500, 0)
    this.scene.add(this.pedestalLight)

    this.raycaster = new THREE.Raycaster(); this.mouse = new THREE.Vector2()
  }

  createStarfield() {
    const N = 5000, pos = new Float32Array(N * 3), col = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) {
      const r = 2000 + Math.random() * 4000, t = Math.random() * Math.PI * 2, p = Math.acos(2 * Math.random() - 1)
      pos[i * 3] = r * Math.sin(p) * Math.cos(t); pos[i * 3 + 1] = r * Math.sin(p) * Math.sin(t); pos[i * 3 + 2] = r * Math.cos(p)
      col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 0.5 + Math.random() * 0.5
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
    const stars = new THREE.Points(geo, new THREE.PointsMaterial({ size: 4, map: this.glowTex, transparent: true, vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false }))
    this.atomGroup.add(stars)
  }

  createNebula() {
    [0x0a1628, 0x120a30].forEach((c, i) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(1200 + i * 400, 32, 32), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.05, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false }))
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

  createClouds() {
    this.cloudGroup = new THREE.Group()
    this.cloudGroup.visible = false
    this.scene.add(this.cloudGroup)

    const numClouds = 12
    for (let i = 0; i < numClouds; i++) {
      const cloud = new THREE.Group()
      const x = (Math.random() - 0.5) * 8000
      const y = 2000 + Math.random() * 1000
      const z = (Math.random() - 0.5) * 8000
      cloud.position.set(x, y, z)

      const numBlobs = 3 + Math.floor(Math.random() * 4)
      const cloudMat = new THREE.MeshToonMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 })
      for (let j = 0; j < numBlobs; j++) {
        const blob = new THREE.Mesh(new THREE.SphereGeometry(100 + Math.random() * 150, 12, 12), cloudMat)
        blob.position.set((j - numBlobs / 2) * 150, (Math.random() - 0.5) * 100, (Math.random() - 0.5) * 100)
        blob.scale.set(1, 0.6, 1)
        cloud.add(blob)
      }
      cloud.userData.speed = 0.5 + Math.random() * 1.5
      this.cloudGroup.add(cloud)
    }
  }

  buildAraucariaTree() {
    this.araucariaGroup = new THREE.Group(); this.araucariaGroup.visible = false; this.scene.add(this.araucariaGroup)

    // 1. Mature Trunk (10-11 Years)
    const trunkH = 1500, baseR = 35
    const numSegments = 25
    const woodMat = new THREE.MeshToonMaterial({
      color: ZELDA_PALETTE.wood,
      flatShading: true
    })
    for (let i = 0; i < numSegments; i++) {
      const r1 = baseR * Math.pow(1 - i / numSegments, 0.65)
      const r2 = baseR * Math.pow(1 - (i + 1) / numSegments, 0.65)
      const isWhorlBase = i > (numSegments * 0.4) && i % 2 === 0
      const m = isWhorlBase ? 1.15 : 1.0
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(r2, r1 * m, trunkH / numSegments, 8), woodMat)
      seg.position.y = (i * (trunkH / numSegments)) + (trunkH / numSegments / 2) + 10
      this.araucariaGroup.add(seg)
    }

    // 2. High-Fidelity Branching (Mature Umbrella Crown)
    const items = [...this.data].sort((a, b) => this.getNodeTier(a) - this.getNodeTier(b))
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
        const pos = new THREE.Vector3(Math.cos(theta) * L_n, h_n + Math.pow(L_n / 400, 2.5) * 180, Math.sin(theta) * L_n)
        node.userData.treePos = pos

        // Branch Curve (Stronger profile)
        const start = new THREE.Vector3(0, h_n, 0), mid = start.clone().lerp(pos, 0.7); mid.y += 20
        const curve = new THREE.QuadraticBezierCurve3(start, mid, pos)
        const pts = curve.getPoints(24)
        for (let i = 0; i < pts.length - 1; i++) {
          bPos.push(pts[i].x, pts[i].y, pts[i].z, pts[i + 1].x, pts[i + 1].y, pts[i + 1].z)
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
    this.mergedBranches = new THREE.LineSegments(bGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.15 }))
    this.araucariaGroup.add(this.mergedBranches)

    const fGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(fPos), 3)).setAttribute('color', new THREE.BufferAttribute(new Float32Array(fCol), 3))
    this.mergedFoliage = new THREE.LineSegments(fGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.7, blending: THREE.NormalBlending }))
    this.araucariaGroup.add(this.mergedFoliage)

    // 4. Pinhas (Fruits) - Organic Tones
    const pGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(pPos), 3)).setAttribute('color', new THREE.BufferAttribute(new Float32Array(pCol), 3))
    const pMat = new THREE.MeshToonMaterial({ vertexColors: true, emissive: 0x4caf50, emissiveIntensity: 0.2 })
    this.mergedFruits = new THREE.Mesh(pGeo, pMat)
    this.araucariaGroup.add(this.mergedFruits)
  }

  addFruitData(pos, vertices, colors) {
    const geo = new THREE.IcosahedronGeometry(12, 0)
    const vArr = geo.attributes.position.array
    for (let i = 0; i < vArr.length; i += 3) {
      vertices.push(vArr[i] + pos.x, vArr[i + 1] + pos.y, vArr[i + 2] + pos.z)
      colors.push(0, 0.7, 1) // Pine cone cyan glow
    }
  }

  addFoliageData(curve, pos, col) {
    const points = curve.getPoints(20)
    points.forEach((p, i) => {
      if (i === 0) return
      const dir = p.clone().sub(points[i - 1]).normalize()
      const side1 = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize()
      const side2 = new THREE.Vector3().crossVectors(dir, side1).normalize()
      const l_mult = i / points.length
      const tier = this.getNodeTier({ stack: [] }) // Default check
      const d_mult = l_mult > 0.6 ? 8 : 4 // More density at tips
      for (let j = 0; j < d_mult; j++) {
        const ang = (j / d_mult) * Math.PI * 2 + i * 0.5
        const s = side1.clone().multiplyScalar(Math.cos(ang)).add(side2.clone().multiplyScalar(Math.sin(ang)))
        const reach = (3 + l_mult * 10) * (0.8 + Math.random() * 0.4)
        const start = p.clone().add(s.clone().multiplyScalar(reach * 0.5)), end = start.clone().add(dir.clone().multiplyScalar(18)).add(s.clone().multiplyScalar(reach))
        pos.push(start.x, start.y, start.z, end.x, end.y, end.z)
        const c1 = new THREE.Color(ZELDA_PALETTE.leaf_deep); const c2 = new THREE.Color(ZELDA_PALETTE.leaf_vibrant)
        col.push(c1.r, c1.g, c1.b, c2.r, c2.g, c2.b)
      }
    })
  }

  getNodeTier(item) {
    const fnd = ['solid', 'filas', 'estruturas-de-dados', 'ddd', 'arquitetura', 'architecture', 'clean-architecture', 'oop', 'algorithms', 'patterns', 'teoria', 'computacao']
    const stk = (item.stack || []).map(s => s.toLowerCase())
    if (stk.some(s => fnd.includes(s))) return 0
    return item.kind === 'project' ? 1 : 2
  }

  buildAraucariaBase() {
    const baseGroup = new THREE.Group(); this.araucariaGroup.add(baseGroup)

    // 1. Hilly Terrain (Subdivided Plane)
    const terrainSize = 8000, segments = 64
    const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, segments, segments)
    const pos = terrainGeo.attributes.position.array
    for (let i = 0; i < pos.length; i += 3) {
      const x = pos[i], y = pos[i + 1]
      const dist = Math.sqrt(x * x + y * y)
      // Natural hills using sine/cosine + falloff
      if (dist < 3500) {
        pos[i + 2] = (Math.sin(x * 0.002) * Math.cos(y * 0.002) * 200) + (Math.sin(x * 0.01) * 30)
      } else {
        pos[i + 2] = -500 // Sink edges
      }
    }
    terrainGeo.computeVertexNormals()

    const terrainMat = new THREE.MeshToonMaterial({
      color: ZELDA_PALETTE.grass,
      flatShading: true
    })
    const terrain = new THREE.Mesh(terrainGeo, terrainMat)
    terrain.rotation.x = -Math.PI / 2
    terrain.position.y = -50
    baseGroup.add(terrain)

    // 2. Grassy Clumps (Scattered Grass Blades)
    const numClumps = 1200, gPos = [], gCol = []
    for (let i = 0; i < numClumps; i++) {
      const r = 200 + Math.random() * 2500, t = Math.random() * Math.PI * 2
      const x = Math.cos(t) * r, z = Math.sin(t) * r
      const h = 10 + Math.random() * 35
      // Simple blade shape
      gPos.push(x, 0, z, x + (Math.random() - 0.5) * 12, h, z + (Math.random() - 0.5) * 12)
      gCol.push(0.3, 0.7, 0.4, 0.4, 0.9, 0.5) // Gradient green from BotW
    }
    const grassGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(gPos), 3)).setAttribute('color', new THREE.BufferAttribute(new Float32Array(gCol), 3))
    const grassMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.6 })
    this.grassMesh = new THREE.LineSegments(grassGeo, grassMat)
    baseGroup.add(this.grassMesh)

    // 3. Tree Root Mound
    const moundGeo = new THREE.CylinderGeometry(150, 400, 60, 32)
    const moundMat = new THREE.MeshStandardMaterial({ color: ZELDA_PALETTE.grass, roughness: 1 })
    const mound = new THREE.Mesh(moundGeo, moundMat); mound.position.y = 30; baseGroup.add(mound)

    // Adjust entire group for cinematic focus
    this.araucariaGroup.position.y = 0
  }

  createNodes() {
    const central = { kind: 'central', name: 'Hiro' }; this.nodes = []
    this.addNode(central, new THREE.Vector3(0, 0, 0), true)

    const items = this.data, R = 450, GA = Math.PI * (3 - Math.sqrt(5))
    items.forEach((item, i) => {
      const y = 1 - (i / (items.length - 1)) * 2, r = Math.sqrt(1 - y * y), t = GA * i
      const pos = new THREE.Vector3(Math.cos(t) * r * R + (Math.random() - 0.5) * 20, y * R, Math.sin(t) * r * R)
      const n = this.addNode(item, pos); n.userData.atomPos = pos.clone()
    })
  }

  addNode(item, pos, isCentral = false) {
    const el = isCentral ? { symbol: 'Hiro', color: 0xFFFFFF, shells: [2, 8, 18, 32] } : getElementForNode(this.nodes.length)
    const cc = el.color || KIND_COLOR[item.kind] || 0x64748b
    const g = new THREE.Group(); g.position.copy(pos)
    g.userData = { item, isCentral, element: el, orbits: [], electrons: [], pulsePhase: Math.random() * Math.PI * 2 }

    // 1. Nucleus (The Central Power)
    const sz = isCentral ? 22 : 14
    const nucGeo = new THREE.SphereGeometry(sz, 32, 24)
    const nucMat = new THREE.MeshPhysicalMaterial({
      color: cc, emissive: cc, emissiveIntensity: isCentral ? 4 : 2,
      metalness: 0.9, roughness: 0.1, transmission: 0.5, thickness: 2, transparent: true
    })
    const nucleus = new THREE.Mesh(nucGeo, nucMat)
    g.add(nucleus)

    // Core Glow
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: cc, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending }))
    glow.scale.set(sz * 8, sz * 8, 1); g.add(glow); g.userData.glow = glow

    // 2. Electron Shells (Sub-orbits)
    el.shells.forEach((count, sIdx) => {
      const orbitRadius = sz * (2.2 + sIdx * 1.2)
      const orbitGeo = new THREE.TorusGeometry(orbitRadius, 0.4, 16, 100)
      const orbitMat = new THREE.MeshBasicMaterial({ color: cc, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending })
      const orbit = new THREE.Mesh(orbitGeo, orbitMat)

      // Random tilt for the shell
      orbit.rotation.x = Math.random() * Math.PI
      orbit.rotation.y = Math.random() * Math.PI
      g.add(orbit)

      const orbitObj = { mesh: orbit, speed: (0.008 / (sIdx + 1)) * (isCentral ? 2 : 1) }
      g.userData.orbits.push(orbitObj)

      // Electrons on this shell
      for (let e = 0; e < count; e++) {
        const eGeo = new THREE.SphereGeometry(isCentral ? 3 : 2, 8, 8)
        const eMat = new THREE.MeshBasicMaterial({ color: cc, emissive: cc, emissiveIntensity: 5 })
        const electron = new THREE.Mesh(eGeo, eMat)

        const angle = (e / count) * Math.PI * 2
        electron.position.x = Math.cos(angle) * orbitRadius
        electron.position.y = Math.sin(angle) * orbitRadius
        orbit.add(electron)
        g.userData.electrons.push(electron)
      }
    })

    // 3. 3D Label (HUD Style)
    const name = (item.name || item.title || '').toUpperCase()
    const symbol = el.symbol.toUpperCase()
    const labelGroup = new THREE.Group()

    // Atomic Symbol Label
    const symCv = document.createElement('canvas'); symCv.width = 128; symCv.height = 128
    const symCx = symCv.getContext('2d'); symCx.font = '900 80px "JetBrains Mono"'; symCx.textAlign = 'center'
    symCx.fillStyle = '#fff'; symCx.fillText(symbol, 64, 85)
    const symSp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(symCv), transparent: true, opacity: 0.8 }))
    symSp.scale.set(25, 25, 1); symSp.position.set(0, 0, 0)
    labelGroup.add(symSp)

    // Content Name Label
    if (name) {
      const nameCv = document.createElement('canvas'); nameCv.width = 512; nameCv.height = 80
      const nameCx = nameCv.getContext('2d')

      // Bubble Background for readability in bright sky
      nameCx.fillStyle = 'rgba(0, 0, 0, 0.4)'
      nameCx.beginPath(); nameCx.roundRect(40, 5, 432, 70, 20); nameCx.fill()

      nameCx.font = '700 32px "JetBrains Mono"'; nameCx.textAlign = 'center'
      nameCx.fillStyle = '#fff'; nameCx.fillText(name.length > 25 ? name.slice(0, 23) + '..' : name, 256, 50)
      const nameSp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(nameCv), transparent: true, opacity: 0.6 }))
      nameSp.scale.set(120, 20, 1); nameSp.position.y = sz + 45
      labelGroup.add(nameSp)
      g.userData.titleLabel = nameSp
    }

    g.add(labelGroup)
    this.scene.add(g); this.nodes.push(g); return g
  }

  createConnections() {
    // 1. Atom Center Links
    this.atomConnections = new THREE.Group(); const ctr = this.nodes[0].position
    this.nodes.slice(1).forEach(n => {
      const t = n.position, cc = KIND_COLOR[n.userData.item.kind]
      const mid = ctr.clone().lerp(t, 0.5); mid.y += 40 + Math.random() * 60
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
      const target = isTree ? (n.userData.isCentral ? new THREE.Vector3(0, 0, 0) : n.userData.treePos) : n.userData.atomPos
      if (target) new TWEEN.Tween(n.position).to({ x: target.x, y: target.y, z: target.z }, 1800).easing(TWEEN.Easing.Cubic.InOut).start()
    })

    // Cinematic Camera Sequences
    if (isTree) {
      new TWEEN.Tween(this.camera.position).to({ x: 1200, y: 800, z: 1200 }, 2000).easing(TWEEN.Easing.Cubic.InOut).start()
      new TWEEN.Tween(this.controls.target).to({ x: 0, y: 700, z: 0 }, 2000).easing(TWEEN.Easing.Cubic.InOut).start()

      new TWEEN.Tween(this.sunLight).to({ intensity: 4 }, 1500).start()
      new TWEEN.Tween(this.scene.background).to({ r: 0.529, g: 0.808, b: 0.922 }, 1500).start() // Sky Blue
      new TWEEN.Tween(this.scene.fog).to({ near: 1500, far: 15000 }, 1500).start()
      this.cloudGroup.visible = true
    } else {
      new TWEEN.Tween(this.camera.position).to({ x: 0, y: 400, z: 1000 }, 1500).easing(TWEEN.Easing.Cubic.Out).start()
      new TWEEN.Tween(this.controls.target).to({ x: 0, y: 0, z: 0 }, 1500).start()

      new TWEEN.Tween(this.sunLight).to({ intensity: 0 }, 1000).start()
      new TWEEN.Tween(this.scene.background).to({ r: 0.007, g: 0.015, b: 0.031 }, 1000).start() // Reset to Space
      new TWEEN.Tween(this.scene.fog).to({ near: 100000, far: 200000 }, 1000).start()
      this.cloudGroup.visible = false
    }
  }

  focusOnNode(node) {
    const p = node.position.clone()
    // Offset camera target to the right (X+), keeping node on the Left-Half of viewport
    const offset = new THREE.Vector3(180, 0, 0)
    const isTree = this.layoutMode === 'arvore'
    const dist = isTree ? 600 : 450
    this.cameraGoal = p.clone().add(offset).add(this.camera.position.clone().sub(this.controls.target).normalize().multiplyScalar(dist))
    this.cameraTarget = p.clone().add(offset)
    this.transitioning = true
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
    this.nodes.forEach(n => {
      const s = n === sel
      n.traverse(c => {
        if (c.material) {
          c.material._os = c.material._os ?? c.material.opacity
          c.material.opacity = s ? c.material._os : c.material._os * 0.15
          if (c.material.emissiveIntensity) c.material.emissiveIntensity = s ? 5 : 0.5
        }
      })
    })

    if (!isTree) {
      this.nodes.slice(1).forEach(n => {
        if (n.userData.atomLink) {
          n.userData.atomLink.material.opacity = (n === sel) ? 1.0 : 0.03
          n.userData.atomLink.material.linewidth = (n === sel) ? 3 : 1
        }
      })
    } else {
      this.mergedBranches.material.opacity = 0.05; this.mergedFoliage.material.opacity = 0.2
      const range = this.foliageRanges.get(sel)
      if (range) {
        const colors = this.mergedFoliage.geometry.attributes.color.array
        for (let i = 0; i < colors.length / 3; i++) {
          const active = i >= range.start && i < (range.start + range.count)
          // Use Zelda Bright Green for active, muted dark for inactive
          const base = active ? [0.6, 1.0, 0.6] : [0.05, 0.15, 0.05]
          colors[i * 3] = base[0]; colors[i * 3 + 1] = base[1]; colors[i * 3 + 2] = base[2]
        }
        this.mergedFoliage.geometry.attributes.color.needsUpdate = true
      }
    }
    if (sel) {
      new TWEEN.Tween(sel.scale).to({ x: 1.5, y: 1.5, z: 1.5 }, 400).easing(TWEEN.Easing.Elastic.Out).start()
      if (sel.userData.titleLabel) {
        new TWEEN.Tween(sel.userData.titleLabel.material).to({ opacity: 1.0 }, 300).start()
      }
    }
  }

  restoreNodeVisibility() {
    this.nodes.forEach(n => {
      n.traverse(c => {
        if (c.material?._os !== undefined) c.material.opacity = c.material._os;
        if (c.material?.emissiveIntensity) c.material.emissiveIntensity = 2.0
      });
      new TWEEN.Tween(n.scale).to({ x: 1, y: 1, z: 1 }, 200).start()
      if (n.userData.titleLabel) n.userData.titleLabel.material.opacity = 0.6
    })
    if (this.mergedBranches) this.mergedBranches.material.opacity = 0.15
    if (this.mergedFoliage) {
      this.mergedFoliage.material.opacity = 0.7
      const colors = this.mergedFoliage.geometry.attributes.color.array
      for (let i = 0; i < colors.length / 3; i++) {
        // Zelda Base Green (Dark)
        colors[i * 3] = 0.1; colors[i * 3 + 1] = 0.35; colors[i * 3 + 2] = 0.15
      }
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

onResize() { const w = this.container.clientWidth, h = this.container.clientHeight; this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.renderer.setSize(w, h) }
onMouseMove(e) {
  if (this.readerActive) return
  const r = this.renderer.domElement.getBoundingClientRect()
  this.mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1; this.mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1
  this.raycaster.setFromCamera(this.mouse, this.camera)
  const hits = this.raycaster.intersectObjects(this.nodes, true)
  this.nodes.forEach(n => n.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1))
  if (hits.length) { document.body.style.cursor = 'pointer'; let t = hits[0].object; while (t.parent && !t.userData.item) t = t.parent; if (t.userData.item) t.scale.set(1.2, 1.2, 1.2) }
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
  if (this.transitioning) {
    this.camera.position.lerp(this.cameraGoal, 0.06)
    this.controls.target.lerp(this.cameraTarget, 0.06)
    if (this.camera.position.distanceTo(this.cameraGoal) < 0.5) this.transitioning = false
  }
  this.controls.update(); const t = performance.now() * 0.001

  if (!this.readerActive) {
    this.atomGroup.rotation.y = t * 0.015

    // Zelda Environment Animations
    if (this.layoutMode === 'arvore') {
      if (this.grassMesh) {
        this.grassMesh.rotation.z = Math.sin(t * 1.5) * 0.02
        this.grassMesh.rotation.x = Math.cos(t * 1.2) * 0.01
      }
      if (this.cloudGroup) {
        this.cloudGroup.children.forEach(c => {
          c.position.x += c.userData.speed
          if (c.position.x > 4000) c.position.x = -4000
        })
      }
      if (this.mergedFoliage) {
        this.mergedFoliage.material.opacity = 0.5 + Math.sin(t * 0.5) * 0.1
      }
    }

    this.nodes.forEach((n, i) => {
      if (i > 0 && !this.selected) {
        n.position.y += Math.sin(t * 0.8 + i) * 0.04
      }

      // Animate Atomic Orbits (Shells) - only in Atom mode or subtle
      n.userData.orbits?.forEach(r => {
        r.mesh.rotation.z += r.speed
        r.mesh.rotation.y += r.speed * 0.5
      })

      if (n.userData.glow) {
        const s = (n === this.selected) ? 1.2 : 1.0
        n.userData.glow.material.opacity = (0.4 + Math.sin(t * 2 + n.userData.pulsePhase) * 0.15) * s
      }

      // Selection Pulse for Connections
      if (n === this.selected && n.userData.atomLink) {
        const dash = (Math.sin(t * 5) + 1) * 0.5
        n.userData.atomLink.material.opacity = 0.5 + dash * 0.5
      }
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
