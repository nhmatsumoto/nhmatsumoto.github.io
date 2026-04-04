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

  const KIND_COLOR = {
    post:     '#00C2FF', // Vibrant Blue
    project:  '#7C5CFF', // Deep Purple
    document: '#10B981', // Emerald Green
  }
  class ProjectNode {
    constructor(project, bx, by, idx) {
      this.project = project
      this.bx = bx; this.by = by
      this.x  = bx; this.y  = by
      // Floating orbit
      this.phX  = Math.random() * Math.PI * 2
      this.phY  = Math.random() * Math.PI * 2
      this.frX  = 0.18 + Math.random() * 0.22
      this.frY  = 0.15 + Math.random() * 0.20
      this.ampX = 12 + Math.random() * 18
      this.ampY = 8 + Math.random() * 14
      this.idx  = idx
      
      // Node dimensions (Point radius)
      this.radius = 5
      
      // Spring state
      this.scale    = 1;   this.scaleV  = 0
      this.glow     = 0;   this.glowV   = 0
      this.hover    = false
      this.selected = false
      this.color    = KIND_COLOR[project.kind] || '#64748b'
      
      // Ripple rings
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

    repulse(others) {
      const minDist = 120 // Distance threshold for repulsion
      for (const other of others) {
        if (other === this) continue
        const dx = this.bx - other.bx
        const dy = this.by - other.by
        const d2 = dx*dx + dy*dy
        if (d2 < minDist * minDist) {
          const d = Math.sqrt(d2) || 1
          const force = (minDist - d) / d * 0.02
          this.bx += dx * force
          this.by += dy * force
        }
      }
    }

    draw(ctx, t, dimmed) {
      const alpha = dimmed ? 0.2 : 1
      const r = this.radius * this.scale

      ctx.save()
      ctx.translate(this.x, this.y)

      // ── Ripple rings ─────────────────────────────────────────────
      for (const rp of this.ripples) {
        if (rp.delay > 0) continue
        const fade = (1 - rp.life) * alpha
        ctx.beginPath()
        ctx.arc(0, 0, this.radius * 2 + rp.r, 0, Math.PI * 2)
        ctx.strokeStyle = `${this.color}${Math.floor(fade * 140).toString(16).padStart(2, '0')}`
        ctx.lineWidth = 1.2
        ctx.stroke()
      }

      // ── Neon Atmosphere (Dotted Rings) ─────────────────────────
      const atmosAlpha = this.hover ? 0.35 : 0.15
      ctx.setLineDash([2, 4])
      ctx.strokeStyle = `${this.color}${Math.floor(atmosAlpha * 255).toString(16).padStart(2, '0')}`
      ctx.lineWidth = 1
      
      // Rotating atmosphere rings
      ctx.rotate(t * 0.2)
      ctx.beginPath()
      ctx.arc(0, 0, this.radius * 2.5, 0, Math.PI * 2)
      ctx.stroke()
      
      ctx.rotate(-t * 0.4)
      ctx.beginPath()
      ctx.arc(0, 0, this.radius * 3.5, 0, Math.PI * 2)
      ctx.stroke()
      
      ctx.setLineDash([])
      ctx.rotate(t * 0.2) // Reset rotation

      // ── Outer glow ──────────────────────────────────────────────
      if (this.glow > 0.01) {
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius * 7)
        const gAlpha = Math.floor(this.glow * 0.4 * alpha * 255).toString(16).padStart(2, '0')
        g.addColorStop(0, `${this.color}${gAlpha}`)
        g.addColorStop(1, `${this.color}00`)
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(0, 0, this.radius * 7, 0, Math.PI * 2)
        ctx.fill()
      }

      // ── Node Point ──────────────────────────────────────────────
      ctx.beginPath()
      ctx.arc(0, 0, r, 0, Math.PI * 2)
      ctx.fillStyle = this.color
      ctx.globalAlpha = alpha
      ctx.fill()
      
      // Node interior detail
      ctx.beginPath()
      ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2)
      ctx.fillStyle = '#fff'
      ctx.fill()
      ctx.globalAlpha = 1

      // ── Title Label ─────────────────────────────────────────────
      const labelAlpha = (this.hover || this.selected) ? 1 : 0.65
      ctx.font = `500 11px "Inter",system-ui,sans-serif`
      ctx.fillStyle = `rgba(230,237,243,${labelAlpha * alpha})`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      
      const labelOffset = r + 10
      ctx.fillText(this.project.name, labelOffset, 0)
      
      // Optional category label on hover/select
      if (this.hover || this.selected) {
        ctx.font = `600 8px "JetBrains Mono",monospace`
        ctx.fillStyle = this.color
        ctx.globalAlpha = alpha
        ctx.fillText(this.project.kind.toUpperCase(), labelOffset, 12)
        ctx.globalAlpha = 1
      }

      ctx.restore()
    }

    hit(mx, my) {
      // Larger hit area for easier interaction with points
      const hitRadius = Math.max(10, this.radius * 2.5 * this.scale)
      return dist2(mx, my, this.x, this.y) <= (hitRadius ** 2)
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
      panel.querySelector('[data-panel-role]').textContent     = p.kind.toUpperCase()
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
        ctx.strokeStyle = (isActive) ? a.color : `rgba(124,92,255,${alpha})`
        ctx.lineWidth = isActive ? 1.5 : 0.8
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
        n.repulse(nodes)
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
