;(function () {
'use strict'
const lerp = (a, b, t) => a + (b - a) * t
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const easeOut3 = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3)
function clipText(ctx, text, maxW) {
if (ctx.measureText(text).width <= maxW) return text
let t = text
while (t.length > 0 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1)
return t + '…'
}
function roundRect(ctx, x, y, w, h, r) {
ctx.beginPath()
ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y)
ctx.arcTo(x + w, y, x + w, y + r, r); ctx.lineTo(x + w, y + h - r)
ctx.arcTo(x + w, y + h, x + w - r, y + h, r); ctx.lineTo(x + r, y + h)
ctx.arcTo(x, y + h, x, y + h - r, r); ctx.lineTo(x, y + r)
ctx.arcTo(x, y, x + r, y, r); ctx.closePath()
}
const KIND_COLOR = {
post: '#00C2FF',
project: '#7C5CFF',
document: '#10b981',
home: '#f59e0b',
about: '#f59e0b',
}
function hexRgb(hex) {
const r = parseInt(hex.slice(1, 3), 16)
const g = parseInt(hex.slice(3, 5), 16)
const b = parseInt(hex.slice(5, 7), 16)
return `${r},${g},${b}`
}
function extractDate(item) {
const url = item.url || ''
const m8 = url.match(/\/(\d{8})-/)
if (m8) {
const s = m8[1]
return new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`)
}
const m = url.match(/\/(\d{4})-(\d{2})-(\d{2})/)
if (m) return new Date(`${m[1]}-${m[2]}-${m[3]}`)
return new Date(0)
}
function buildBST(items, start, end, parent) {
if (start > end) return null
const mid = Math.floor((start + end) / 2)
const node = {
data: items[mid],
left: null, right: null, parent,
x: 0, y: 0, tx: 0, ty: 0,
alpha: 0, drawScale: 0.8,
glow: 0, glowV: 0,
hover: false, selected: false, current: false,
revealed: false, revealDelay: 0, revealT: 0,
}
node.left = buildBST(items, start, mid - 1, node)
node.right = buildBST(items, mid + 1, end, node)
return node
}
function collectNodes(root) {
const arr = []
const q = [root]
while (q.length) {
const n = q.shift()
if (!n) continue
arr.push(n)
q.push(n.left, n.right)
}
return arr.filter(Boolean)
}
const NODE_W = 186, NODE_H = 68, LEVEL_GAP = 108
function layoutTree(root, W, H) {
if (!root) return
const levels = []
const queue = [[root, 0]]
while (queue.length) {
const [node, lv] = queue.shift()
if (!node) continue
if (!levels[lv]) levels[lv] = []
levels[lv].push(node)
if (node.left) queue.push([node.left, lv + 1])
if (node.right) queue.push([node.right, lv + 1])
}
const totalH = levels.length * LEVEL_GAP
const startY = Math.max(40, (H - totalH) / 2)
const MAX_W = W - 40
levels.forEach((lvNodes, li) => {
const count = lvNodes.length
const usableW = Math.min(count * (NODE_W + 16), MAX_W)
const spacing = count > 1 ? usableW / (count - 1) : 0
const startX = (W - usableW) / 2
lvNodes.forEach((node, ni) => {
node.tx = count === 1 ? W / 2 : startX + ni * spacing
node.ty = startY + li * LEVEL_GAP
})
})
}
function drawNode(ctx, node, t) {
if (node.alpha < 0.01) return
const color = KIND_COLOR[node.data.kind] || '#9DA7B3'
const rgb = hexRgb(color)
ctx.save()
ctx.globalAlpha = node.alpha
ctx.translate(node.x, node.y)
ctx.scale(node.drawScale, node.drawScale)
const hw = NODE_W / 2, hh = NODE_H / 2
if (node.glow > 0.02) {
const g = ctx.createRadialGradient(0, 0, 0, 0, 0, hw * 1.5)
g.addColorStop(0, `rgba(${rgb},${node.glow * 0.22})`)
g.addColorStop(1, `rgba(${rgb},0)`)
ctx.fillStyle = g
ctx.fillRect(-hw * 1.6, -hh * 1.6, NODE_W * 1.6, NODE_H * 1.6)
}
roundRect(ctx, -hw, -hh, NODE_W, NODE_H, 6)
ctx.fillStyle = node.current ? 'hsla(220,18%,15%,0.98)' : 'hsla(220,18%,9%,0.97)'
ctx.fill()
const borderA = node.current ? 0.85 : node.selected ? 0.7 : node.hover ? 0.5 : 0.2
ctx.strokeStyle = `rgba(${rgb},${borderA})`
ctx.lineWidth = node.current ? 1.8 : 1
ctx.stroke()
roundRect(ctx, -hw, -hh, 3, NODE_H, 2)
ctx.fillStyle = color
ctx.fill()
ctx.font = '600 8px Inter,system-ui,sans-serif'
ctx.fillStyle = color
ctx.textBaseline = 'top'
ctx.textAlign = 'left'
ctx.fillText((node.data.kind || 'item').toUpperCase(), -hw + 10, -hh + 8)
ctx.font = `${node.current ? '700' : '500'} 11px Inter,system-ui,sans-serif`
ctx.fillStyle = `rgba(230,237,243,${node.alpha})`
ctx.fillText(clipText(ctx, node.data.title || '', NODE_W - 26), -hw + 10, -hh + 22)
const snippet = (node.data.summary || '').slice(0, 64)
ctx.font = '400 9px Inter,system-ui,sans-serif'
ctx.fillStyle = `rgba(157,167,179,${node.alpha * 0.8})`
ctx.fillText(clipText(ctx, snippet, NODE_W - 26), -hw + 10, -hh + 38)
if (node.current) {
const pulse = Math.sin(t * 2.5) * 0.5 + 0.5
ctx.beginPath()
ctx.arc(hw - 12, 0, 3 + pulse * 2.5, 0, Math.PI * 2)
ctx.fillStyle = `rgba(${rgb},${0.65 + pulse * 0.35})`
ctx.fill()
}
ctx.textAlign = 'left'
ctx.restore()
}
function drawConnection(ctx, parent, child) {
if (!parent || !child) return
const color = KIND_COLOR[child.data.kind] || '#64748b'
const isActive = child.selected || child.current || parent.selected || parent.current
const alpha = isActive ? 0.45 : Math.min(parent.alpha, child.alpha) * 0.15
const py = parent.y + (NODE_H / 2) * parent.drawScale
const cy = child.y - (NODE_H / 2) * child.drawScale
const midY = (py + cy) / 2
ctx.beginPath()
ctx.moveTo(parent.x, py)
ctx.bezierCurveTo(parent.x, midY, child.x, midY, child.x, cy)
ctx.strokeStyle = `rgba(${hexRgb(color)},${alpha})`
ctx.lineWidth = isActive ? 1.5 : 0.8
ctx.setLineDash(isActive ? [] : [3, 6])
ctx.stroke()
ctx.setLineDash([])
if (isActive) {
const prog = (performance.now() * 0.0004) % 1
const t = easeOut3(prog)
const bz = (p, a, b, c, d) => (1-p)**3*a + 3*(1-p)**2*p*b + 3*(1-p)*p**2*c + p**3*d
const fx = bz(t, parent.x, parent.x, child.x, child.x)
const fy = bz(t, py, midY, midY, cy)
ctx.beginPath()
ctx.arc(fx, fy, 2.5, 0, Math.PI * 2)
ctx.fillStyle = `rgba(${hexRgb(color)},0.85)`
ctx.fill()
}
}
function createOverlay() {
const overlay = document.createElement('div')
overlay.id = 'btv-overlay'
overlay.setAttribute('role', 'dialog')
overlay.setAttribute('aria-modal', 'true')
overlay.setAttribute('aria-label', 'Binary Tree View')
overlay.style.cssText = [
'position:fixed;inset:0;z-index:9000',
'background:rgba(11,15,20,0.97)',
'display:flex;flex-direction:column',
'opacity:0;transition:opacity 0.28s ease',
'pointer-events:none',
].join(';')
overlay.innerHTML = `
<div id="btv-bar" style="
display:flex;align-items:center;justify-content:space-between;
padding:8px 20px;border-bottom:1px solid rgba(0,194,255,0.1);
flex-shrink:0;gap:12px;
">
<div style="display:flex;align-items:center;gap:12px">
<span style="font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#00C2FF">
binary tree view
</span>
<span id="btv-info" style="font-size:10px;color:#64748b;font-family:'JetBrains Mono',monospace;"></span>
</div>
<div style="display:flex;align-items:center;gap:16px">
<span style="font-size:10px;color:#64748b">
click to select &nbsp;·&nbsp; double-click to navigate &nbsp;·&nbsp; scroll to zoom &nbsp;·&nbsp; drag to pan
</span>
<button id="btv-close" style="
background:none;border:1px solid rgba(0,194,255,0.2);border-radius:5px;
padding:4px 10px;color:#9DA7B3;font-size:11px;cursor:pointer;
transition:border-color .15s,color .15s;
" aria-label="Close binary tree view">✕ close</button>
</div>
</div>
<canvas id="btv-canvas" style="flex:1;display:block;cursor:grab;" tabindex="0"></canvas>
<div id="btv-legend" style="
display:flex;align-items:center;gap:16px;padding:6px 20px;
border-top:1px solid rgba(0,194,255,0.08);flex-shrink:0;
">
${Object.entries(KIND_COLOR).filter(([k])=>['post','project','document'].includes(k)).map(([k,c])=>`
<span style="display:flex;align-items:center;gap:5px;font-size:10px;color:#64748b">
<span style="width:8px;height:8px;border-radius:50%;background:${c};flex-shrink:0"></span>${k}
</span>
`).join('')}
<span style="margin-left:auto;font-size:10px;color:#64748b;font-family:'JetBrains Mono',monospace" id="btv-count"></span>
</div>
`
const tip = document.createElement('div')
tip.id = 'btv-tip'
tip.style.cssText = [
'position:fixed;pointer-events:none;opacity:0',
'transition:opacity .18s',
'max-width:260px;min-width:180px',
'background:rgba(18,24,33,0.97);border:1px solid rgba(0,194,255,0.22)',
'border-radius:8px;padding:12px 14px',
'font-family:Inter,system-ui,sans-serif',
'z-index:9001',
].join(';')
overlay.appendChild(tip)
document.body.appendChild(overlay)
return {
overlay,
canvas: document.getElementById('btv-canvas'),
info: document.getElementById('btv-info'),
count: document.getElementById('btv-count'),
tip,
}
}
function createTrigger() {
if (document.body.classList.contains('page-home')) return null
const btn = document.createElement('button')
btn.id = 'btv-trigger'
btn.setAttribute('aria-label', 'Open Binary Tree View')
btn.title = 'Binary Tree View'
btn.style.cssText = [
'position:fixed;bottom:24px;right:24px;z-index:500',
'width:44px;height:44px;border-radius:50%',
'background:rgba(18,24,33,0.95);border:1px solid rgba(0,194,255,0.28)',
'color:#00C2FF;cursor:pointer',
'display:flex;align-items:center;justify-content:center',
'transition:transform .2s,box-shadow .2s,border-color .2s',
'box-shadow:0 4px 24px rgba(0,0,0,0.45)',
].join(';')
btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24"
fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
<circle cx="12" cy="4" r="2"/><line x1="12" y1="6" x2="12" y2="10"/>
<circle cx="6" cy="14" r="2"/><circle cx="18" cy="14" r="2"/>
<line x1="10" y1="11" x2="7" y2="13"/><line x1="14" y1="11" x2="17" y2="13"/>
<line x1="5" y1="16" x2="5" y2="19"/><line x1="7" y1="16" x2="7" y2="19"/>
<line x1="17" y1="16" x2="17" y2="19"/><line x1="19" y1="16" x2="19" y2="19"/>
</svg>`
btn.addEventListener('mouseenter', () => {
btn.style.transform = 'scale(1.1)'
btn.style.boxShadow = '0 4px 32px rgba(0,194,255,0.28)'
btn.style.borderColor = 'rgba(0,194,255,0.65)'
})
btn.addEventListener('mouseleave', () => {
btn.style.transform = 'scale(1)'
btn.style.boxShadow = '0 4px 24px rgba(0,0,0,0.45)'
btn.style.borderColor = 'rgba(0,194,255,0.28)'
})
document.body.appendChild(btn)
return btn
}
async function init(searchIndexUrl) {
if (document.body.classList.contains('page-projects')) return
let rawItems = []
try {
const res = await fetch(searchIndexUrl)
if (res.ok) rawItems = await res.json()
} catch { return }
const items = rawItems
.filter(it => ['post', 'project', 'document'].includes(it.kind))
.sort((a, b) => extractDate(a) - extractDate(b))
if (!items.length) return
const root = buildBST(items, 0, items.length - 1, null)
const allNodes = collectNodes(root)
const pathname = window.location.pathname
allNodes.forEach(n => {
const u = n.data.url || ''
n.current = u === pathname || u === pathname.replace(/\/$/, '')
})
const { overlay, canvas, info, count, tip } = createOverlay()
const trigger = createTrigger()
const ctx = canvas.getContext('2d')
const dpr = Math.min(window.devicePixelRatio || 1, 2)
count.textContent = `${items.length} items`
let isOpen = false
let W = 0, H = 0
let mouseX = 0, mouseY = 0
let selected = null
let panX = 0, panY = 0
let viewScale = 1, targetScale = 1
let dragging = false
let dragSX = 0, dragSY = 0, panSX = 0, panSY = 0
let perfT = 0, frameTime = 0
function resize() {
W = canvas.clientWidth || window.innerWidth
H = canvas.clientHeight || window.innerHeight - 80
canvas.width = W * dpr
canvas.height = H * dpr
layoutTree(root, W, H)
allNodes.forEach(n => {
if (!n.x) { n.x = n.tx; n.y = n.ty }
})
}
function toWorld(sx, sy) {
return {
x: (sx - W / 2 - panX) / viewScale + W / 2,
y: (sy - H / 2 - panY) / viewScale + H / 2,
}
}
function hitNode(wx, wy) {
return allNodes.find(n => {
const hw = NODE_W / 2 * n.drawScale
const hh = NODE_H / 2 * n.drawScale
return wx >= n.x - hw && wx <= n.x + hw &&
wy >= n.y - hh && wy <= n.y + hh
})
}
function open() {
isOpen = true
overlay.style.pointerEvents = 'all'
overlay.style.opacity = '1'
document.body.style.overflow = 'hidden'
resize()
const cur = allNodes.find(n => n.current) || allNodes[Math.floor(allNodes.length / 2)]
if (cur) {
panX = W / 2 - cur.tx
panY = H / 2 - cur.ty
}
const cx = cur ? cur.tx : W / 2
const cy = cur ? cur.ty : H / 2
const sorted = [...allNodes].sort((a, b) => {
const da = Math.hypot(a.tx - cx, a.ty - cy)
const db = Math.hypot(b.tx - cx, b.ty - cy)
return da - db
})
sorted.forEach((n, i) => {
n.alpha = 0; n.drawScale = 0.7
n.revealed = false; n.revealDelay = i * 22
})
if (trigger) trigger.style.display = 'none'
}
function close() {
isOpen = false
overlay.style.opacity = '0'
overlay.style.pointerEvents = 'none'
document.body.style.overflow = ''
if (trigger) trigger.style.display = 'flex'
}
trigger?.addEventListener('click', () => isOpen ? close() : open())
document.getElementById('btv-close').addEventListener('click', close)
document.addEventListener('keydown', e => {
if (!isOpen) return
if (e.key === 'Escape') close()
})
if (document.body.classList.contains('page-home')) {
setTimeout(open, 200)
}
canvas.addEventListener('mousemove', e => {
const r = canvas.getBoundingClientRect()
mouseX = e.clientX - r.left
mouseY = e.clientY - r.top
if (dragging) {
panX = panSX + (mouseX - dragSX)
panY = panSY + (mouseY - dragSY)
return
}
const w = toWorld(mouseX, mouseY)
const hit = hitNode(w.x, w.y)
allNodes.forEach(n => { n.hover = n === hit })
canvas.style.cursor = hit ? 'pointer' : 'grab'
if (hit) {
const color = KIND_COLOR[hit.data.kind] || '#9DA7B3'
tip.style.opacity = '1'
tip.style.left = `${Math.min(e.clientX + 16, window.innerWidth - 280)}px`
tip.style.top = `${Math.min(e.clientY - 10, window.innerHeight - 140)}px`
tip.innerHTML = `
<div style="font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${color};margin-bottom:5px">${hit.data.kind}</div>
<div style="font-size:12px;font-weight:600;color:#E6EDF3;margin-bottom:5px;line-height:1.4">${hit.data.title || ''}</div>
<div style="font-size:11px;color:#9DA7B3;line-height:1.55">${(hit.data.summary || '').slice(0, 110)}${(hit.data.summary || '').length > 110 ? '…' : ''}</div>
<div style="font-size:10px;color:#00C2FF;margin-top:8px;opacity:.7">↵ double-click to open</div>
`
} else {
tip.style.opacity = '0'
}
})
canvas.addEventListener('mousedown', e => {
dragging = true
dragSX = e.clientX - canvas.getBoundingClientRect().left
dragSY = e.clientY - canvas.getBoundingClientRect().top
panSX = panX; panSY = panY
canvas.style.cursor = 'grabbing'
})
window.addEventListener('mouseup', () => {
dragging = false
canvas.style.cursor = 'grab'
})
canvas.addEventListener('click', e => {
if (Math.abs(panX - panSX) > 5 || Math.abs(panY - panSY) > 5) return
const r = canvas.getBoundingClientRect()
const w = toWorld(e.clientX - r.left, e.clientY - r.top)
const hit = hitNode(w.x, w.y)
if (hit) {
allNodes.forEach(n => { n.selected = false })
selected = hit; hit.selected = true
info.textContent = `${hit.data.kind} — ${(hit.data.title || '').slice(0, 50)}`
}
})
canvas.addEventListener('dblclick', e => {
const r = canvas.getBoundingClientRect()
const w = toWorld(e.clientX - r.left, e.clientY - r.top)
const hit = hitNode(w.x, w.y)
if (hit?.data?.url) window.location.href = hit.data.url
})
canvas.addEventListener('wheel', e => {
e.preventDefault()
targetScale = clamp(targetScale * (e.deltaY < 0 ? 1.13 : 0.89), 0.25, 4)
}, { passive: false })
window.addEventListener('resize', () => { if (isOpen) resize() })
function draw(ts) {
perfT = ts * 0.001
requestAnimationFrame(draw)
if (!isOpen) return
frameTime = ts
viewScale = lerp(viewScale, targetScale, 0.1)
ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
ctx.clearRect(0, 0, W, H)
ctx.fillStyle = 'rgba(0,194,255,0.02)'
const gs = 38
for (let gx = gs / 2; gx < W; gx += gs)
for (let gy = gs / 2; gy < H; gy += gs) {
ctx.beginPath(); ctx.arc(gx, gy, 0.8, 0, Math.PI * 2); ctx.fill()
}
ctx.save()
ctx.translate(W / 2 + panX, H / 2 + panY)
ctx.scale(viewScale, viewScale)
ctx.translate(-W / 2, -H / 2)
let revealBudget = 3
allNodes.forEach(n => {
if (!n.revealed && revealBudget > 0) {
n.revealDelay = Math.max(0, n.revealDelay - 16)
if (n.revealDelay <= 0) {
n.revealed = true; n.revealT = perfT; revealBudget--
}
}
n.x = lerp(n.x, n.tx, 0.1)
n.y = lerp(n.y, n.ty, 0.1)
if (n.revealed) {
const p = clamp((perfT - n.revealT) / 0.45, 0, 1)
n.alpha = lerp(n.alpha, 1.0, easeOut3(p))
n.drawScale = lerp(n.drawScale, 1.0, easeOut3(p))
}
const tg = (n.hover || n.selected || n.current) ? 1 : 0
n.glowV += (tg - n.glow) * 0.14; n.glowV *= 0.72; n.glow += n.glowV
})
allNodes.forEach(n => {
drawConnection(ctx, n, n.left)
drawConnection(ctx, n, n.right)
})
allNodes
.slice()
.sort((a, b) => a.alpha - b.alpha)
.forEach(n => drawNode(ctx, n, perfT))
ctx.restore()
}
requestAnimationFrame(draw)
}
document.addEventListener('DOMContentLoaded', () => {
init('/assets/search-index.json')
})
})()