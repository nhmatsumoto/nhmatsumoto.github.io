/* Black hole hero wallpaper.
   Original canvas effect inspired by the "dark dome over a light horizon"
   concept: a black dome rising behind a horizontal beam of light, violet
   bloom, thin orbital arcs with drifting nodes, rising sparks and a star
   field. Respects reduced motion and pauses off-screen / hidden tab. */
(() => {
  "use strict";

  const canvas = document.querySelector("[data-blackhole]");
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let w = 0, h = 0, cx = 0, cy = 0, R = 0, beamY = 0;
  let stars = [], sparks = [], nodes = [];
  let raf = 0, running = false, inView = true;

  const rand = (a, b) => a + Math.random() * (b - a);
  const TAU = Math.PI * 2;
  const ARCS = [1.55, 2.1, 2.75]; /* orbital arc radii, relative to R */

  const spawnSpark = () => {
    const ang = rand(Math.PI * 1.05, Math.PI * 1.95); /* upper rim */
    return {
      x: cx + Math.cos(ang) * R * rand(1.0, 1.15),
      y: cy + Math.sin(ang) * R * rand(1.0, 1.15),
      vx: rand(-4, 4),
      vy: rand(-14, -5),
      life: rand(2.5, 6),
      age: rand(0, 2.5),
      size: rand(0.6, 1.8),
    };
  };

  const build = () => {
    const starCount = Math.min(220, Math.round((w * h) / 8000));
    stars = Array.from({ length: starCount }, () => ({
      x: rand(0, w),
      y: rand(0, h),
      r: rand(0.4, 1.3),
      tw: rand(0, TAU),
      sp: rand(0.3, 1.4),
    }));
    sparks = Array.from({ length: 42 }, spawnSpark);
    nodes = ARCS.map((k, i) => ({
      k,
      a: rand(0, TAU),
      sp: (0.05 + 0.03 * i) * (i % 2 ? -1 : 1),
    }));
  };

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = Math.max(1, Math.round(rect.width));
    h = Math.max(1, Math.round(rect.height));
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = w > 720 ? w * 0.74 : w * 0.5;
    cy = h * 0.56;
    R = Math.max(64, Math.min(Math.min(w, h) * 0.27, 180));
    beamY = cy + R * 0.6;
    build();
    if (REDUCED) draw(9000, 0);
  };

  const drawBeam = (pulse) => {
    const u = cx / w;
    const spread = 0.48;
    const stop = (o) => Math.min(1, Math.max(0, u + o));
    /* wide soft band */
    let g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(stop(-spread), "rgba(139, 92, 246, 0)");
    g.addColorStop(u, "rgba(167, 139, 250, " + (0.34 * pulse).toFixed(3) + ")");
    g.addColorStop(stop(spread), "rgba(139, 92, 246, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, beamY - 26, w, 52);
    /* tight bright band */
    g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(stop(-spread * 0.85), "rgba(196, 160, 255, 0)");
    g.addColorStop(u, "rgba(226, 205, 255, " + (0.75 * pulse).toFixed(3) + ")");
    g.addColorStop(stop(spread * 0.85), "rgba(196, 160, 255, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, beamY - 5, w, 10);
    /* white-hot core line */
    g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(stop(-spread * 0.7), "rgba(255, 255, 255, 0)");
    g.addColorStop(u, "rgba(255, 250, 255, " + (0.95 * pulse).toFixed(3) + ")");
    g.addColorStop(stop(spread * 0.7), "rgba(255, 255, 255, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, beamY - 1.2, w, 2.4);
  };

  const draw = (t, dt) => {
    const sec = t / 1000;
    const pulse = 1 + 0.07 * Math.sin(sec * 0.9);
    ctx.clearRect(0, 0, w, h);

    /* star field */
    ctx.fillStyle = "#d9d2ff";
    for (const s of stars) {
      ctx.globalAlpha = 0.25 + 0.4 * (0.5 + 0.5 * Math.sin(s.tw + sec * s.sp));
      ctx.fillRect(s.x, s.y, s.r, s.r);
    }
    ctx.globalAlpha = 1;

    /* orbital arcs with drifting nodes */
    ctx.globalCompositeOperation = "lighter";
    ARCS.forEach((k, i) => {
      ctx.beginPath();
      ctx.arc(cx, cy, R * k, Math.PI, TAU); /* upper half only */
      ctx.strokeStyle = "rgba(190, 170, 255, " + (0.12 - i * 0.03).toFixed(3) + ")";
      ctx.lineWidth = 1;
      ctx.stroke();
      const n = nodes[i];
      n.a += n.sp * dt;
      const na = Math.PI + ((Math.sin(n.a) + 1) / 2) * Math.PI; /* stay on top */
      const nx = cx + Math.cos(na) * R * k;
      const ny = cy + Math.sin(na) * R * k;
      const ng = ctx.createRadialGradient(nx, ny, 0, nx, ny, 5);
      ng.addColorStop(0, "rgba(230, 215, 255, 0.9)");
      ng.addColorStop(1, "rgba(230, 215, 255, 0)");
      ctx.fillStyle = ng;
      ctx.fillRect(nx - 5, ny - 5, 10, 10);
    });

    /* bloom above the horizon: wide but restrained haze */
    const glow = ctx.createRadialGradient(cx, cy, R * 0.4, cx, cy, R * 2.8);
    glow.addColorStop(0, "rgba(124, 58, 237, " + (0.3 * pulse).toFixed(3) + ")");
    glow.addColorStop(0.5, "rgba(109, 40, 217, " + (0.12 * pulse).toFixed(3) + ")");
    glow.addColorStop(1, "rgba(76, 29, 149, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    /* rising sparks */
    for (let i = 0; i < sparks.length; i++) {
      const p = sparks[i];
      p.age += dt;
      if (p.age >= p.life) { sparks[i] = spawnSpark(); sparks[i].age = 0; continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const k = p.age / p.life;
      ctx.globalAlpha = Math.sin(Math.PI * k) * 0.8;
      ctx.fillStyle = "#e6d9ff";
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    /* white-hot rim: an annulus so the dome interior stays black */
    const rimInner = R * 0.99;
    const rimOuter = R * 1.55;
    const rim = ctx.createRadialGradient(cx, cy, rimInner, cx, cy, rimOuter);
    rim.addColorStop(0, "rgba(244, 234, 255, " + (0.85 * pulse).toFixed(3) + ")");
    rim.addColorStop(0.1, "rgba(196, 148, 255, " + (0.5 * pulse).toFixed(3) + ")");
    rim.addColorStop(0.35, "rgba(150, 95, 250, " + (0.22 * pulse).toFixed(3) + ")");
    rim.addColorStop(1, "rgba(120, 70, 240, 0)");
    ctx.fillStyle = rim;
    ctx.beginPath();
    ctx.arc(cx, cy, rimOuter, 0, TAU);
    ctx.arc(cx, cy, rimInner, 0, TAU, true);
    ctx.fill();

    /* the black dome */
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#04020c";
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.fill();

    ctx.globalCompositeOperation = "lighter";

    /* horizontal light beam in front of the dome */
    drawBeam(pulse);

    /* fade everything below the horizon so the dome reads as rising */
    ctx.globalCompositeOperation = "source-over";
    const ground = ctx.createLinearGradient(0, beamY + 4, 0, beamY + R * 1.1);
    ground.addColorStop(0, "rgba(8, 6, 20, 0)");
    ground.addColorStop(0.45, "rgba(8, 6, 20, 0.55)");
    ground.addColorStop(1, "rgba(8, 6, 20, 0.92)");
    ctx.fillStyle = ground;
    ctx.fillRect(0, beamY + 4, w, h - beamY);
  };

  let last = 0;
  const loop = (t) => {
    const dt = Math.min(0.05, (t - last) / 1000 || 0.016);
    last = t;
    draw(t, dt);
    raf = window.requestAnimationFrame(loop);
  };

  const sync = () => {
    const shouldRun = inView && !document.hidden && !REDUCED;
    if (shouldRun && !running) {
      running = true;
      last = 0;
      raf = window.requestAnimationFrame(loop);
    } else if (!shouldRun && running) {
      running = false;
      window.cancelAnimationFrame(raf);
    }
  };

  resize();
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", sync);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      inView = entries[0].isIntersecting;
      sync();
    }).observe(canvas);
  }
  sync();
})();
