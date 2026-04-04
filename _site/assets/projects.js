/**
 * Project Flow — Canvas Engine
 * Pure mathematics + Canvas 2D. No dependencies.
 */
;(function () {
  'use strict'

  // ─── Math ──────────────────────────────────────────────────────────────────

  const lerp    = (a, b, t) => a + (b - a) * t
  const clamp   = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
  const easeOut = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3)
  const dist2   = (ax, ay, bx, by) => (bx - ax) ** 2 + (by - ay) ** 2

  function clipText(ctx, text, maxW) {
    if (ctx.measureText(text).width <= maxW) return text
    let t = text
    while (t.length > 0 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1)
    return t + '…'
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.arcTo(x + w, y, x + w, y + r, r)
    ctx.lineTo(x + w, y + h - r)
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
    ctx.lineTo(x + r, y + h)
    ctx.arcTo(x, y + h, x, y + h - r, r)
    ctx.lineTo(x, y + r)
    ctx.arcTo(x, y, x + r, y, r)
    ctx.closePath()
  }

  // ─── Particle ──────────────────────────────────────────────────────────────

  class Particle {
    constructor() { this.spawn(Math.random(), Math.random()) }

    spawn(nx, ny) {
      this.x    = nx
      this.y    = ny
      this.vx   = (Math.random() - 0.5) * 0.0003
      this.vy   = (Math.random() - 0.5) * 0.0003
      this.life = Math.random()
      this.size = 0.8 + Math.random() * 1.4
    }

    update() {
      this.x    += this.vx
      this.y    += this.vy
      this.life += 0.0025
      if (this.life > 1 || this.x < 0 || this.x > 1 || this.y < 0 || this.y > 1)
        this.spawn(Math.random(), Math.random())
    }

    draw(ctx, W, H) {
      const a = Math.sin(this.life * Math.PI) * 0.35
      ctx.beginPath()
      ctx.arc(this.x * W, this.y * H, this.size, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(0,194,255,${a})`
      ctx.fill()
    }
  }

  // ─── Project Node ──────────────────────────────────────────────────────────

  const STATUS_COLOR = {
    production: '#00C2FF',
    in_progress: '#7C5CFF',
    research: '#64748b',
  }

  class ProjectNode {
    constructor(project, bx, by, idx) {
      this.project = project
      this.bx = bx; this.by = by
      this.x  = bx; this.y  = by
      // Floating orbit parameters — each node unique
      this.phX  = Math.random() * Math.PI * 2
      this.phY  = Math.random() * Math.PI * 2
      this.frX  = 0.22 + Math.random() * 0.28
      this.frY  = 0.18 + Math.random() * 0.22
      this.ampX = 14 + Math.random() * 22
      this.ampY = 10 + Math.random() * 16
      this.idx  = idx
      // Card dimensions
      this.W = 200; this.H = 86
      // Spring state
      this.scale    = 1;   this.scaleV  = 0
      this.glow     = 0;   this.glowV   = 0
      this.hover    = false
      this.selected = false
      this.statusColor = STATUS_COLOR[project.status] || '#64748b'
      // Ripple rings on select
      this.ripples  = []
      this.prevSelected = false
    }

    update(t, mx, my) {
      // Floating position
      this.x = this.bx + Math.sin(t * this.frX + this.phX) * this.ampX
      this.y = this.by + Math.cos(t * this.frY + this.phY) * this.ampY

      // Soft mouse attraction on hover
      if (this.hover) {
        const d2 = dist2(mx, my, this.x, this.y)
        const pull = clamp(1 - d2 / 120000, 0, 1) * 6
        this.x += (mx - this.x) * pull * 0.05
        this.y += (my - this.y) * pull * 0.05
      }

      // Spring: scale
      const ts = this.hover ? 1.07 : this.selected ? 1.15 : 1
      this.scaleV += (ts - this.scale) * 0.14
      this.scaleV *= 0.68
      this.scale  += this.scaleV

      // Spring: glow
      const tg = (this.hover || this.selected) ? 1 : 0
      this.glowV += (tg - this.glow) * 0.13
      this.glowV *= 0.70
      this.glow  += this.glowV

      // Ripple: spawn rings when newly selected
      if (this.selected && !this.prevSelected) {
        for (let k = 0; k < 3; k++) this.ripples.push({ r: 0, delay: k * 12, life: 0 })
      }
      this.prevSelected = this.selected

      // Advance ripples
      this.ripples = this.ripples.filter(rp => {
        if (rp.delay > 0) { rp.delay--; return true }
        rp.r    += 4.5
        rp.life += 0.045
        return rp.life < 1
      })
    }

    draw(ctx, t, dimmed) {
      const alpha = dimmed ? 0.18 : 1
      const hw = this.W / 2, hh = this.H / 2

      ctx.save()
      ctx.translate(this.x, this.y)
      ctx.scale(this.scale, this.scale)

      // ── Ripple rings ─────────────────────────────────────────────
      for (const rp of this.ripples) {
        if (rp.delay > 0) continue
        const fade = (1 - rp.life) * alpha
        ctx.beginPath()
        ctx.arc(0, 0, hw * 0.6 + rp.r, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(0,194,255,${fade * 0.55})`
        ctx.lineWidth = 1.5
        ctx.stroke()
      }

      // ── Outer glow ──────────────────────────────────────────────
      if (this.glow > 0.01) {
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, hw * 1.7)
        g.addColorStop(0, `rgba(0,194,255,${this.glow * 0.18 * alpha})`)
        g.addColorStop(1, 'rgba(0,194,255,0)')
        ctx.fillStyle = g
        ctx.fillRect(-hw * 1.8, -hh * 2, this.W * 1.8, this.H * 2)
      }

      // ── Card body ───────────────────────────────────────────────
      roundRect(ctx, -hw, -hh, this.W, this.H, 6)
      ctx.fillStyle = `hsla(220,15%,9%,${0.96 * alpha})`
      ctx.fill()

      // ── Scan line on hover (moves top→bottom, loops) ────────────
      if ((this.hover || this.selected) && alpha > 0.5) {
        const scanY = -hh + ((t * 28) % this.H)
        ctx.beginPath()
        ctx.moveTo(-hw, scanY)
        ctx.lineTo( hw, scanY)
        ctx.strokeStyle = `rgba(0,194,255,0.12)`
        ctx.lineWidth = 2
        ctx.stroke()
      }

      // ── Border ──────────────────────────────────────────────────
      roundRect(ctx, -hw, -hh, this.W, this.H, 6)
      ctx.strokeStyle = `rgba(0,194,255,${lerp(0.12, 0.75, this.glow) * alpha})`
      ctx.lineWidth = 1
      ctx.stroke()

      // ── Corner brackets (code aesthetic) ────────────────────────
      const cs = 9
      ctx.strokeStyle = `rgba(0,194,255,${lerp(0, 0.9, this.glow) * alpha})`
      ctx.lineWidth = 1.5
      for (const [cx2, cy2] of [[-hw,-hh],[hw,-hh],[-hw,hh],[hw,hh]]) {
        const sx = cx2 < 0 ? 1 : -1
        const sy = cy2 < 0 ? 1 : -1
        ctx.beginPath()
        ctx.moveTo(cx2 + sx * cs, cy2)
        ctx.lineTo(cx2, cy2)
        ctx.lineTo(cx2, cy2 + sy * cs)
        ctx.stroke()
      }

      // ── Status dot + pulse (production only) ────────────────────
      const dotX = -hw + 10, dotY = -hh + 10
      ctx.beginPath()
      ctx.arc(dotX, dotY, 3, 0, Math.PI * 2)
      ctx.fillStyle = this.statusColor
      ctx.fill()

      if (this.project.status === 'production') {
        const pulse = (Math.sin(t * 1.8 + this.idx * 1.2) * 0.5 + 0.5)
        ctx.beginPath()
        ctx.arc(dotX, dotY, 4 + pulse * 7, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(0,194,255,${0.45 * (1 - pulse) * alpha})`
        ctx.lineWidth = 1
        ctx.stroke()
      }

      // ── Title ───────────────────────────────────────────────────
      ctx.font = `700 12px Inter,system-ui,sans-serif`
      ctx.fillStyle = `rgba(230,237,243,${alpha})`
      ctx.textBaseline = 'top'
      ctx.fillText(clipText(ctx, this.project.name, this.W - 30), -hw + 20, -hh + 14)

      // ── Stack chips (first 3) ────────────────────────────────────
      ctx.font = `500 8.5px "JetBrains Mono",monospace`
      let chipX = -hw + 12
      const chipY = hh - 24
      for (const s of (this.project.stack || []).slice(0, 3)) {
        const tw = ctx.measureText(s).width + 10
        if (chipX + tw > hw - 4) break
        roundRect(ctx, chipX, chipY, tw, 16, 3)
        ctx.fillStyle = `rgba(0,194,255,${0.1 * alpha})`
        ctx.fill()
        ctx.fillStyle = `rgba(0,194,255,${0.75 * alpha})`
        ctx.fillText(s, chipX + 5, chipY + 4)
        chipX += tw + 4
      }

      ctx.restore()
    }

    hit(mx, my) {
      const hw = (this.W / 2) * this.scale
      const hh = (this.H / 2) * this.scale
      return mx >= this.x - hw && mx <= this.x + hw &&
             my >= this.y - hh && my <= this.y + hh
    }
  }

  // ─── Engine ────────────────────────────────────────────────────────────────

  function init(wrapper, projects) {
    const canvas = document.createElement('canvas')
    canvas.className = 'project-flow-canvas'
    wrapper.appendChild(canvas)

    const ctx = canvas.getContext('2d')
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    let W = 0, H = 0, nodes = [], particles = [], connections = []
    let selected = null, mouseX = 0, mouseY = 0

    // ── Layout: Fibonacci / golden-angle spiral ──────────────────
    function layout() {
      W = wrapper.clientWidth
      H = Math.max(wrapper.clientHeight, 520)
      canvas.width  = W * dpr
      canvas.height = H * dpr
      canvas.style.width  = W + 'px'
      canvas.style.height = H + 'px'

      const phi    = (1 + Math.sqrt(5)) / 2
      const cx     = W / 2
      const cy     = H / 2
      const spread = Math.min(W * 0.4, H * 0.4)
      const n      = projects.length

      nodes = projects.map((p, i) => {
        const angle = i * 2 * Math.PI / phi
        const r     = spread * Math.sqrt((i + 0.5) / n)
        return new ProjectNode(p, cx + r * Math.cos(angle), cy + r * Math.sin(angle), i)
      })

      particles = Array.from({ length: 80 }, () => new Particle())

      connections = []
      nodes.forEach((a, i) => {
        nodes.slice(i + 1).forEach(b => {
          const shared = (a.project.stack || []).filter(s => (b.project.stack || []).includes(s))
          if (shared.length) connections.push({ a, b, w: shared.length })
        })
      })
    }

    // ── Detail panel ────────────────────────────────────────────
    const shell = wrapper.closest('.project-flow-shell') || wrapper.parentElement
    const panel = shell.querySelector('[data-project-panel]')

    // ── Panel reveal ─────────────────────────────────────────────
    let panelRevealTimer = null

    function showPanel(p) {
      if (!panel) return

      // Populate content
      panel.querySelector('[data-panel-name]').textContent     = p.name
      panel.querySelector('[data-panel-role]').textContent     = p.status.replace(/_/g, ' ')
      panel.querySelector('[data-panel-headline]').textContent = p.headline || p.summary
      panel.querySelector('[data-panel-summary]').textContent  = p.summary
      const stackEl = panel.querySelector('[data-panel-stack]')
      stackEl.innerHTML = (p.stack || []).map(s => `<span class="stack-chip">${s}</span>`).join('')
      const link = panel.querySelector('[data-panel-link]')
      link.href = p.url || '#'

      // Reset all reveal states before opening
      const revealEls = panel.querySelectorAll('[data-reveal]')
      revealEls.forEach(el => { el.classList.remove('reveal-in'); el.style.transitionDelay = '' })

      // Mark open (triggers CSS slide-in transition)
      panel.dataset.open = 'true'

      // Stagger children in after panel slides in
      clearTimeout(panelRevealTimer)
      panelRevealTimer = setTimeout(() => {
        revealEls.forEach((el, i) => {
          el.style.transitionDelay = `${i * 70}ms`
          el.classList.add('reveal-in')
        })
      }, 120)
    }

    function hidePanel() {
      if (!panel) return
      clearTimeout(panelRevealTimer)
      const revealEls = panel.querySelectorAll('[data-reveal]')
      revealEls.forEach(el => { el.classList.remove('reveal-in'); el.style.transitionDelay = '' })
      panel.dataset.open = 'false'
    }

    // ── Input ────────────────────────────────────────────────────
    canvas.addEventListener('mousemove', e => {
      const r = canvas.getBoundingClientRect()
      mouseX = e.clientX - r.left
      mouseY = e.clientY - r.top
      nodes.forEach(n => { n.hover = !selected && n.hit(mouseX, mouseY) })
      canvas.style.cursor = nodes.some(n => n.hover) ? 'pointer' : 'crosshair'
    })

    canvas.addEventListener('mouseleave', () => {
      nodes.forEach(n => { n.hover = false })
      canvas.style.cursor = 'crosshair'
    })

    canvas.addEventListener('click', e => {
      const r  = canvas.getBoundingClientRect()
      const mx = e.clientX - r.left
      const my = e.clientY - r.top
      const hit = nodes.find(n => n.hit(mx, my))

      if (hit) {
        if (selected === hit) {
          hit.selected = false
          selected = null
          hidePanel()
        } else {
          if (selected) selected.selected = false
          selected = hit
          hit.selected = true
          showPanel(hit.project)
        }
      } else if (selected) {
        selected.selected = false
        selected = null
        hidePanel()
      }
    })

    panel?.querySelector('[data-panel-close]')?.addEventListener('click', () => {
      if (selected) { selected.selected = false; selected = null }
      hidePanel()
    })

    window.addEventListener('keydown', e => {
      if (e.key === 'Escape' && selected) {
        selected.selected = false; selected = null; hidePanel()
      }
    })

    window.addEventListener('resize', () => {
      layout()
    })

    // ── Draw loop ────────────────────────────────────────────────
    function draw(ts) {
      const t = ts * 0.001

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)

      // Background: subtle dot grid
      ctx.fillStyle = 'rgba(0,194,255,0.035)'
      const gs = 48
      for (let gx = gs / 2; gx < W; gx += gs)
        for (let gy = gs / 2; gy < H; gy += gs) {
          ctx.beginPath()
          ctx.arc(gx, gy, 1, 0, Math.PI * 2)
          ctx.fill()
        }

      // Particles
      for (const p of particles) { p.update(); p.draw(ctx, W, H) }

      // Connections — quadratic bezier, dim unless one is selected
      for (const { a, b, w } of connections) {
        const isActive = selected && (a === selected || b === selected)
        const alpha = selected ? (isActive ? 0.45 : 0.04) : 0.13
        const mx2 = (a.x + b.x) / 2
        const my2 = (a.y + b.y) / 2
        // Perpendicular offset for the control point
        const dx = b.x - a.x, dy = b.y - a.y
        const len = Math.sqrt(dx * dx + dy * dy) || 1
        const cpx = mx2 - (dy / len) * 40
        const cpy = my2 + (dx / len) * 40
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.quadraticCurveTo(cpx, cpy, b.x, b.y)
        ctx.strokeStyle = `rgba(124,92,255,${alpha})`
        ctx.lineWidth = Math.min(w, 3)
        ctx.stroke()

        // Animated dot flowing along the connection when active
        if (isActive) {
          const progress = (t * 0.5) % 1
          const tp = easeOut(progress)
          const fx = (1-tp)*(1-tp)*a.x + 2*(1-tp)*tp*cpx + tp*tp*b.x
          const fy = (1-tp)*(1-tp)*a.y + 2*(1-tp)*tp*cpy + tp*tp*b.y
          ctx.beginPath()
          ctx.arc(fx, fy, 3, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(124,92,255,0.9)`
          ctx.fill()
        }
      }

      // Nodes
      for (const n of nodes) {
        n.update(t, mouseX, mouseY)
        n.draw(ctx, t, selected && selected !== n)
      }

      requestAnimationFrame(draw)
    }

    layout()
    requestAnimationFrame(draw)
  }

  // ── Boot ──────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    const wrapper = document.querySelector('[data-project-flow]')
    const dataEl  = document.getElementById('projects-data')
    if (!wrapper || !dataEl) return
    let projects
    try { projects = JSON.parse(dataEl.textContent) } catch { return }
    if (projects && projects.length) init(wrapper, projects)
  })
})()
