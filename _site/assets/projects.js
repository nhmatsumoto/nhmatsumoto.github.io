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
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y)
    ctx.arcTo(x + w, y, x + w, y + r, r); ctx.lineTo(x + w, y + h - r)
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r); ctx.lineTo(x + r, y + h)
    ctx.arcTo(x, y + h, x, y + h - r, r); ctx.lineTo(x, y + r)
    ctx.arcTo(x, y, x + r, y, r); ctx.closePath()
  }

  function wrapLines(ctx, text, maxW) {
    const words = String(text || '').split(' ')
    const lines = []
    let line = ''
    for (const word of words) {
      const test = line ? line + ' ' + word : word
      if (ctx.measureText(test).width > maxW && line) {
        lines.push(line)
        line = word
        if (lines.length >= 8) { lines.push('…'); break }
      } else {
        line = test
      }
    }
    if (line && lines.length < 8) lines.push(line)
    return lines
  }

  const ANIM_DRIVERS = {
    fade(rs, p) { rs.alpha = easeOut(p); rs.scale = 1 },
    slide_right(rs, p) { rs.alpha = easeOut(p); rs.tx = lerp(-40, 0, easeOut(p)); rs.scale = 1 },
    zoom(rs, p) { rs.alpha = easeOut(p); rs.scale = 0.9 + 0.1 * easeOut(p) },
    typewriter(rs, p, node) {
      rs.alpha = 1; rs.scale = 1
      const total = (node.section.title || '').length + (node.section.content || '').length
      rs.revealChars = Math.floor(easeOut(p) * total)
    }
  }

  const MODE = { EXPLORE: 'explore', READ: 'read' }

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
    central:  '#FF3E00', // Hiro Red/Orange
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
      this.radius = project.kind === 'central' ? 18 : 12
      
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
      const labelAlpha = (this.hover || this.selected) ? 1 : 0.75
      const fontSize = this.project.kind === 'central' ? 16 : 14
      ctx.font = `500 ${fontSize}px "Inter",system-ui,sans-serif`
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

  // ─── Section Node (Reader Mode) ───────────────────────────────────────────
  class SectionNode {
    constructor(section, color) {
      this.section = section
      this.color = color
      this.x = 0; this.y = 0; this.tx = 0; this.ty = 0
      this.W = 320; this.H = 200
      this.alpha = 0; this.scale = 0.95
      this.rs = { alpha: 0, tx: 0, ty: 0, scale: 1, revealChars: 0 }
      this.animStartT = 0
      this.active = false
      this.hover = false
    }

    enter(t) {
      this.active = true
      this.animStartT = t
    }

    update(t) {
      this.x = lerp(this.x, this.tx, 0.1)
      this.y = lerp(this.y, this.ty, 0.1)
      const p = clamp((t - this.animStartT) / 0.8, 0, 1)
      const driver = ANIM_DRIVERS[this.section.animation] || ANIM_DRIVERS.fade
      driver(this.rs, p, this)
      this.alpha = this.rs.alpha
    }

    wrapText(ctx, text, x, y, maxW, lineH) {
      const words = String(text || '').split(' ')
      let line = ''
      let curY = y

      for (const word of words) {
        const test = line ? line + ' ' + word : word
        if (ctx.measureText(test).width > maxW && line) {
          this.renderLine(ctx, line, x, curY)
          line = word
          curY += lineH
        } else {
          line = test
        }
      }
      this.renderLine(ctx, line, x, curY)
    }

    renderLine(ctx, line, x, y) {
      // Basic Math Highlighting: renders text between $...$ in a different style
      const parts = line.split(/(\$.*?\$)/g)
      let curX = x
      ctx.textAlign = 'left'
      
      for (const part of parts) {
        if (part.startsWith('$') && part.endsWith('$')) {
          ctx.font = `italic 14px "serif"`
          ctx.fillStyle = '#00C2FF'
          const clean = part.slice(1, -1)
          ctx.fillText(clean, curX, y)
          curX += ctx.measureText(clean).width
        } else {
          ctx.font = `14px Inter`
          ctx.fillStyle = `rgba(255, 255, 255, 0.85)`
          ctx.fillText(part, curX, y)
          curX += ctx.measureText(part).width
        }
      }
    }

    draw(ctx, t) {
      if (this.alpha < 0.01) return
      const fade = this.alpha
      
      ctx.save()
      ctx.translate(this.x + (this.rs.tx || 0), this.y + (this.rs.ty || 0))
      ctx.scale(this.rs.scale, this.rs.scale)

      const hw = this.W / 2, hh = this.H / 2
      
      // Optimized Glass Terminal Card Design
      ctx.fillStyle = 'rgba(10, 15, 25, 0.95)'
      ctx.strokeStyle = `rgba(0, 194, 255, ${0.4 * fade})`
      ctx.lineWidth = 1
      
      // Outer Glow / Shadow
      ctx.shadowBlur = 15 * fade
      ctx.shadowColor = 'rgba(0, 194, 255, 0.2)'
      
      // Use the global roundRect function
      roundRect(ctx, -hw, -hh, this.W, this.H, 8)
      ctx.fill()
      ctx.stroke()
      
      ctx.shadowBlur = 0
      
      // Internal Header
      ctx.fillStyle = `rgba(0, 194, 255, ${0.1 * fade})`
      roundRect(ctx, -hw + 1, -hh + 1, this.W - 2, 40, 7) // Using 7 for top corners roughly
      ctx.fill()
      
      // Title
      ctx.fillStyle = `rgba(255, 255, 255, ${fade})`
      ctx.font = `bold 16px Inter`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillText(this.section.title, -hw + 20, -hh + 14)
      
      // Content body
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      this.wrapText(ctx, this.section.content, -hw + 20, -hh + 54, this.W - 40, 22)
      
      // Type Tag
      ctx.font = `bold 9px "JetBrains Mono"`
      ctx.fillStyle = `rgba(0, 194, 255, ${0.8 * fade})`
      ctx.fillText(this.section.type.toUpperCase(), hw - 70, -hh + 18)
      
      ctx.restore()
    }

    hit(mx, my) {
      return mx >= this.x - this.W/2 && mx <= this.x + this.W/2 &&
             my >= this.y - this.H/2 && my <= this.y + this.H/2
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
    let currentMode = MODE.EXPLORE
    let readerNodes = [], readerConns = []
    let backBtn = null
    
    let dragging = false, dragSX = 0, dragSY = 0, panSX = 0, panSY = 0
    let breadcrumbs = [
      { label: 'Home', url: '/' },
      { label: 'Projects', url: '/projects/' }
    ]

    // ── Layout ───────────────────────────────────────────────────
    function layout() {
      W = wrapper.clientWidth
      // Fill the remaining viewport height
      const navH = 56 // estimated
      const footH = 48 // estimated
      H = Math.max(window.innerHeight - navH - footH - 40, 520)
      
      canvas.width  = W * dpr
      canvas.height = H * dpr
      canvas.style.width  = W + 'px'
      canvas.style.height = H + 'px'

      const phi    = (1 + Math.sqrt(5)) / 2
      const cx     = W / 2
      const cy     = H / 2
      const spread = Math.min(W * 0.4, H * 0.4)
      const n      = projects.length
      const hiro   = { kind: 'central', name: 'Hiro', headline: 'Central Intelligence', summary: 'Nó central de conhecimento do ecossistema.', stack: [], url: '/' }

      // Central Node: Hiro
      nodes = [new ProjectNode(hiro, cx, cy, 0)]

      // Circumference layout
      projects.forEach((p, i) => {
        const angle = i * 2 * Math.PI / n
        const r     = spread * (0.7 + 0.3 * Math.random())
        nodes.push(new ProjectNode(p, cx + r * Math.cos(angle), cy + r * Math.sin(angle), i + 1))
      })

      particles = Array.from({ length: 80 }, () => new Particle())

      connections = []
      const centralNode = nodes[0]
      // Connect everything to Hiro
      nodes.slice(1).forEach(node => {
        connections.push({ a: centralNode, b: node, w: 2 })
      })

      if (!backBtn) createBackBtn()
    }

    function createBackBtn() {
      backBtn = document.createElement('button')
      backBtn.className = 'nav-button'
      backBtn.style.cssText = 'position:absolute;top:16px;right:16px;z-index:100;display:none;align-items:center;gap:8px;background:var(--surface-strong);border:1px solid var(--accent);color:var(--accent);padding:6px 12px;border-radius:6px;font-size:12px;font-weight:700;text-transform:uppercase;cursor:pointer;transition:all 0.2s;'
      backBtn.innerHTML = '<i data-lucide="arrow-left" style="width:14px;height:14px"></i> Voltar ao Mapa'
      wrapper.appendChild(backBtn)
      backBtn.onclick = transitionToExplorer
      if (window.lucide) window.lucide.createIcons()
    }

    function transitionToReader(project) {
      currentMode = MODE.READ
      hidePanel()
      backBtn.style.display = 'flex'
      
      const sections = project.sections || []
      const nodeMap = {}
      readerNodes = []
      readerConns = []

      sections.forEach(s => {
        const rn = new SectionNode(s, KIND_COLOR[project.kind] || '#00C2FF')
        nodeMap[s.id] = rn
        readerNodes.push(rn)
      })

      // Simple Binary Tree Layout (Vertical)
      const NODE_GAP_X = 360, NODE_GAP_Y = 240
      function layoutNode(id, x, y) {
        const node = nodeMap[id]
        if (!node) return
        node.tx = x; node.ty = y
        node.x = W / 2; node.y = H / 2 // Transition from center
        node.enter(performance.now() / 1000)
        
        const children = node.section.children || []
        if (children.length > 0) {
          const startX = x - ((children.length - 1) * NODE_GAP_X) / 2
          children.forEach((cid, i) => {
            const childNode = nodeMap[cid]
            if (childNode) {
              layoutNode(cid, startX + i * NODE_GAP_X, y + NODE_GAP_Y)
              readerConns.push({ a: node, b: childNode })
            }
          })
        }
      }

      if (sections.length > 0) layoutNode(sections[0].id, W / 2, 120)
      
      // Reset Pan/Zoom
      panX = 0; panY = 0; viewScale = 1; targetScale = 1
    }

    function transitionToExplorer() {
      currentMode = MODE.EXPLORE
      backBtn.style.display = 'none'
      if (selected) {
        selected.selected = false
        selected = null
      }
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
      link.href = '#'
      link.onclick = (e) => { e.preventDefault(); transitionToReader(p) }

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

    // ── Interaction Helpers ─────────────────────────────────────
    function toWorld(sx, sy) {
      if (currentMode === MODE.EXPLORE) return { x: sx, y: sy }
      return {
        x: (sx - W / 2 - panX) / viewScale + W / 2,
        y: (sy - H / 2 - panY) / viewScale + H / 2
      }
    }

    // ── Input ────────────────────────────────────────────────────
    canvas.addEventListener('mousemove', e => {
      const r = canvas.getBoundingClientRect()
      const mx = e.clientX - r.left
      const my = e.clientY - r.top
      mouseX = mx; mouseY = my

      if (currentMode === MODE.EXPLORE) {
        nodes.forEach(n => { n.hover = !selected && n.hit(mouseX, mouseY) })
        canvas.style.cursor = nodes.some(n => n.hover) ? 'pointer' : 'crosshair'
      } else {
        if (dragging) {
          panX = panSX + (mx - dragSX)
          panY = panSY + (my - dragSY)
          return
        }
        const w = toWorld(mx, my)
        readerNodes.forEach(n => { n.hover = n.hit(w.x, w.y) })
        canvas.style.cursor = readerNodes.some(n => n.hover) ? 'pointer' : 'grab'
      }
    })

    canvas.addEventListener('mousedown', e => {
      if (currentMode !== MODE.READ) return
      const r = canvas.getBoundingClientRect()
      dragging = true
      dragSX = e.clientX - r.left
      dragSY = e.clientY - r.top
      panSX = panX; panSY = panY
      canvas.style.cursor = 'grabbing'
    })

    window.addEventListener('mouseup', () => {
      dragging = false
      canvas.style.cursor = currentMode === MODE.EXPLORE ? 'crosshair' : 'grab'
    })

    canvas.addEventListener('wheel', e => {
      if (currentMode !== MODE.READ) return
      e.preventDefault()
      targetScale = clamp(targetScale * (e.deltaY < 0 ? 1.1 : 0.9), 0.5, 3)
    }, { passive: false })

    canvas.addEventListener('mouseleave', () => {
      nodes.forEach(n => { n.hover = false })
      canvas.style.cursor = 'crosshair'
    })

    canvas.addEventListener('click', e => {
      const r  = canvas.getBoundingClientRect()
      const mx = e.clientX - r.left
      const my = e.clientY - r.top

      // Check breadcrumbs
      for (const bc of breadcrumbs) {
        if (mx >= bc.x - 5 && mx <= bc.x + bc.w + 5 && my >= 30 - 10 && my <= 30 + 10) {
          window.location.href = bc.url
          return
        }
      }

      if (currentMode === MODE.EXPLORE) {
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

      // ── In-Canvas Breadcrumbs ──────────────────────────────────
      drawBreadcrumbs(ctx)

      // Background: subtle dot grid
      ctx.fillStyle = 'rgba(0,194,255,0.035)'
      const gs = 48
      for (let gx = gs / 2; gx < W; gx += gs)
        for (let gy = gs / 2; gy < H; gy += gs) {
          ctx.beginPath()
          ctx.arc(gx, gy, 1, 0, Math.PI * 2)
          ctx.fill()
        }

      // Smooth zoom
      viewScale = lerp(viewScale, targetScale, 0.1)

      ctx.save()
      if (currentMode === MODE.READ) {
        ctx.translate(W / 2 + panX, H / 2 + panY)
        ctx.scale(viewScale, viewScale)
        ctx.translate(-W / 2, -H / 2)
      } else {
        // Particles only in Explore mode
        for (const p of particles) { p.update(); p.draw(ctx, W, H) }
      }

      if (currentMode === MODE.EXPLORE) {
        // Connections
        for (const { a, b, w } of connections) {
          const isActive = selected && (a === selected || b === selected)
          const alpha = selected ? (isActive ? 0.45 : 0.04) : 0.13
          const mx2 = (a.x + b.x) / 2
          const my2 = (a.y + b.y) / 2
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
        
        for (const n of nodes) {
          n.repulse(nodes)
          n.update(t, mouseX, mouseY)
          n.draw(ctx, t, selected && selected !== n)
        }
      } else {
        // Reader Mode
        ctx.setLineDash([4, 6])
        for (const conn of readerConns) {
          ctx.beginPath()
          ctx.moveTo(conn.a.x, conn.a.y + conn.a.H/2)
          ctx.lineTo(conn.b.x, conn.b.y - conn.b.H/2)
          ctx.strokeStyle = 'rgba(0,194,255,0.15)'
          ctx.stroke()
        }
        ctx.setLineDash([])
        
        for (const n of readerNodes) {
          n.update(t)
          n.draw(ctx, t)
        }
      }

      ctx.restore()
      requestAnimationFrame(draw)
    }

    function drawBreadcrumbs(ctx) {
      ctx.save()
      ctx.font = '600 12px "JetBrains Mono",monospace'
      let curX = 30
      const curY = 30
      
      breadcrumbs.forEach((bc, i) => {
        const label = bc.label.toUpperCase()
        const tw = ctx.measureText(label).width
        
        // Hover state (simplified)
        const isHover = mouseX >= curX - 5 && mouseX <= curX + tw + 5 && mouseY >= curY - 10 && mouseY <= curY + 10
        ctx.fillStyle = isHover ? '#00C2FF' : 'rgba(255,255,255,0.4)'
        ctx.fillText(label, curX, curY)
        
        bc.x = curX; bc.w = tw
        curX += tw + 10
        
        if (i < breadcrumbs.length - 1) {
          ctx.fillStyle = 'rgba(255,255,255,0.15)'
          ctx.fillText('/', curX, curY)
          curX += 15
        }
      })
      ctx.restore()
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
