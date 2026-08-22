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

const shapes = [
  ['d-scrawl', 'Fast oval scrawl, laps drifting off each other.', scrawl(7)],
  ['d-coil',   'Spiral wound outward from the middle.',           coil(21)],
  ['d-wave',   'Squiggle, no two humps the same.',                wave(4)],
  ['d-burst',  'Scratched asterisk, arms overshooting the cross.', burst(13)],
  ['d-loops',  'Loop-de-loop chain, the kind that fills a margin.', loops(9)],
  ['d-ring',   'Ring gone round twice and a half.',               ring(33)]
];

console.log(shapes.map(([id, note, d]) =>
  `  <!-- ${note} -->\n  <symbol id="${id}" viewBox="0 0 100 100">\n    <path d="${d}"/>\n  </symbol>`
).join('\n\n'));
