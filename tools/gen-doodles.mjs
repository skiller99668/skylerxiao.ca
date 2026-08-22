/* Generates the margin-doodle <symbol> paths in index.html.

     node tools/gen-doodles.mjs

   then paste the output over the d-* symbols in the sprite. Seeded, so the
   art in the page is reproducible: same seed, same scrawl. Nothing at build
   or run time calls this — it is a one-shot authoring tool, which is why the
   output is committed rather than generated on the fly.

   The point of generating them is irregularity. Scribbles read as scribbles
   because no lap lands on the one before it, and curves authored by hand
   come out far too even to pass. */

function rng(seed) {                       // mulberry32
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r1 = (n) => Math.round(n * 10) / 10;

/* Catmull-Rom through the points, emitted as cubics. A scribble is one
   continuous gesture, so the whole lot stays a single subpath. */
function smooth(pts) {
  let d = `M${r1(pts[0][0])} ${r1(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${r1(c1[0])} ${r1(c1[1])} ${r1(c2[0])} ${r1(c2[1])} ${r1(p2[0])} ${r1(p2[1])}`;
  }
  return d;
}

const clamp = (v) => Math.max(4, Math.min(96, v));

/* Straight-segment version, for the marks a pen makes in one flick —
   zigzags and spikes keep their corners instead of being rounded off. */
function poly(pts) {
  return 'M' + pts.map((p) => `${r1(p[0])} ${r1(p[1])}`).join('L');
}

/* Scale a free-running walk into the box. Clamping is wrong for anything
   that can leave the frame: it pins stray points to the edge and leaves a
   dead straight run along it. Fitting keeps the shape and just resizes. */
function fit(pts, lo = 6, hi = 94) {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const y0 = Math.min(...ys), y1 = Math.max(...ys);
  const s = Math.min((hi - lo) / Math.max(x1 - x0, 0.001), (hi - lo) / Math.max(y1 - y0, 0.001));
  const ox = lo + ((hi - lo) - (x1 - x0) * s) / 2;
  const oy = lo + ((hi - lo) - (y1 - y0) * s) / 2;
  return pts.map((p) => [ox + (p[0] - x0) * s, oy + (p[1] - y0) * s]);
}

/* Fast oval scrawl: laps that drift instead of stacking. */
function scrawl(seed) {
  const rand = rng(seed);
  const pts = [];
  const laps = 4.3, step = 0.42, end = laps * Math.PI * 2;
  let cx = 50, cy = 50;
  for (let t = 0; t < end; t += step) {
    cx += (rand() - 0.5) * 1.1;            // the hand wanders as it goes
    cy += (rand() - 0.5) * 0.8;
    const k = t / end;
    const rx = 31 + Math.sin(t * 0.7) * 4 + (rand() - 0.5) * 5 - k * 3;
    const ry = 20 + Math.cos(t * 0.9) * 3 + (rand() - 0.5) * 4;
    pts.push([clamp(cx + Math.cos(t) * rx), clamp(cy + Math.sin(t) * ry)]);
  }
  return smooth(pts);
}

/* Spiral wound outward, wobbling as it opens. */
function coil(seed) {
  const rand = rng(seed);
  const pts = [];
  const end = 3.6 * Math.PI * 2, step = 0.38;
  for (let t = 0; t < end; t += step) {
    const r = 3 + (t / end) * 42 + (rand() - 0.5) * 3.4;
    pts.push([clamp(50 + Math.cos(t) * r), clamp(50 + Math.sin(t) * r * 0.94)]);
  }
  return smooth(pts);
}

/* Squiggle: amplitude and baseline both drift, so no two humps match. */
function wave(seed) {
  const rand = rng(seed);
  const pts = [];
  for (let i = 0; i <= 46; i++) {
    const k = i / 46;
    const x = 7 + k * 86;
    const amp = 17 + Math.sin(k * 5.1) * 6 + (rand() - 0.5) * 3;
    pts.push([x, clamp(50 + Math.sin(k * Math.PI * 7.4) * amp + (rand() - 0.5) * 2.6)]);
  }
  return smooth(pts);
}

