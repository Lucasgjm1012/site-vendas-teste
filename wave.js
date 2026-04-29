/**
 * wave.js — Lume brand wave background
 * Vanilla JS, zero external dependencies.
 */

/* ── Perlin noise ──────────────────────────────────────────────── */
function createNoise2D() {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = p[i]; p[i] = p[j]; p[j] = t;
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

  const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (t, a, b) => a + t * (b - a);
  const grad = (h, x, y) => {
    const u = (h & 3) < 2 ? x : y;
    const v = (h & 3) < 2 ? y : x;
    return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
  };

  return (x, y) => {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    x -= Math.floor(x); y -= Math.floor(y);
    const u = fade(x), v = fade(y);
    const a = perm[X] + Y, b = perm[X + 1] + Y;
    return lerp(v,
      lerp(u, grad(perm[a],     x,     y), grad(perm[b],     x - 1, y)),
      lerp(u, grad(perm[a + 1], x,     y - 1), grad(perm[b + 1], x - 1, y - 1))
    );
  };
}

/* ── Wave initializer ─────────────────────────────────────────── */
export function initWaveBg(container, {
  strokeColor = 'rgba(15, 61, 62, 0.11)',
  xGap = 20,
  yGap = 20,
  amplitude = 1,
} = {}) {
  if (!container) return () => {};

  const noise2D = createNoise2D();

  /* SVG layer */
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;overflow:hidden;';
  container.appendChild(svg);

  /* Cursor dot — lives in container, shown/hidden via opacity */
  const dot = document.createElement('div');
  dot.style.cssText = 'position:absolute;width:7px;height:7px;border-radius:50%;background:rgba(15,61,62,0.5);transform:translate(-50%,-50%);pointer-events:none;opacity:0;z-index:2;transition:opacity 300ms ease;';
  container.appendChild(dot);

  /* State */
  let mouse = { x: -9999, y: 0, lx: 0, ly: 0, sx: -9999, sy: 0, v: 0, vs: 0, a: 0, set: false };
  let lines = [], paths = [], bounding = null, raf = null;

  /* ── Size ── */
  function setSize() {
    bounding = container.getBoundingClientRect();
    svg.style.width  = bounding.width  + 'px';
    svg.style.height = bounding.height + 'px';
  }

  /* ── Lines ── */
  function setLines() {
    if (!bounding) return;
    const { width, height } = bounding;
    paths.forEach(p => p.remove());
    paths = []; lines = [];

    const totalLines  = Math.ceil((width  + 200) / xGap);
    const totalPoints = Math.ceil((height + 30)  / yGap);
    const xStart = (width  - xGap * totalLines)  / 2;
    const yStart = (height - yGap * totalPoints) / 2;

    for (let i = 0; i < totalLines; i++) {
      const pts = [];
      for (let j = 0; j < totalPoints; j++) {
        pts.push({
          x: xStart + xGap * i,
          y: yStart + yGap * j,
          wave:   { x: 0, y: 0 },
          cursor: { x: 0, y: 0, vx: 0, vy: 0 },
        });
      }
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('fill',         'none');
      path.setAttribute('stroke',       strokeColor);
      path.setAttribute('stroke-width', '1');
      svg.appendChild(path);
      paths.push(path);
      lines.push(pts);
    }
  }

  /* ── Mouse — uses window listener so pointer-events:none on container is no problem ── */
  function onMouseMove(e) {
    if (!bounding) return;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    /* Show dot only when cursor is actually inside the wave panel */
    const inside = x >= 0 && x <= rect.width && y >= 0 && y <= rect.height;
    dot.style.opacity = inside ? '1' : '0';

    if (inside) {
      mouse.x = x;
      mouse.y = y;
      if (!mouse.set) {
        mouse.sx = x; mouse.sy = y;
        mouse.lx = x; mouse.ly = y;
        mouse.set = true;
      }
    } else {
      mouse.x = -9999;
    }
  }

  /* ── Point physics ── */
  function movePoints(time) {
    const A = amplitude;
    lines.forEach(pts => {
      pts.forEach(p => {
        /* Organic wave */
        const n = noise2D(
          (p.x + time * 0.006) * 0.0035,
          (p.y + time * 0.002) * 0.0028
        ) * 6 * A;
        p.wave.x = Math.cos(n) * 11 * A;
        p.wave.y = Math.sin(n) * 5  * A;

        /* Cursor repulsion — stronger force, larger radius */
        const dx = p.x - mouse.sx, dy = p.y - mouse.sy;
        const d  = Math.hypot(dx, dy);
        const l  = Math.max(160, mouse.vs);
        if (d < l) {
          const s = 1 - d / l;
          const f = Math.cos(d * 0.001) * s;
          p.cursor.vx += Math.cos(mouse.a) * f * l * mouse.vs * 0.00055 * A;
          p.cursor.vy += Math.sin(mouse.a) * f * l * mouse.vs * 0.00055 * A;
        }

        /* Spring restore — softer spring = displacement lingers longer */
        p.cursor.vx += (0 - p.cursor.x) * 0.009;
        p.cursor.vy += (0 - p.cursor.y) * 0.009;
        p.cursor.vx *= 0.91;
        p.cursor.vy *= 0.91;
        p.cursor.x  += p.cursor.vx;
        p.cursor.y  += p.cursor.vy;
        p.cursor.x   = Math.min(75, Math.max(-75, p.cursor.x));
        p.cursor.y   = Math.min(75, Math.max(-75, p.cursor.y));
      });
    });
  }

  const moved = (p, cur = true) => ({
    x: p.x + p.wave.x + (cur ? p.cursor.x : 0),
    y: p.y + p.wave.y + (cur ? p.cursor.y : 0),
  });

  /* ── Draw ── */
  function drawLines() {
    lines.forEach((pts, idx) => {
      if (pts.length < 2 || !paths[idx]) return;
      const f = moved(pts[0], false);
      let d = `M ${f.x.toFixed(2)} ${f.y.toFixed(2)}`;
      for (let i = 1; i < pts.length; i++) {
        const c = moved(pts[i]);
        d += ` L ${c.x.toFixed(2)} ${c.y.toFixed(2)}`;
      }
      paths[idx].setAttribute('d', d);
    });
  }

  /* ── Tick ── */
  function tick(t) {
    mouse.sx += (mouse.x - mouse.sx) * 0.1;
    mouse.sy += (mouse.y - mouse.sy) * 0.1;

    const dx = mouse.x - mouse.lx, dy = mouse.y - mouse.ly;
    const dist = Math.hypot(dx, dy);
    mouse.v   = dist;
    mouse.vs += (dist - mouse.vs) * 0.12;
    mouse.vs  = Math.min(200, mouse.vs);
    mouse.lx  = mouse.x; mouse.ly = mouse.y;
    mouse.a   = Math.atan2(dy, dx);

    /* Update dot position to smoothed mouse */
    dot.style.left = mouse.sx + 'px';
    dot.style.top  = mouse.sy + 'px';

    movePoints(t);
    drawLines();
    raf = requestAnimationFrame(tick);
  }

  /* ── Boot ── */
  const onResize = () => { setSize(); setLines(); };
  window.addEventListener('resize',    onResize);
  window.addEventListener('mousemove', onMouseMove);

  setSize();
  setLines();
  raf = requestAnimationFrame(tick);

  /* ── Cleanup ── */
  return () => {
    if (raf) cancelAnimationFrame(raf);
    window.removeEventListener('resize',    onResize);
    window.removeEventListener('mousemove', onMouseMove);
    svg.remove();
    dot.remove();
  };
}
