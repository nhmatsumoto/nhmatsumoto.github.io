;(function () {
'use strict'
const lerp = (a, b, t) => a + (b - a) * t
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const easeOut3 = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3)
const easeOut5 = t => 1 - Math.pow(1 - clamp(t, 0, 1), 5)
const spring = (p) => {
const s = easeOut3(p)
const overshoot = Math.sin(p * Math.PI) * 0.06 * (1 - p)
return clamp(s + overshoot, 0, 1.06)
}
function clipText(ctx, text, maxW) {
if (ctx.measureText(text).width <= maxW) return text
let t = text
while (t.length > 0 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1)
return t + '…'
}
function wrapLines(ctx, text, maxW) {
const words = text.split(' ')
const lines = []
let line = ''
for (const word of words) {
const test = line ? line + ' ' + word : word
if (ctx.measureText(test).width > maxW && line) {
lines.push(line)
line = word
if (lines.length >= 7) { lines.push('…'); break }
} else {
line = test
}
}
if (line && lines.length < 7) lines.push(line)
return lines
}
function roundRect(ctx, x, y, w, h, r) {
ctx.beginPath()
ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y)
ctx.arcTo(x + w, y, x + w, y + r, r); ctx.lineTo(x + w, y + h - r)
ctx.arcTo(x + w, y + h, x + w - r, y + h, r); ctx.lineTo(x + r, y + h)
ctx.arcTo(x, y + h, x, y + h - r, r); ctx.lineTo(x, y + r)
ctx.arcTo(x, y, x + r, y, r); ctx.closePath()
}
const ANIM = {
fade(rs, p) {
rs.alpha = easeOut3(p)
rs.tx = 0; rs.ty = 0; rs.scale = 1
},
slide_right(rs, p) {
rs.alpha = easeOut3(Math.min(p * 1.4, 1))
rs.tx = lerp(-60, 0, easeOut5(p))
rs.ty = 0; rs.scale = 1
},
zoom(rs, p) {
rs.alpha = easeOut3(Math.min(p * 1.5, 1))
rs.scale = spring(p)
rs.tx = 0; rs.ty = 0
},
typewriter(rs, p, section) {
rs.alpha = 1; rs.tx = 0; rs.ty = 0; rs.scale = 1
const total = (section.title || '').length + (section.content || '').length
rs.revealChars = Math.floor(easeOut3(p) * total)
},
matrix_rain(rs, p) {
rs.alpha = 1; rs.tx = 0; rs.ty = 0; rs.scale = 1
rs.rainPhase = p < 0.55 ? 'falling' : 'clearing'
rs.rainP = p < 0.55 ? p / 0.55 : (p - 0.55) / 0.45
},
expand_node(rs, p) {
rs.alpha = easeOut3(p)
rs.scale = spring(p)
rs.tx = 0; rs.ty = 0
},
}
const TYPE_COLOR = {
intro: '#00C2FF',
problem: '#f59e0b',
solution: '#10b981',
architecture: '#7C5CFF',
stack: '#64748b',
code: '#00C2FF',
diagram: '#7C5CFF',
text: '#9DA7B3',
}
class SectionNode {
constructor(section) {
this.section = section
this.x = 0; this.y = 0
this.W = 0; this.H = 0
this.visible = false
this.entering = false
this.animStartT = 0
this.animDuration = 0.85
this.rs = { alpha: 0, tx: 0, ty: 0, scale: 0.85, revealChars: 0, rainPhase: 'falling', rainP: 0, glowPulse: 0 }
this.hover = false
this.typeColor = TYPE_COLOR[section.type] || '#9DA7B3'
this._rainCols = []
for (let i = 0; i < 16; i++) {
this._rainCols.push({ x: i / 16, speed: 0.4 + Math.random() * 0.8, chars: [] })
for (let j = 0; j < 12; j++) {
this._rainCols[i].chars.push(String.fromCharCode(0x30A0 + Math.floor(Math.random() * 96)))
}
}
}
enter(t) {
this.visible = true
this.entering = true
this.animStartT = t
this.rs = { alpha: 0, tx: 0, ty: 0, scale: 0.85, revealChars: 0, rainPhase: 'falling', rainP: 0, glowPulse: 0 }
}
update(t) {
if (!this.visible) return
const elapsed = t - this.animStartT
const p = clamp(elapsed / this.animDuration, 0, 1)
const driver = ANIM[this.section.animation] || ANIM.fade
driver(this.rs, p, this.section)
if (p >= 1) this.entering = false
this.rs.glowPulse = (Math.sin(t * 2.1 + this.section.id * 0.9) * 0.5 + 0.5)
}
drawActive(ctx, t) {
if (!this.visible) return
const rs = this.rs
const { alpha, tx, ty, scale } = rs
const hw = this.W / 2, hh = this.H / 2
ctx.save()
ctx.globalAlpha = clamp(alpha, 0, 1)
ctx.translate(this.x + tx, this.y + ty)
ctx.scale(scale, scale)
const gp = rs.glowPulse
const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, hw * 1.3)
grd.addColorStop(0, `rgba(0,194,255,${0.07 + gp * 0.05})`)
grd.addColorStop(1, 'rgba(0,194,255,0)')
ctx.fillStyle = grd
ctx.fillRect(-hw * 1.5, -hh * 1.5, this.W * 1.5, this.H * 1.5)
if (this.section.animation === 'matrix_rain' && rs.rainPhase === 'falling') {
roundRect(ctx, -hw, -hh, this.W, this.H, 8)
ctx.fillStyle = 'hsla(220,18%,9%,0.97)'
ctx.fill()
ctx.strokeStyle = 'rgba(0,194,255,0.4)'
ctx.lineWidth = 1.5
ctx.stroke()
ctx.font = '11px "JetBrains Mono", monospace'
for (const col of this._rainCols) {
const cx = -hw + col.x * this.W
for (let j = 0; j < col.chars.length; j++) {
const cy = -hh + ((rs.rainP * col.speed * this.H * 1.4 + j * 18) % (this.H + 18)) - 18
const fade = 1 - (j / col.chars.length)
ctx.fillStyle = `rgba(0,194,255,${fade * 0.8 * (1 - rs.rainP * 0.8)})`
ctx.fillText(col.chars[j], cx, cy + hh)
}
}
ctx.restore()
return
}
roundRect(ctx, -hw, -hh, this.W, this.H, 8)
ctx.fillStyle = 'hsla(220,18%,9%,0.97)'
ctx.fill()
ctx.strokeStyle = `rgba(0,194,255,${0.28 + gp * 0.38})`
ctx.lineWidth = 1.5
ctx.stroke()
const accentW = this.W * 0.22
ctx.beginPath()
ctx.moveTo(-hw + 16, -hh)
ctx.lineTo(-hw + 16 + accentW, -hh)
ctx.strokeStyle = this.typeColor
ctx.lineWidth = 2
ctx.stroke()
ctx.font = '600 9px Inter, system-ui, sans-serif'
ctx.fillStyle = `rgba(157,167,179,${clamp(alpha, 0, 1)})`
ctx.textBaseline = 'top'
ctx.textAlign = 'left'
const typeLabel = (this.section.type || 'text').toUpperCase()
ctx.fillText(typeLabel, -hw + 16, -hh + 14)
ctx.textAlign = 'right'
ctx.font = '500 9px "JetBrains Mono", monospace'
ctx.fillStyle = `rgba(100,116,139,${clamp(alpha, 0, 1)})`
ctx.fillText(`#${this.section.id}`, hw - 16, -hh + 14)
ctx.textAlign = 'left'
const title = this.section.title || ''
const isTypewriter = this.section.animation === 'typewriter'
const titleShow = isTypewriter
? title.slice(0, Math.min(rs.revealChars, title.length))
: title
ctx.font = '700 20px Inter, system-ui, sans-serif'
ctx.fillStyle = `rgba(230,237,243,${clamp(alpha, 0, 1)})`
ctx.textBaseline = 'top'
ctx.fillText(clipText(ctx, titleShow, this.W - 36), -hw + 16, -hh + 34)
const content = this.section.content || ''
const contentStart = isTypewriter ? Math.max(0, rs.revealChars - title.length) : content.length
const displayContent = isTypewriter ? content.slice(0, contentStart) : content
ctx.font = '400 13px Inter, system-ui, sans-serif'
ctx.fillStyle = `rgba(157,167,179,${clamp(alpha, 0, 1)})`
const lines = wrapLines(ctx, displayContent, this.W - 36)
lines.forEach((line, i) => {
ctx.fillText(line, -hw + 16, -hh + 70 + i * 20)
})
if (isTypewriter && this.entering) {
const cursorX = -hw + 16 + ctx.measureText(lines[lines.length - 1] || '').width
const cursorY = -hh + 70 + (lines.length - 1) * 20
ctx.fillStyle = `rgba(0,194,255,${Math.sin(t * 6) > 0 ? 0.9 : 0})`
ctx.fillRect(cursorX + 2, cursorY, 8, 14)
}
ctx.restore()
}
drawMini(ctx, role) {
if (!this.visible && role === 'history') return
const hw = this.W / 2, hh = this.H / 2
const isChild = role === 'child'
const isHovered = isChild && this.hover
ctx.save()
ctx.globalAlpha = isChild ? (isHovered ? 1 : 0.72) : 0.38
ctx.translate(this.x, this.y)
roundRect(ctx, -hw, -hh, this.W, this.H, 6)
ctx.fillStyle = isChild
? (isHovered ? 'hsla(220,18%,14%,0.98)' : 'hsla(220,18%,11%,0.97)')
: 'hsla(220,18%,8%,0.85)'
ctx.fill()
ctx.strokeStyle = isChild
? `rgba(0,194,255,${isHovered ? 0.85 : 0.35})`
: 'rgba(100,116,139,0.22)'
ctx.lineWidth = isHovered ? 1.5 : 1
ctx.stroke()
ctx.font = `${isChild ? '600' : '400'} 11px Inter, system-ui, sans-serif`
ctx.fillStyle = isChild ? 'rgba(230,237,243,0.92)' : 'rgba(157,167,179,0.55)'
ctx.textBaseline = 'middle'
ctx.textAlign = 'center'
const label = this.section.title || `#${this.section.id}`
ctx.fillText(clipText(ctx, label, this.W - 20), 0, isChild ? -6 : 0)
if (isChild) {
ctx.font = '9px "JetBrains Mono", monospace'
ctx.fillStyle = `rgba(0,194,255,${isHovered ? 0.8 : 0.45})`
ctx.fillText(this.section.animation || 'fade', 0, 8)
if (isHovered) {
ctx.beginPath()
ctx.arc(hw - 14, 0, 4, 0, Math.PI * 2)
ctx.fillStyle = 'rgba(0,194,255,0.9)'
ctx.fill()
}
}
ctx.textAlign = 'left'
ctx.restore()
}
hit(mx, my) {
return mx >= this.x - this.W / 2 && mx <= this.x + this.W / 2 &&
my >= this.y - this.H / 2 && my <= this.y + this.H / 2
}
}
function init(container, sections) {
const nodeMap = {}
sections.forEach(s => { nodeMap[s.id] = new SectionNode(s) })
const canvas = document.createElement('canvas')
canvas.className = 'section-canvas'
container.appendChild(canvas)
const ctx = canvas.getContext('2d')
const dpr = Math.min(window.devicePixelRatio || 1, 2)
let W = 0, H = 0
let currentId = null
let visitedStack = []
let childViews = []
let histViews = []
let activeNode = null
let mouseX = 0, mouseY = 0
let perfT = 0
const ACTIVE_W = () => Math.min(520, W * 0.6)
const ACTIVE_H = () => Math.min(300, H * 0.52)
const CHILD_W = 160, CHILD_H = 52
const HIST_W = 130, HIST_H = 38
function positionViews() {
if (activeNode) {
activeNode.W = ACTIVE_W(); activeNode.H = ACTIVE_H()
activeNode.x = W / 2; activeNode.y = H / 2
}
const section = currentId !== null ? nodeMap[currentId]?.section : null
const children = section ? (section.children || []).filter(id => nodeMap[id]) : []
const cCount = children.length
const cSpacing = CHILD_W + 20
const cStartX = W / 2 - ((cCount - 1) * cSpacing) / 2
childViews.forEach((cv, i) => {
cv.W = CHILD_W; cv.H = CHILD_H
cv.x = cStartX + i * cSpacing
cv.y = H / 2 + ACTIVE_H() / 2 + 52
})
histViews.forEach((hv, i) => {
hv.W = HIST_W; hv.H = HIST_H
hv.x = HIST_W / 2 + 16
hv.y = 56 + i * (HIST_H + 10)
})
}
function activateSection(id) {
if (currentId !== null) visitedStack.push(currentId)
currentId = id
const section = nodeMap[id]?.section
if (!section) return
activeNode = nodeMap[id]
activeNode.enter(perfT)
const children = (section.children || []).filter(cid => nodeMap[cid])
childViews = children.map(cid => nodeMap[cid])
childViews.forEach(cv => { cv.visible = true; cv.hover = false })
histViews = visitedStack.slice(-6).reverse().map(hid => nodeMap[hid])
positionViews()
}
function goBack() {
if (!visitedStack.length) return
const prevId = visitedStack.pop()
currentId = null
activateSection(prevId)
visitedStack.pop()
}
function resize() {
W = container.clientWidth
H = Math.max(container.clientHeight, 500)
canvas.width = W * dpr
canvas.height = H * dpr
canvas.style.width = W + 'px'
canvas.style.height = H + 'px'
positionViews()
}
const backBtn = container.parentElement?.querySelector('[data-reader-back]')
const progressEl = container.parentElement?.querySelector('[data-reader-progress]')
function updateUI() {
if (backBtn) backBtn.hidden = visitedStack.length === 0
if (progressEl) {
const total = sections.length
const current = visitedStack.length + (currentId !== null ? 1 : 0)
progressEl.textContent = currentId !== null ? `${current} / ${total}` : ''
}
}
function draw(ts) {
perfT = ts * 0.001
const t = perfT
ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
ctx.clearRect(0, 0, W, H)
ctx.fillStyle = 'rgba(0,194,255,0.025)'
const gs = 40
for (let gx = gs / 2; gx < W; gx += gs)
for (let gy = gs / 2; gy < H; gy += gs) {
ctx.beginPath(); ctx.arc(gx, gy, 1, 0, Math.PI * 2); ctx.fill()
}
if (currentId === null) {
const pulse = (Math.sin(t * 2.2) * 0.5 + 0.5)
ctx.font = '600 14px Inter, system-ui, sans-serif'
ctx.fillStyle = `rgba(0,194,255,${0.4 + pulse * 0.35})`
ctx.textAlign = 'center'
ctx.textBaseline = 'middle'
ctx.fillText('click to begin', W / 2, H / 2)
ctx.beginPath()
ctx.arc(W / 2, H / 2 - 40, 16 + pulse * 6, 0, Math.PI * 2)
ctx.strokeStyle = `rgba(0,194,255,${0.3 + pulse * 0.4})`
ctx.lineWidth = 1.5
ctx.stroke()
ctx.beginPath()
ctx.arc(W / 2, H / 2 - 40, 8, 0, Math.PI * 2)
ctx.fillStyle = `rgba(0,194,255,${0.6 + pulse * 0.3})`
ctx.fill()
ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
requestAnimationFrame(draw); return
}
if (activeNode && childViews.length) {
for (const cv of childViews) {
const ax = activeNode.x
const ay = activeNode.y + activeNode.H / 2
const bx = cv.x
const by = cv.y - cv.H / 2
const midY = ay + (by - ay) * 0.55
ctx.beginPath()
ctx.moveTo(ax, ay)
ctx.bezierCurveTo(ax, midY, bx, midY, bx, by)
ctx.strokeStyle = `rgba(0,194,255,${cv.hover ? 0.55 : 0.18})`
ctx.lineWidth = cv.hover ? 1.5 : 1
ctx.setLineDash([4, 7])
ctx.stroke()
ctx.setLineDash([])
if (cv.hover) {
const prog = ((t * 0.7) % 1)
const tp = easeOut3(prog)
const bz = (p, a, b, c, d) => (1-p)**3*a + 3*(1-p)**2*p*b + 3*(1-p)*p**2*c + p**3*d
const fx = bz(tp, ax, ax, bx, bx)
const fy = bz(tp, ay, midY, midY, by)
ctx.beginPath(); ctx.arc(fx, fy, 3, 0, Math.PI * 2)
ctx.fillStyle = 'rgba(0,194,255,0.85)'
ctx.fill()
}
}
}
for (let i = 0; i < histViews.length - 1; i++) {
const a = histViews[i], b = histViews[i + 1]
ctx.beginPath()
ctx.moveTo(a.x, a.y + a.H / 2)
ctx.lineTo(b.x, b.y - b.H / 2)
ctx.strokeStyle = 'rgba(100,116,139,0.2)'
ctx.lineWidth = 1
ctx.stroke()
}
for (const hv of histViews) hv.drawMini(ctx, 'history')
if (activeNode) {
activeNode.update(t)
activeNode.drawActive(ctx, t)
}
for (const cv of childViews) cv.drawMini(ctx, 'child')
const section = nodeMap[currentId]?.section
if (section && (!section.children || !section.children.length)) {
const pulse = (Math.sin(t * 1.4) * 0.5 + 0.5)
ctx.font = '600 11px Inter, system-ui, sans-serif'
ctx.fillStyle = `rgba(0,194,255,${0.35 + pulse * 0.25})`
ctx.textAlign = 'center'
ctx.textBaseline = 'top'
ctx.fillText('— fim —', W / 2, H / 2 + ACTIVE_H() / 2 + 24)
ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
}
updateUI()
requestAnimationFrame(draw)
}
canvas.addEventListener('mousemove', e => {
const r = canvas.getBoundingClientRect()
mouseX = e.clientX - r.left
mouseY = e.clientY - r.top
for (const cv of childViews) cv.hover = cv.hit(mouseX, mouseY)
canvas.style.cursor = (currentId === null || childViews.some(cv => cv.hover)) ? 'pointer' : 'default'
})
canvas.addEventListener('mouseleave', () => {
childViews.forEach(cv => { cv.hover = false })
canvas.style.cursor = 'default'
})
canvas.addEventListener('click', e => {
const r = canvas.getBoundingClientRect()
const mx = e.clientX - r.left
const my = e.clientY - r.top
if (currentId === null) {
activateSection(sections[0].id)
return
}
for (const cv of childViews) {
if (cv.hit(mx, my)) { activateSection(cv.section.id); return }
}
})
backBtn?.addEventListener('click', goBack)
window.addEventListener('keydown', e => {
if (e.key === 'Backspace' && !e.target.matches('input,textarea')) goBack()
if (e.key === 'Enter' && currentId === null) activateSection(sections[0].id)
})
window.addEventListener('resize', () => { resize(); positionViews() })
resize()
requestAnimationFrame(draw)
}
document.addEventListener('DOMContentLoaded', () => {
const container = document.querySelector('[data-section-reader]')
const dataEl = document.getElementById('sections-data')
if (!container || !dataEl) return
let sections
try { sections = JSON.parse(dataEl.textContent) } catch { return }
if (!sections || !sections.length) return
init(container, sections)
})
})()