/* Scratched asterisk: arms overshoot the middle and miss it slightly. */
function burst(seed) {
  const rand = rng(seed);
  const arms = [];
  for (let a = 0; a < 8; a++) {
    const ang = (a / 8) * Math.PI * 2 + (rand() - 0.5) * 0.18;
    const ox = (rand() - 0.5) * 6, oy = (rand() - 0.5) * 6;
    const len = 38 + (rand() - 0.5) * 10;
    const pts = [];
    for (let i = 0; i <= 5; i++) {
      const d = -8 + (i / 5) * (len + 8);   // starts past centre, so they cross
      const wob = (rand() - 0.5) * 3.2;
      pts.push([
        clamp(50 + ox + Math.cos(ang) * d - Math.sin(ang) * wob),
        clamp(50 + oy + Math.sin(ang) * d + Math.cos(ang) * wob)
      ]);
    }
    arms.push(smooth(pts));
  }
  return arms.join('');
}

/* Loop-de-loop chain — a trochoid with b > a, which is what makes the loop. */
function loops(seed) {
  const rand = rng(seed);
  const pts = [];
  const end = 4.75 * Math.PI * 2, step = 0.3;
  for (let t = 0; t < end; t += step) {
    // a and the reach have to keep a*end + b inside the box: clamping a loop
    // flat against the edge leaves a dead straight run that reads as a mistake.
    const a = 2.15, b = 12.6 + Math.sin(t * 0.4) * 2.2;
    pts.push([
      clamp(12 + a * t + b * Math.cos(t) + (rand() - 0.5) * 1.8),
      clamp(52 + b * Math.sin(t) + (rand() - 0.5) * 1.8 + Math.sin(t * 0.21) * 5)
    ]);
  }
  return smooth(pts);
}

/* Ring gone round two and a half times, never hitting the same line twice. */
function ring(seed) {
  const rand = rng(seed);
  const pts = [];
  const end = 2.55 * Math.PI * 2, step = 0.34;
  let cx = 50, cy = 50;
  for (let t = 0; t < end; t += step) {
    cx += (rand() - 0.5) * 0.9;
    cy += (rand() - 0.5) * 0.9;
    const r = 33 + Math.sin(t * 1.3) * 2.6 + (rand() - 0.5) * 3.6;
    pts.push([clamp(cx + Math.cos(t) * r), clamp(cy + Math.sin(t) * r)]);
  }
  return smooth(pts);
}

/* Hard zigzag — one flick back and forth, corners intact. */
function zigzag(seed) {
  const rand = rng(seed);
  const pts = [];
  for (let i = 0; i <= 13; i++) {
    const x = 8 + (i / 13) * 84 + (rand() - 0.5) * 3;
    const up = i % 2 === 0;
    pts.push([clamp(x), clamp(up ? 26 + (rand() - 0.5) * 8 : 72 + (rand() - 0.5) * 8)]);
  }
  return poly(pts);
}

/* Scribbled-in blob: rows walked side to side inside an ellipse, which is
   how a pen fills a shape when the point is to blot it out. */
function blob(seed) {
  const rand = rng(seed);
  const pts = [];
  const cx = 50, cy = 50, rx = 33, ry = 25;
  let dir = 1;
  for (let y = cy - ry; y <= cy + ry; y += 2.7) {
    const k = (y - cy) / ry;
    const half = rx * Math.sqrt(Math.max(0, 1 - k * k));
    pts.push([clamp(cx + dir * half + (rand() - 0.5) * 4), clamp(y + (rand() - 0.5) * 1.4)]);
    dir *= -1;
  }
  return smooth(pts);
}

