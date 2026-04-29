/**
 * wave.js — Lume brand wave background
 * Vanilla JS, zero external dependencies.
 * Adapted from wave-background component; palette matched to Lume briefing.
 */

/* ── Perlin noise (drop-in for simplex-noise createNoise2D) ──── */
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
/**
 * @param {HTMLElement} container  — the element to draw inside (needs position:relative)
 * @param {object}      options
 * @param {string}  options.strokeColor   — CSS color string
 * @param {number}  options.xGap          — horizontal line spacing in px
 * @param {number}  options.yGap          — vertical point spacing in px
 * @param {number}  options.amplitude     — overall wave amplitude multiplier (0–1)
 * @returns {function}  cleanup() — call to remove listeners and cancel animation
 */
export function initWaveBg(container, {
  strokeColor = 'rgba(15, 61, 62, 0.11)',
  xGap = 20,
  yGap = 20,
  amplitude = 1,
} = {}) {
  if (!container) return () => {};

  const noise2D = createNoise2D();

  /* Build SVG */
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;overflow:hidden;';
  container.appendChild(svg);

  /* State */
  let mouse = { x: -600, y: 0, lx: 0, ly: 0, sx: -600, sy: 0, v: 0, vs: 0, a: 0, set: false };
  let lines = [], paths = [], bounding = null, raf = null;

  /* Cursor dot */
  const dot = document.createElement('div');
  dot.style.cssText = [
    'position:fixed',
    'width:10px',
    'height:10px',
    'border-radius:50%',
    'background:rgba(15,61,62,0.65)',
    'pointer-events:none',
    'transform:translate(-50%,-50%)',
    'transition:opacity 0.3s',
    'z-index:9999',
    'opacity:0',
  ].join(';');
  document.body.appendChild(dot);
  let dotRawX = -100, dotRawY = -100, dotX = -100, dotY = -100;

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

  /* ── Mouse ── */
  function onMouseMove(e) {
    dotRawX = e.clientX;
    dotRawY = e.clientY;
    dot.style.opacity = '1';

    if (!bounding) return;
    const rect = container.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    if (!mouse.set) {
      mouse.sx = mouse.x; mouse.sy = mouse.y;
      mouse.lx = mouse.x; mouse.ly = mouse.y;
      mouse.set = true;
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

        /* Cursor repulsion — stronger radius, larger displacement */
        const dx = p.x - mouse.sx, dy = p.y - mouse.sy;
        const d  = Math.hypot(dx, dy);
        const l  = Math.max(240, mouse.vs * 1.8);
        if (d < l) {
          const s = 1 - d / l;
          const f = Math.cos(d * 0.001) * s;
          p.cursor.vx += Math.cos(mouse.a) * f * l * mouse.vs * 0.00072 * A;
          p.cursor.vy += Math.sin(mouse.a) * f * l * mouse.vs * 0.00072 * A;
        }

        /* Spring restore — softer spring = bigger sustained displacement */
        p.cursor.vx += (0 - p.cursor.x) * 0.007;
        p.cursor.vy += (0 - p.cursor.y) * 0.007;
        p.cursor.vx *= 0.91;
        p.cursor.vy *= 0.91;
        p.cursor.x  += p.cursor.vx;
        p.cursor.y  += p.cursor.vy;
        p.cursor.x   = Math.min(80, Math.max(-80, p.cursor.x));
        p.cursor.y   = Math.min(80, Math.max(-80, p.cursor.y));
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
    /* Animate cursor dot with slight lag */
    dotX += (dotRawX - dotX) * 0.18;
    dotY += (dotRawY - dotY) * 0.18;
    dot.style.left = dotX + 'px';
    dot.style.top  = dotY + 'px';

    mouse.sx += (mouse.x - mouse.sx) * 0.12;
    mouse.sy += (mouse.y - mouse.sy) * 0.12;

    const dx = mouse.x - mouse.lx, dy = mouse.y - mouse.ly;
    const d  = Math.hypot(dx, dy);
    mouse.v   = d;
    mouse.vs += (d - mouse.vs) * 0.1;
    mouse.vs  = Math.min(100, mouse.vs);
    mouse.lx  = mouse.x; mouse.ly = mouse.y;
    mouse.a   = Math.atan2(dy, dx);

    movePoints(t);
    drawLines();
    raf = requestAnimationFrame(tick);
  }

  /* ── Boot ── */
  const onResize = () => { setSize(); setLines(); };
  window.addEventListener('resize',     onResize);
  window.addEventListener('mousemove',  onMouseMove);

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
