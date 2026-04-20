import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import TWEEN from '@tweenjs/tween.js'
import useStore from './store.js'
const KIND_COLOR = {
post: 0x00C2FF, project: 0x7C5CFF, document: 0x10B981, central: 0xFFFFFF,
}
const KIND_HEX = {
post: '#00C2FF', project: '#7C5CFF', document: '#10B981', central: '#FFFFFF',
}
const ZELDA_PALETTE = {
sky: 0x87CEEB,
grass: 0x76ff03,
rock: 0x37474f,
sand: 0xf5f5dc,
wood: 0x4E342E,
leaf_deep: 0x1B5E20,
leaf_vibrant: 0x66BB6A,
sun: 0xFFF9C4,
flower: 0xff1744
}
let KIND_LABEL = {
post: 'Publicação', project: 'Projeto', document: 'Documento',
}
const PERIODIC_TABLE = [
{ symbol: 'H', name: 'Hidrogênio', shells: [1], color: 0x00C2FF },
{ symbol: 'He', name: 'Hélio', shells: [2], color: 0xFFD700 },
{ symbol: 'Li', name: 'Lítio', shells: [2, 1], color: 0xFF4500 },
{ symbol: 'Be', name: 'Berílio', shells: [2, 2], color: 0x32CD32 },
{ symbol: 'B', name: 'Boro', shells: [2, 3], color: 0x8B4513 },
{ symbol: 'C', name: 'Carbono', shells: [2, 4], color: 0xAAAAAA },
{ symbol: 'N', name: 'Nitrogênio', shells: [2, 5], color: 0x4169E1 },
{ symbol: 'O', name: 'Oxigênio', shells: [2, 6], color: 0xFFffff },
{ symbol: 'F', name: 'Flúor', shells: [2, 7], color: 0xDA70D6 },
{ symbol: 'Ne', name: 'Neônio', shells: [2, 8], color: 0xFF00FF },
{ symbol: 'Na', name: 'Sódio', shells: [2, 8, 1], color: 0xFF8C00 },
{ symbol: 'Mg', name: 'Magnésio', shells: [2, 8, 2], color: 0x556B2F },
{ symbol: 'Al', name: 'Alumínio', shells: [2, 8, 3], color: 0xBDB76B },
{ symbol: 'Si', name: 'Silício', shells: [2, 8, 4], color: 0x708090 },
{ symbol: 'P', name: 'Fósforo', shells: [2, 8, 5], color: 0xFFA07A },
{ symbol: 'S', name: 'Enxofre', shells: [2, 8, 6], color: 0xFFFF00 },
{ symbol: 'Cl', name: 'Cloro', shells: [2, 8, 7], color: 0x00FF00 },
{ symbol: 'Ar', name: 'Argônio', shells: [2, 8, 8], color: 0x00FFFF },
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
function getLocalizedElement(i, loc) {
const item = PERIODIC_TABLE[i % PERIODIC_TABLE.length];
if (!loc) return item;
const key = `elements.${item.symbol.toLowerCase()}`;
return { ...item, name: loc.translate(key, item.name) };
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
this.glowTex = createGlowTexture(256); this.readerActive = false
this.keys = {}
this.geoCache = {}
this.matCache = {}
this.textureCache = {}
this.lastMouseHit = null
this.hoveredNode = null
this.linksNeedUpdate = true
this.linkUpdateCounter = 0
this.atomGroup = new THREE.Group()
this.atomConnections = new THREE.Group()
this.nodesGroup = new THREE.Group()
this.initScene()
this.createStarfield()
this.createNebula()
this.createAtomOrbits()
this.createNodes()
this.createConnections()
this.createClouds()
this.buildReaderDOM()
this.addEventHandlers()
this.loc = null;
this.initStoreSync()
this.atomGroup.add(this.nodesGroup)
this.animate()
}
initStoreSync() {
let lastLocale = useStore.getState().locale;
useStore.subscribe((state) => {
if (state.locale !== lastLocale) {
lastLocale = state.locale;
this.updateLabelsForLocale();
}
});
this.updateLabelsForLocale();
}
updateLabelsForLocale() {
if (!this.loc) return;
KIND_LABEL.post = this.loc.translate('kinds.post', 'Publicação');
KIND_LABEL.project = this.loc.translate('kinds.project', 'Projeto');
KIND_LABEL.document = this.loc.translate('kinds.document', 'Documento');
this.nodes.forEach((n, i) => {
if (n.userData.kind === 'central') return;
const elem = getLocalizedElement(i, this.loc);
n.userData.elementName = elem.name;
});
if (this.selected) {
}
}
initScene() {
this.container.innerHTML = ''
this.scene = new THREE.Scene()
this.scene.background = new THREE.Color(0x020408)
this.scene.fog = new THREE.Fog(0x87CEEB, 1500, 15000)
this.scene.fog.near = 100000; this.scene.fog.far = 200000
let w = this.container.clientWidth, h = this.container.clientHeight
if (w < 100) w = window.innerWidth;
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
this.controls.addEventListener('start', () => {
this.controls.autoRotate = false
})
this.scene.add(new THREE.AmbientLight(0x404040, 1.2))
const p1 = new THREE.PointLight(0x00C2FF, 3, 2000); p1.position.set(500, 500, 500); this.scene.add(p1)
const p2 = new THREE.PointLight(0x7C5CFF, 2, 1500); p2.position.set(-500, -200, 0); this.scene.add(p2)
this.scene.add(this.atomGroup)
this.sunLight = new THREE.DirectionalLight(ZELDA_PALETTE.sun, 0)
this.sunLight.position.set(1000, 2000, 1000)
this.scene.add(this.sunLight)
this.scene.add(this.sunLight.target)
this.pedestalLight = new THREE.PointLight(0x00C2FF, 0, 1000)
this.pedestalLight.position.set(0, 500, 0)
this.scene.add(this.pedestalLight)
this.raycaster = new THREE.Raycaster(); this.mouse = new THREE.Vector2()
}
createStarfield() {
const N = 3000, pos = new Float32Array(N * 3), col = new Float32Array(N * 3)
for (let i = 0; i < N; i++) {
const r = 2000 + Math.random() * 4000, t = Math.random() * Math.PI * 2, p = Math.acos(2 * Math.random() - 1)
pos[i * 3] = r * Math.sin(p) * Math.cos(t); pos[i * 3 + 1] = r * Math.sin(p) * Math.sin(t); pos[i * 3 + 2] = r * Math.cos(p)
col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 0.5 + Math.random() * 0.5
}
const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
geo.computeBoundingSphere()
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
const points = curve.getPoints(50)
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
const numClouds = 8
const cloudMat = new THREE.MeshToonMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 })
const cloudGeo = new THREE.SphereGeometry(100, 6, 6)
for (let i = 0; i < numClouds; i++) {
const cloud = new THREE.Group()
const x = (Math.random() - 0.5) * 8000
const y = 2000 + Math.random() * 1000
const z = (Math.random() - 0.5) * 8000
cloud.position.set(x, y, z)
const numBlobs = 2 + Math.floor(Math.random() * 2)
for (let j = 0; j < numBlobs; j++) {
const blob = new THREE.Mesh(cloudGeo, cloudMat)
blob.position.set((j - numBlobs / 2) * 250, (Math.random() - 0.5) * 50, (Math.random() - 0.5) * 50)
blob.scale.set(4, 0.2, 1.2)
cloud.add(blob)
}
cloud.userData.speed = 0.5 + Math.random() * 1.5
this.cloudGroup.add(cloud)
}
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
const sz = isCentral ? 22 : 14
const geoKey = `sphere-${sz}`
const nucGeo = this.geoCache[geoKey] || (this.geoCache[geoKey] = new THREE.SphereGeometry(sz, 16, 16))
const matKey = `nuclear-${cc}-${isCentral}`
const nucMat = this.matCache[matKey] || (this.matCache[matKey] = new THREE.MeshPhysicalMaterial({
color: cc, emissive: cc, emissiveIntensity: isCentral ? 4 : 2,
metalness: 0.9, roughness: 0.1, transmission: 0.5, thickness: 2, transparent: true
}))
const nucleus = new THREE.Mesh(nucGeo, nucMat)
g.add(nucleus)
const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: cc, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending }))
glow.scale.set(sz * 8, sz * 8, 1); g.add(glow); g.userData.glow = glow
el.shells.forEach((count, sIdx) => {
const orbitRadius = sz * (2.2 + sIdx * 1.2)
const torusKey = `torus-${orbitRadius.toFixed(1)}`
const orbitGeo = this.geoCache[torusKey] || (this.geoCache[torusKey] = new THREE.TorusGeometry(orbitRadius, 0.4, 16, 100))
const orbitMatKey = `orbit-${cc}`
const orbitMat = this.matCache[orbitMatKey] || (this.matCache[orbitMatKey] = new THREE.MeshBasicMaterial({ color: cc, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending }))
const orbit = new THREE.Mesh(orbitGeo, orbitMat)
orbit.rotation.x = Math.random() * Math.PI
orbit.rotation.y = Math.random() * Math.PI
g.add(orbit)
const orbitObj = { mesh: orbit, speed: (0.008 / (sIdx + 1)) * (isCentral ? 2 : 1) }
g.userData.orbits.push(orbitObj)
const eSize = isCentral ? 3 : 2
const eGeoKey = `electron-${eSize}`
const eGeo = this.geoCache[eGeoKey] || (this.geoCache[eGeoKey] = new THREE.SphereGeometry(eSize, 4, 4))
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
const name = (item.name || item.title || '').toUpperCase()
const symbol = el.symbol.toUpperCase()
const labelGroup = new THREE.Group()
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
const nameMat = new THREE.SpriteMaterial({ map: nameTex, transparent: true, opacity: 0.6 })
const nameSp = new THREE.Sprite(nameMat)
nameSp.scale.set(120, 20, 1); nameSp.position.y = sz + 45
labelGroup.add(nameSp)
g.userData.titleLabel = nameSp
}
g.add(labelGroup)
this.nodesGroup.add(g); this.nodes.push(g); return g
}
createConnections() {
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
if (!this.nodes[0]) return
if (this.linkUpdateCounter++ % 5 !== 0) return
const ctr = this.nodes[0].position
const midVec = new THREE.Vector3()
this.nodes.slice(1).forEach(n => {
if (n.userData.atomLink && n.userData.atomCurve) {
const t = n.position
midVec.copy(ctr).lerp(t, 0.5); midVec.y += 50
n.userData.atomCurve.v0.copy(ctr); n.userData.atomCurve.v1.copy(midVec); n.userData.atomCurve.v2.copy(t)
n.userData.atomLink.geometry.setFromPoints(n.userData.atomCurve.getPoints(12))
}
})
}
focusOnNode(node) {
const p = node.position.clone()
const offset = new THREE.Vector3(180, 0, 0)
const dist = 450
const goal = p.clone().add(offset).add(this.camera.position.clone().sub(this.controls.target).normalize().multiplyScalar(dist))
const tgt = p.clone().add(offset)
new TWEEN.Tween(this.camera.position).to({ x: goal.x, y: goal.y, z: goal.z }, 1000).easing(TWEEN.Easing.Cubic.Out).start()
new TWEEN.Tween(this.controls.target).to({ x: tgt.x, y: tgt.y, z: tgt.z }, 1000).start()
}
deselectNode() { this.selected = null; this.controls.autoRotate = true; this.restoreNodeVisibility(); this.resetCameraFocus(); if (window.hideIntelligencePanel) window.hideIntelligencePanel() }
resetCameraFocus() {
new TWEEN.Tween(this.camera.position).to({ x: 0, y: 400, z: 1000 }, 1000).easing(TWEEN.Easing.Cubic.Out).start()
new TWEEN.Tween(this.controls.target).to({ x: 0, y: 0, z: 0 }, 1000).start()
}
highlightNode(sel) {
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
this.nodes.slice(1).forEach(n => {
if (n.userData.atomLink) {
n.userData.atomLink.material.opacity = (n === sel) ? 1.0 : 0.03
n.userData.atomLink.material.linewidth = (n === sel) ? 3 : 1
}
})
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
this.nodes.slice(1).forEach(n => { if (n.userData.atomLink) n.userData.atomLink.material.opacity = 0.15 })
}
buildReaderDOM() {
this.readerEl = document.createElement('div'); this.readerEl.className = 'reader-article'
this.readerEl.innerHTML = `<header class="reader-article-bar"><div class="reader-article-bar-left"><button class="reader-article-back" data-r-close><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>Voltar</button></div><div class="reader-article-bar-center"><span class="reader-article-kind" data-r-kind></span><span class="reader-article-bar-title" data-r-bar-title></span></div><div class="reader-article-bar-right"><a class="reader-article-link" data-r-fullpage href="#" target="_blank">Página completa</a></div></header><main class="reader-article-body"><article class="reader-article-content prose" data-r-content></article></main>`
this.container.appendChild(this.readerEl); this.readerEl.querySelector('[data-r-close]').onclick = () => this.exitReader()
}
enterReader(item) {
this.readerActive = true; this.atomGroup.visible = false; this.nodes.forEach(n => n.visible = false)
this.controls.autoRotate = false; this.controls.enabled = false; if (window.hideIntelligencePanel) window.hideIntelligencePanel(); this.readerEl.classList.add('open')
const cnt = this.readerEl.querySelector('[data-r-content]')
cnt.innerHTML = `<h1>${esc(item.name || item.title)}</h1><div class="reader-article-divider"></div><section>${item.body_html || item.summary}</section>`
}
exitReader() {
this.readerActive = false; this.readerEl.classList.remove('open'); this.nodes.forEach(n => n.visible = true)
this.atomGroup.visible = true
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
dir.y = 0; dir.normalize()
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
if (this.lastMouseHit !== (hits.length ? hits[0].object : null)) {
if (this.hoveredNode) this.hoveredNode.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1)
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
if (this.controls) this.controls.update()
if (!this.readerActive) {
this.atomGroup.rotation.y = t * 0.015
this.atomGroup.rotation.z = t * 0.005
this.updateAtomLinks()
for (let i = 0; i < 3; i++) {
const orb = this.atomGroup.children[i]
if (orb?.rotation !== undefined) orb.rotation.y = t * (0.1 + i * 0.02)
}
const sinT2 = Math.sin(t * 2)
const sinT5 = Math.sin(t * 5)
this.nodes.forEach((n, i) => {
if (i > 0 && !this.selected) {
n.position.y += Math.sin(t * 0.8 + i) * 0.04
}
n.userData.orbits?.forEach(r => {
r.mesh.rotation.z += r.speed
r.mesh.rotation.y += r.speed * 0.5
})
if (n.userData.glow) {
const s = (n === this.selected) ? 1.2 : 1.0
n.userData.glow.material.opacity = (0.4 + sinT2 + n.userData.pulsePhase * 0.15) * s
}
if (n === this.selected && n.userData.atomLink) {
const dash = (sinT5 + 1) * 0.5
n.userData.atomLink.material.opacity = 0.5 + dash * 0.5
}
})
}
this.renderer.render(this.scene, this.camera)
}
}
window.initKnowledgeGraph = (loc) => {
const container = document.querySelector('[data-project-flow]'), jsonEl = document.getElementById('projects-data')
if (!container || !jsonEl) return
const data = JSON.parse(jsonEl.textContent)
window.projectMap = new ProjectMap3D(container, data)
window.projectMap.loc = loc
window.projectMap.updateLabelsForLocale()
document.querySelector('[data-panel-close]')?.addEventListener('click', () => window.projectMap?.deselectNode())
const params = new URLSearchParams(window.location.search), sid = params.get('select')
if (sid) {
setTimeout(() => {
const n = window.projectMap.nodes.find(v => v.userData.item?.id === sid)
if (n) window.projectMap.handleNodeClick(n)
}, 800)
}
}