/* Arrow: a shaft that bends, and a head drawn as two separate flicks. */
function arrow(seed) {
  const rand = rng(seed);
  const shaft = [];
  for (let i = 0; i <= 12; i++) {
    const k = i / 12;
    shaft.push([clamp(10 + k * 74), clamp(72 - k * 42 + Math.sin(k * 3.1) * 7 + (rand() - 0.5) * 2)]);
  }
  const tip = shaft[shaft.length - 1];
  const head1 = [[clamp(tip[0] - 21), clamp(tip[1] - 4)], [tip[0], tip[1]]];
  const head2 = [[clamp(tip[0] - 6), clamp(tip[1] + 20)], [tip[0], tip[1]]];
  return smooth(shaft) + poly(head1) + poly(head2);
}

/* Spiky star, alternating reach, drawn without lifting. */
function star(seed) {
  const rand = rng(seed);
  const pts = [];
  const n = 9;
  for (let i = 0; i <= n * 2; i++) {
    const ang = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
    const r = (i % 2 ? 15 : 40) + (rand() - 0.5) * 7;
    pts.push([clamp(50 + Math.cos(ang) * r), clamp(50 + Math.sin(ang) * r)]);
  }
  return poly(pts);
}

/* Tangle: a walk that keeps getting pulled back to the middle, so it knots
   instead of wandering off. */
function tangle(seed) {
  const rand = rng(seed);
  const pts = [];
  let x = 50, y = 50, vx = 0, vy = 0;
  for (let i = 0; i < 72; i++) {
    // Pull weak and damping light, or it collapses to a scratch instead of
    // opening out into a knot.
    vx += (rand() - 0.5) * 19 - (x - 50) * 0.055;
    vy += (rand() - 0.5) * 19 - (y - 50) * 0.055;
    vx *= 0.84; vy *= 0.84;
    x += vx; y += vy;
    pts.push([x, y]);          // unclamped — fit() brings it back in
  }
  return smooth(fit(pts));
}

const shapes = [
  ['d-scrawl', 'Fast oval scrawl, laps drifting off each other.',   scrawl(7)],
  ['d-coil',   'Spiral wound outward from the middle.',             coil(21)],
  ['d-wave',   'Squiggle, no two humps the same.',                  wave(4)],
  ['d-burst',  'Scratched asterisk, arms overshooting the cross.',  burst(13)],
  ['d-loops',  'Loop-de-loop chain, the kind that fills a margin.', loops(9)],
  ['d-ring',   'Ring gone round twice and a half.',                 ring(33)],
  ['d-zigzag', 'Hard zigzag, one flick back and forth.',            zigzag(5)],
  ['d-blob',   'Blotted-out blob, filled row by row.',              blob(18)],
  ['d-arrow',  'Arrow with a bent shaft and a two-stroke head.',    arrow(26)],
  ['d-star',   'Spiky star, reach alternating.',                    star(41)],
  ['d-tangle', 'Tangle, a walk that keeps knotting on itself.',     tangle(12)]
];

/* ── Placement ───────────────────────────────────────────────────────────
   Both margins run full height, so the marks read as a margin someone kept
   drawing in rather than as six ornaments dotted down the page. Generated
   for the same reason the paths are: 40 hand-tuned rules drift, and the one
   constraint that actually matters is easy to break by hand.

   That constraint: reach + size must stay under MAX_SPAN. Below 1240px the
   doodles are hidden entirely; at exactly that width the margin outside the
   860px measure is only ~190px per side, and anything wider than MAX_SPAN
   gets sliced off by the container's overflow.                            */
/* Reach is a fraction of the margin, not a pixel offset: 0 puts a mark
   against the text column, 1 against the window edge, and anything between
   lands somewhere in the middle. CSS resolves it per viewport (see --edge
   in style.css), so the spread widens with the window instead of clustering
   into fixed bands — and a mark can never overflow, because the travel it
   scales is by definition the space that exists. */
const F_RANGE = [0.04, 0.96];

/* A fifth or so are pushed past f=1, which runs them off the window edge to be
   cropped by the container. Deliberate: marks that bleed off the side stop the
   set reading as a tidy border. Only the outer end may spill — the inner end
   keeps its clearance, so nothing ever crowds the text. */
