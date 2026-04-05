import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import TWEEN from '@tweenjs/tween.js'
import useStore from './store.js'

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
  grass: 0x76ff03, // Vibrant Lime
  rock: 0x37474f,  // Dark Slate
  sand: 0xf5f5dc,  // Sandy Beige
  wood: 0x4E342E,
  leaf_deep: 0x1B5E20,
  leaf_vibrant: 0x66BB6A,
  sun: 0xFFF9C4,
  flower: 0xff1744 // Red Flower
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
    this.keys = {}

    // Geometry/Material Cache for Performance
    this.geoCache = {}
    this.matCache = {}
    this.textureCache = {}
    this.lastMouseHit = null
    this.hoveredNode = null
    this.linksNeedUpdate = true
    this.linkUpdateCounter = 0

    // Structure Groups
    this.atomGroup = new THREE.Group()
    this.araucariaGroup = new THREE.Group()
    this.atomConnections = new THREE.Group()

    this.nodesGroup = new THREE.Group() // For collective movement/rotation
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
    this.initStoreSync()

    // Initial Hierarchy: nodesGroup starts in atomGroup
    this.atomGroup.add(this.nodesGroup)

    // Initial Visibility
    this.araucariaGroup.visible = this.layoutMode === 'arvore'
    this.atomGroup.visible = this.layoutMode === 'atomo'
    this.animate()
  }

  initStoreSync() {
    // Sync initial mode from store
    const initialMode = useStore.getState().visMode;
    if (initialMode !== this.layoutMode) {
      this.setLayout(initialMode);
    }

    // Subscribe to future mode changes
    let lastMode = initialMode;
    useStore.subscribe((state) => {
      if (state.visMode !== lastMode) {
        lastMode = state.visMode;
        this.setLayout(lastMode);
      }
    });
  }

  initScene() {
    this.container.innerHTML = '' // Fix legacy canvas overlap
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x020408)
    this.scene.fog = new THREE.Fog(0x87CEEB, 1500, 15000)
    // Initially hide fog
    this.scene.fog.near = 100000; this.scene.fog.far = 200000
    let w = this.container.clientWidth, h = this.container.clientHeight
    if (w < 100) w = window.innerWidth; // Fallback for hidden or initial zero-size
    if (h < 100) h = window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(60, w / h, 1, 20000)
    this.camera.position.set(0, 400, 1000)

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
    this.renderer.setClearColor(0x020408, 1)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    this.renderer.setSize(w, h)
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.shadowMap.enabled = false
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
    const N = 3000, pos = new Float32Array(N * 3), col = new Float32Array(N * 3) // Reduced from 5000 to 3000
    for (let i = 0; i < N; i++) {
      const r = 2000 + Math.random() * 4000, t = Math.random() * Math.PI * 2, p = Math.acos(2 * Math.random() - 1)
      pos[i * 3] = r * Math.sin(p) * Math.cos(t); pos[i * 3 + 1] = r * Math.sin(p) * Math.sin(t); pos[i * 3 + 2] = r * Math.cos(p)
      col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 0.5 + Math.random() * 0.5
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
    geo.computeBoundingSphere() // Optimize raycasting
    const stars = new THREE.Points(geo, new THREE.PointsMaterial({ size: 4, map: this.glowTex, transparent: true, vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false }))
    this.atomGroup.add(stars)
  }

  createNebula() {
    [0x0a1628, 0x120a30].forEach((c, i) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(1200 + i * 400, 16, 16), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.05, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false }))
      this.atomGroup.add(m)
    })
  }

  createAtomOrbits() {
    const radii = [300, 450, 600]
    radii.forEach((r, idx) => {
      const curve = new THREE.EllipseCurve(0, 0, r, r * 0.8, 0, Math.PI * 2)
      const points = curve.getPoints(50) // Reduced from 100 to 50
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

    const numClouds = 8 // Reduced from 12 to 8
    const cloudMat = new THREE.MeshToonMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 })
    // Cache cloud geometry
    const cloudGeo = new THREE.SphereGeometry(100, 6, 6) // Reduced segments from 8x8 to 6x6

    for (let i = 0; i < numClouds; i++) {
      const cloud = new THREE.Group()
      const x = (Math.random() - 0.5) * 8000
      const y = 2000 + Math.random() * 1000
      const z = (Math.random() - 0.5) * 8000
      cloud.position.set(x, y, z)

      const numBlobs = 2 + Math.floor(Math.random() * 2) // Reduced from 3-7 to 2-4
      for (let j = 0; j < numBlobs; j++) {
        const blob = new THREE.Mesh(cloudGeo, cloudMat)
        blob.position.set((j - numBlobs / 2) * 250, (Math.random() - 0.5) * 50, (Math.random() - 0.5) * 50)
        blob.scale.set(4, 0.2, 1.2) // Horizontal wispy look
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
      color: ZELDA_PALETTE.wood
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
        const pts = curve.getPoints(12) // Reduced from 24 to 12
        const bClr = tier === 0 ? [0, 0.8, 1] : [0, 0.66, 1]
        for (let i = 0; i < pts.length - 1; i++) {
          bPos.push(pts[i].x, pts[i].y, pts[i].z, pts[i + 1].x, pts[i + 1].y, pts[i + 1].z)
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
    const pMat = new THREE.MeshStandardMaterial({ vertexColors: true, emissive: 0x4caf50, emissiveIntensity: 0.2 })
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
    const points = curve.getPoints(10) // Reduced from 20 to 10
    points.forEach((p, i) => {
      if (i === 0) return
      const dir = p.clone().sub(points[i - 1]).normalize()
      const side1 = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize()
      const side2 = new THREE.Vector3().crossVectors(dir, side1).normalize()
      const l_mult = i / points.length
      const tier = this.getNodeTier({ stack: [] }) // Default check
      const d_mult = l_mult > 0.6 ? 6 : 3 // Reduced density
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

    // 1. Hilly Terrain (Subdivided Plane with Vertex Colors)
    const terrainSize = 10000, segments = 80
    const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, segments, segments)
    const pos = terrainGeo.attributes.position.array
    const colors = new Float32Array((segments + 1) * (segments + 1) * 3)
    const terrainGrassCol = new THREE.Color(ZELDA_PALETTE.grass), terrainSandCol = new THREE.Color(ZELDA_PALETTE.sand)

    for (let i = 0; i <= segments; i++) {
      for (let j = 0; j <= segments; j++) {
        const idx = (i * (segments + 1) + j) * 3
        const x = pos[idx], y = pos[idx + 1]
        const dist = Math.sqrt(x * x + y * y)

        // Path logic (S-Curve path)
        const pathX = Math.sin(y * 0.001) * 800
        const onPath = Math.abs(x - pathX) < 300

        if (onPath) {
          colors[idx] = terrainSandCol.r; colors[idx + 1] = terrainSandCol.g; colors[idx + 2] = terrainSandCol.b
        } else {
          colors[idx] = terrainGrassCol.r; colors[idx + 1] = terrainGrassCol.g; colors[idx + 2] = terrainGrassCol.b
        }

        // Hills
        if (dist < 4500) {
          pos[idx + 2] = (Math.sin(x * 0.002) * Math.cos(y * 0.002) * 200) + (Math.sin(x * 0.01) * 30)
        } else {
          pos[idx + 2] = -500
        }
      }
    }
    terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    terrainGeo.computeVertexNormals()

    const terrainMat = new THREE.MeshToonMaterial({ vertexColors: true })
    const terrain = new THREE.Mesh(terrainGeo, terrainMat)
    terrain.rotation.x = -Math.PI / 2
    terrain.position.y = -50
    baseGroup.add(terrain)

    // 2. Rocky Mesas (Canion Effect)
    const addMesa = (mx, mz, scale = 1) => {
      const h = 800 + Math.random() * 1200
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(400 * scale, 600 * scale, h, 8), new THREE.MeshToonMaterial({ color: ZELDA_PALETTE.rock }))
      mesh.position.set(mx, h / 2 - 50, mz); mesh.rotation.y = Math.random() * Math.PI
      baseGroup.add(mesh)
      // Green mossy top
      const top = new THREE.Mesh(new THREE.CircleGeometry(420 * scale, 8), new THREE.MeshToonMaterial({ color: ZELDA_PALETTE.grass }))
      top.position.set(mx, h - 45, mz); top.rotation.x = -Math.PI / 2
      baseGroup.add(top)
    }
    addMesa(3500, 2000, 1.5); addMesa(-3000, -1000, 2); addMesa(2000, -3500, 1.2); addMesa(-4000, 3000, 1.8)

    // 3. Wildflowers
    const fPos = [], fCol = []
    const fC = new THREE.Color(ZELDA_PALETTE.flower)
    for (let i = 0; i < 2000; i++) {
      const x = (Math.random() - 0.5) * 6000, z = (Math.random() - 0.5) * 6000
      const dist = Math.sqrt(x * x + z * z)
      if (dist < 3000 && Math.abs(x - Math.sin(z * 0.001) * 800) > 400) {
        fPos.push(x, 20, z)
        fCol.push(fC.r, fC.g, fC.b)
      }
    }
    const fGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(fPos), 3)).setAttribute('color', new THREE.BufferAttribute(new Float32Array(fCol), 3))
    const fDots = new THREE.Points(fGeo, new THREE.PointsMaterial({ size: 15, vertexColors: true, sizeAttenuation: true }))
    baseGroup.add(fDots)

    // 4. Grassy Clumps (Modified)
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
    const geoKey = `sphere-${sz}`
    const nucGeo = this.geoCache[geoKey] || (this.geoCache[geoKey] = new THREE.SphereGeometry(sz, 16, 16)) // Reduced segments from 32,24 to 16,16
    const matKey = `nuclear-${cc}-${isCentral}`
    const nucMat = this.matCache[matKey] || (this.matCache[matKey] = new THREE.MeshPhysicalMaterial({
      color: cc, emissive: cc, emissiveIntensity: isCentral ? 4 : 2,
      metalness: 0.9, roughness: 0.1, transmission: 0.5, thickness: 2, transparent: true
    }))
    const nucleus = new THREE.Mesh(nucGeo, nucMat)
    g.add(nucleus)

    // Core Glow
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: cc, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending }))
    glow.scale.set(sz * 8, sz * 8, 1); g.add(glow); g.userData.glow = glow

    // 2. Electron Shells (Sub-orbits)
    el.shells.forEach((count, sIdx) => {
      const orbitRadius = sz * (2.2 + sIdx * 1.2)
      const torusKey = `torus-${orbitRadius.toFixed(1)}`
      const orbitGeo = this.geoCache[torusKey] || (this.geoCache[torusKey] = new THREE.TorusGeometry(orbitRadius, 0.4, 16, 100))
      const orbitMatKey = `orbit-${cc}`
      const orbitMat = this.matCache[orbitMatKey] || (this.matCache[orbitMatKey] = new THREE.MeshBasicMaterial({ color: cc, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending }))
      const orbit = new THREE.Mesh(orbitGeo, orbitMat)

      // Random tilt for the shell
      orbit.rotation.x = Math.random() * Math.PI
      orbit.rotation.y = Math.random() * Math.PI
      g.add(orbit)

      const orbitObj = { mesh: orbit, speed: (0.008 / (sIdx + 1)) * (isCentral ? 2 : 1) }
      g.userData.orbits.push(orbitObj)

      // Electrons on this shell
      const eSize = isCentral ? 3 : 2
      const eGeoKey = `electron-${eSize}`
      const eGeo = this.geoCache[eGeoKey] || (this.geoCache[eGeoKey] = new THREE.SphereGeometry(eSize, 4, 4)) // Reduced from 8,8 to 4,4
      const eMatKey = `electron-${cc}`
      const eMat = this.matCache[eMatKey] || (this.matCache[eMatKey] = new THREE.MeshStandardMaterial({ color: cc, emissive: cc, emissiveIntensity: 5 }))
      for (let e = 0; e < count; e++) {
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

    // Atomic Symbol Label - Cache texture
    const symTexKey = `symbol-${symbol}`
    const symTex = this.textureCache[symTexKey] || (() => {
      const cv = document.createElement('canvas'); cv.width = 128; cv.height = 128
      const cx = cv.getContext('2d'); cx.font = '900 80px "JetBrains Mono"'; cx.textAlign = 'center'
      cx.fillStyle = '#fff'; cx.fillText(symbol, 64, 85)
      return this.textureCache[symTexKey] = new THREE.CanvasTexture(cv)
    })()
    const symMatKey = `symbol-mat-${symbol}`
    const symMat = this.matCache[symMatKey] || (this.matCache[symMatKey] = new THREE.SpriteMaterial({ map: symTex, transparent: true, opacity: 0.8 }))
    const symSp = new THREE.Sprite(symMat)
    symSp.scale.set(25, 25, 1); symSp.position.set(0, 0, 0)
    labelGroup.add(symSp)

    // Content Name Label
    if (name) {
      const nameTexKey = `name-${name}`
      const nameTex = this.textureCache[nameTexKey] || (() => {
        const cv = document.createElement('canvas'); cv.width = 512; cv.height = 80
        const cx = cv.getContext('2d')
        cx.fillStyle = 'rgba(0, 0, 0, 0.4)'
        cx.beginPath(); cx.roundRect(40, 5, 432, 70, 20); cx.fill()
        cx.font = '700 32px "JetBrains Mono"'; cx.textAlign = 'center'
        cx.fillStyle = '#fff'; cx.fillText(name.length > 25 ? name.slice(0, 23) + '..' : name, 256, 50)
        return this.textureCache[nameTexKey] = new THREE.CanvasTexture(cv)
      })()
      const nameMatKey = `name-mat`
      const nameMat = this.matCache[nameMatKey] || (this.matCache[nameMatKey] = new THREE.SpriteMaterial({ transparent: true, opacity: 0.6 }))
      nameMat.map = nameTex
      const nameSp = new THREE.Sprite(nameMat)
      nameSp.scale.set(120, 20, 1); nameSp.position.y = sz + 45
      labelGroup.add(nameSp)
      g.userData.titleLabel = nameSp
    }

    g.add(labelGroup)
    this.nodesGroup.add(g); this.nodes.push(g); return g
  }

  createConnections() {
    // 1. Atom Center Links
    const ctr = this.nodes[0].position
    this.nodes.slice(1).forEach(n => {
      const t = n.position, cc = KIND_COLOR[n.userData.item.kind]
      const mid = ctr.clone().lerp(t, 0.5); mid.y += 40 + Math.random() * 60
      const curve = new THREE.QuadraticBezierCurve3(ctr.clone(), mid, t.clone())
      const link = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(24)), new THREE.LineBasicMaterial({ color: cc, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending }))
      n.userData.atomLink = link; n.userData.atomCurve = curve
      this.atomConnections.add(link)
    })
    this.atomGroup.add(this.atomConnections)
  }

  updateAtomLinks() {
    if (!this.nodes[0] || this.layoutMode === 'arvore') return // Skip in tree mode
    // Only update every 5 frames to reduce load
    if (this.linkUpdateCounter++ % 5 !== 0) return

    const ctr = this.nodes[0].position
    const midVec = new THREE.Vector3() // Reuse vector
    this.nodes.slice(1).forEach(n => {
      if (n.userData.atomLink && n.userData.atomCurve) {
        const t = n.position
        midVec.copy(ctr).lerp(t, 0.5); midVec.y += 50
        n.userData.atomCurve.v0.copy(ctr); n.userData.atomCurve.v1.copy(midVec); n.userData.atomCurve.v2.copy(t)
        n.userData.atomLink.geometry.setFromPoints(n.userData.atomCurve.getPoints(12)) // Reduced from 24 to 12 points
      }
    })
  }

  setLayout(mode) {
    if (this.layoutMode === mode && this.transitioning) return
    this.layoutMode = mode; const isTree = mode === 'arvore'
    
    // Sync store if changed locally
    if (useStore.getState().visMode !== mode) {
      useStore.getState().setVisMode(mode);
    }
    this.atomGroup.visible = !isTree; this.araucariaGroup.visible = isTree
    this.transitioning = true

    // Node Transitions
    this.nodes.forEach(n => {
      const target = isTree ? (n.userData.isCentral ? new THREE.Vector3(0, 0, 0) : n.userData.treePos) : n.userData.atomPos
      if (target) new TWEEN.Tween(n.position).to({ x: target.x, y: target.y, z: target.z }, 1800).easing(TWEEN.Easing.Cubic.InOut).start()
    })

    // Hierarchy Re-parenting
    if (isTree) {
      this.scene.attach(this.nodesGroup)
      // Start Above Tree
      new TWEEN.Tween(this.camera.position).to({ x: 0, y: 1800, z: 2200 }, 2000).easing(TWEEN.Easing.Cubic.Out).onComplete(() => { this.transitioning = false }).start()
      new TWEEN.Tween(this.controls.target).to({ x: 0, y: 1200, z: 0 }, 2000).start()

      // Zelda Environment Active
      new TWEEN.Tween(this.sunLight).to({ intensity: 4 }, 1500).start()
      new TWEEN.Tween(this.scene.background).to({ r: 0.529, g: 0.808, b: 0.922 }, 1500).start() // Sky Blue
      new TWEEN.Tween(this.scene.fog).to({ near: 1500, far: 15000 }, 1500).start()
      this.cloudGroup.visible = true
    } else {
      this.atomGroup.attach(this.nodesGroup)
      // Space Reset
      new TWEEN.Tween(this.camera.position).to({ x: 0, y: 400, z: 1200 }, 1500).easing(TWEEN.Easing.Cubic.Out).onComplete(() => { this.transitioning = false }).start()
      new TWEEN.Tween(this.controls.target).to({ x: 0, y: 0, z: 0 }, 1500).start()

      new TWEEN.Tween(this.sunLight).to({ intensity: 0 }, 1000).start()
      new TWEEN.Tween(this.scene.background).to({ r: 0.007, g: 0.015, b: 0.031 }, 1000).start() // Space
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
    const goal = p.clone().add(offset).add(this.camera.position.clone().sub(this.controls.target).normalize().multiplyScalar(dist))
    const tgt = p.clone().add(offset)
    new TWEEN.Tween(this.camera.position).to({ x: goal.x, y: goal.y, z: goal.z }, 1000).easing(TWEEN.Easing.Cubic.Out).start()
    new TWEEN.Tween(this.controls.target).to({ x: tgt.x, y: tgt.y, z: tgt.z }, 1000).start()
  }
  deselectNode() { this.selected = null; this.controls.autoRotate = true; this.restoreNodeVisibility(); this.resetCameraFocus(); if (window.hideIntelligencePanel) window.hideIntelligencePanel() }
  resetCameraFocus() {
    const isTree = this.layoutMode === 'arvore'
    const goal = isTree ? new THREE.Vector3(2200, 1500, 2200) : new THREE.Vector3(0, 400, 1000)
    const tgt = isTree ? new THREE.Vector3(0, 500, 0) : new THREE.Vector3(0, 0, 0)
    new TWEEN.Tween(this.camera.position).to({ x: goal.x, y: goal.y, z: goal.z }, 1000).easing(TWEEN.Easing.Cubic.Out).start()
    new TWEEN.Tween(this.controls.target).to({ x: tgt.x, y: tgt.y, z: tgt.z }, 1000).start()
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
    window.addEventListener('keydown', e => {
      this.keys[e.code] = true
      if (e.key === 'Escape') this.selected ? this.deselectNode() : (this.readerActive && this.exitReader())
    })
    window.addEventListener('keyup', e => { this.keys[e.code] = false })

    this.renderer.domElement.addEventListener('mousemove', e => this.onMouseMove(e))
    this.renderer.domElement.addEventListener('click', () => this.onClick())
  }

  updateCameraMovement() {
    const moveSpeed = 20
    const vector = new THREE.Vector3()
    const dir = new THREE.Vector3()
    this.camera.getWorldDirection(dir)
    dir.y = 0; dir.normalize() // Keep it horizontal

    const side = new THREE.Vector3().crossVectors(this.camera.up, dir).negate().normalize()

    if (this.keys['KeyW'] || this.keys['ArrowUp']) vector.add(dir)
    if (this.keys['KeyS'] || this.keys['ArrowDown']) vector.sub(dir)
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) vector.sub(side)
    if (this.keys['KeyD'] || this.keys['ArrowRight']) vector.add(side)
    if (this.keys['ControlLeft'] || this.keys['ControlRight'] || this.keys['KeyC']) vector.y -= 1
    if (this.keys['Space']) vector.y += 1

    if (vector.lengthSq() > 0) {
      vector.normalize().multiplyScalar(moveSpeed)
      this.camera.position.add(vector)
      this.controls.target.add(vector)
      // Stop auto-rotation if the user moves
      if (this.controls.autoRotate) this.controls.autoRotate = false
    }
  }

  onResize() { const w = this.container.clientWidth, h = this.container.clientHeight; this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.renderer.setSize(w, h) }
  onMouseMove(e) {
    if (this.readerActive) return
    const r = this.renderer.domElement.getBoundingClientRect()
    this.mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1; this.mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1
    this.raycaster.setFromCamera(this.mouse, this.camera)
    const hits = this.raycaster.intersectObjects(this.nodes, true)

    // Only update scales if hit changed
    if (this.lastMouseHit !== (hits.length ? hits[0].object : null)) {
      // Reset previous hover
      if (this.hoveredNode) this.hoveredNode.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1)

      // Set new hover
      if (hits.length) {
        document.body.style.cursor = 'pointer'
        let t = hits[0].object
        while (t.parent && !t.userData.item) t = t.parent
        if (t.userData.item) {
          this.hoveredNode = t
          t.scale.set(1.2, 1.2, 1.2)
          this.lastMouseHit = hits[0].object
        }
      } else {
        document.body.style.cursor = 'default'
        this.hoveredNode = null
        this.lastMouseHit = null
      }
    }
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
    requestAnimationFrame(() => this.animate())
    TWEEN.update()
    const t = performance.now() * 0.001

    if (this.layoutMode === 'arvore' && !this.readerActive) {
      this.updateCameraMovement()
    }

    if (this.controls) this.controls.update()

    if (!this.readerActive) {
      this.atomGroup.rotation.y = t * 0.015
      this.atomGroup.rotation.z = t * 0.005
      this.updateAtomLinks() // Keep connections glued

      // Optimize: Only animate orbits and other static elements if in atom view
      if (this.layoutMode === 'atomo') {
        const sin_t_0_1 = Math.sin(t * 0.1); const cos_t_0_1 = Math.cos(t * 0.1)
        // Precalculate orbit rotation values (sin/cos expensive)
        for (let i = 0; i < 3; i++) {
          const orb = this.atomGroup.children[i]
          if (orb?.rotation !== undefined) orb.rotation.y = t * (0.1 + i * 0.02)
        }
      } else if (this.layoutMode === 'arvore') {
        // Zelda Environment Animations
        if (this.grassMesh) {
          const sinV = Math.sin(t * 1.5)
          const cosV = Math.cos(t * 1.2)
          this.grassMesh.rotation.z = sinV * 0.02
          this.grassMesh.rotation.x = cosV * 0.01
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

      // Only animate nodes not selected (or update selection glow)
      const sinT2 = Math.sin(t * 2)
      const sinT5 = Math.sin(t * 5)
      this.nodes.forEach((n, i) => {
        if (i > 0 && !this.selected) {
          n.position.y += Math.sin(t * 0.8 + i) * 0.04
        }

        // Animate Atomic Orbits (Shells)
        n.userData.orbits?.forEach(r => {
          r.mesh.rotation.z += r.speed
          r.mesh.rotation.y += r.speed * 0.5
        })

        if (n.userData.glow) {
          const s = (n === this.selected) ? 1.2 : 1.0
          n.userData.glow.material.opacity = (0.4 + sinT2 + n.userData.pulsePhase * 0.15) * s
        }

        // Selection Pulse for Connections
        if (n === this.selected && n.userData.atomLink) {
          const dash = (sinT5 + 1) * 0.5
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

  document.querySelector('[data-panel-close]')?.addEventListener('click', () => window.projectMap?.deselectNode())

  const params = new URLSearchParams(window.location.search), sid = params.get('select')
  if (sid) {
    setTimeout(() => {
      const n = window.projectMap.nodes.find(v => v.userData.item?.id === sid)
      if (n) window.projectMap.handleNodeClick(n)
    }, 800)
  }
})