const BLEED_SHARE = 0.22;
const BLEED_F = [1.06, 1.28];
const SIZE = [58, 190];   // wide on purpose: a uniform set reads as a pattern
const SPIN = [1.5, 2.6];  // degrees per pixel scrolled

function placements(seed, perSide) {
  const rand = rng(seed);
  const ids = shapes.map((s) => s[0]);
  const out = [];
  let last = '';
  // `right` puts the mark in the LEFT margin, and vice versa.
  // Spread across a fixed band rather than accumulating a step: accumulating
  // overshoots, and anything past 100% lands outside the clipped container
  // and is simply never seen.
  const TOP = 2, BOTTOM = 96;
  ['right', 'left'].forEach((side, s) => {
    for (let i = 0; i < perSide; i++) {
      // Half-step stagger between the sides so they never line up in pairs.
      const k = (i + s * 0.5) / perSide;
      const top = TOP + k * (BOTTOM - TOP) + (rand() - 0.5) * 2.4;
      const size = Math.round(SIZE[0] + rand() * (SIZE[1] - SIZE[0]));
      const bleeds = rand() < BLEED_SHARE;
      const f = bleeds
        ? BLEED_F[0] + rand() * (BLEED_F[1] - BLEED_F[0])
        : F_RANGE[0] + rand() * (F_RANGE[1] - F_RANGE[0]);
      let shape = ids[Math.floor(rand() * ids.length)];
      while (shape === last) shape = ids[Math.floor(rand() * ids.length)];
      last = shape;
      out.push({
        side, shape, size, bleeds,
        f: Math.round(f * 100) / 100,
        top: Math.round(top * 10) / 10,
        tilt: Math.round(rand() * 60 - 30),
        spin: (SPIN[0] + rand() * (SPIN[1] - SPIN[0])) * (rand() < 0.5 ? -1 : 1)
      });
    }
  });
  return out.map((p, i) => ({ ...p, n: i + 1 }));
}

const pad = (s, w) => String(s).padStart(w);
// Class names are zero-padded: padStart with a space would put whitespace
// inside the identifier and split it into two classes.
const idx = (n) => String(n).padStart(2, '0');

if (process.argv.includes('--place')) {
  const list = placements(77, 21);
  const bad = list.filter((p) =>
    p.top < 0 || p.top > 97 || p.f < 0 || (p.f > 1 && !p.bleeds) || p.f > BLEED_F[1]);
  if (bad.length) {
    bad.forEach((p) => console.error(`out of bounds: #${p.n} top=${p.top}% f=${p.f}`));
    process.exit(1);
  }
  const bleeding = list.filter((p) => p.bleeds).length;
  console.error(`${list.length} marks, ${bleeding} bleeding off the edge, ` +
    `sizes ${Math.min(...list.map((p) => p.size))}-${Math.max(...list.map((p) => p.size))}px`);
  console.log('/* ── CSS: paste over the .doodle--NN block ── */');
  console.log(list.map((p) =>
    `.doodle--${idx(p.n)} { top: ${pad(p.top, 4)}%; ${p.side}: var(--edge); ` +
    `--f: ${p.f.toFixed(2)}; --size: ${pad(p.size, 3)}px; ` +
    `--tilt: ${pad(p.tilt, 3)}deg; --spin: ${pad(p.spin.toFixed(2), 5)}; }`
  ).join('\n'));
  console.log('\n<!-- ── HTML: paste over the .doodles children ── -->');
  console.log(list.map((p) =>
    `  <svg class="doodle doodle--${idx(p.n)}" viewBox="0 0 100 100">` +
    [1, 2, 3].map((f) => `<use class="frame frame-${f}" href="#${p.shape}"></use>`).join('') +
    `</svg>`
  ).join('\n'));
} else {
  console.log(shapes.map(([id, note, d]) =>
    `  <!-- ${note} -->\n  <symbol id="${id}" viewBox="0 0 100 100">\n    <path d="${d}"/>\n  </symbol>`
  ).join('\n\n'));
}
