/**
 * Pure 3D/4D generative mathematical geometry for Canvas 2D rendering.
 * Supports bounded real-time harmonic frequency and amplitude modulation.
 */

const TAU = Math.PI * 2;

export function clamp(val, min, max) {
  return val < min ? min : val > max ? max : val;
}

export const DEFAULT_ART_PARAMS = Object.freeze({
  freq: 1.0,
  amp: 1.0,
});

/**
 * Safely clamps real-time control inputs to bounded physical intervals.
 * @param {{ freq?: number, amp?: number }} [params]
 */
export function normalizeArtParams(params) {
  const rawFreq = Number(params?.freq);
  const rawAmp = Number(params?.amp);
  return {
    freq: Number.isFinite(rawFreq) ? clamp(rawFreq, 0.4, 2.4) : DEFAULT_ART_PARAMS.freq,
    amp: Number.isFinite(rawAmp) ? clamp(rawAmp, 0.35, 1.65) : DEFAULT_ART_PARAMS.amp,
  };
}

/**
 * Available visual modes and verified geometric specifications exposed via the HUD.
 */
export const ART_PRESETS = Object.freeze({
  wave: Object.freeze({
    id: 'wave',
    code: '01',
    label: 'Wave',
    specTitle: 'FOURIER DISPERSION SHEET',
    equation: 'y(x,z,t) = Σ Aₙ·sin(kₙx + ωₙt + φz)',
    topology: '26 SPLINES · 2,184 PTS',
  }),
  spiro: Object.freeze({
    id: 'spiro',
    code: '02',
    label: 'Spiro',
    specTitle: 'COUPLED HYPOTROCHOID',
    equation: 'r(θ,t) = R + r·cos(7θ + ωt + φₖ)',
    topology: '9 RINGS · P:3 Q:7 · 1,980 PTS',
  }),
  tesseract: Object.freeze({
    id: 'tesseract',
    code: '03',
    label: '4D',
    specTitle: '4D HYPERCUBE PROJECTION',
    equation: 'R⁴ → R³ ROT(XW, ZW) + MERIDIAN',
    topology: '16V / 32E · 256 PTS',
  }),
});

/**
 * Computes normalized optical prism RGB channels [0..1] from wavelength t in [0, 1].
 *
 * @param {number} t
 * @returns {[number, number, number]}
 */
export function spectralRgbUnit(t) {
  const w = ((t % 1) + 1) % 1;
  return [
    clamp(Math.sin(w * TAU + 0.0) * 0.5 + 0.52, 0.08, 1),
    clamp(Math.sin(w * TAU + 2.094) * 0.5 + 0.52, 0.08, 1),
    clamp(Math.sin(w * TAU + 4.188) * 0.5 + 0.52, 0.08, 1),
  ];
}

/**
 * Computes pure optical prism RGB color from normalized wavelength t in [0, 1].
 *
 * @param {number} t
 * @param {number} [alpha]
 */
export function spectralRgba(t, alpha = 1) {
  const [rLin, gLin, bLin] = spectralRgbUnit(t);
  const r = Math.round(rLin * 255);
  const g = Math.round(gLin * 255);
  const b = Math.round(bLin * 255);
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Sculptural 3D Fourier dispersion ribbon sheet: 26 splines x 84 vertices.
 */
function buildWaveScene(timeSec, { freq, amp }) {
  const strandCount = 26;
  const steps = 84;
  const totalVerts = strandCount * steps;
  const points = new Float32Array(totalVerts * 3);
  const wavelengths = new Float32Array(totalVerts);
  const polylines = [];

  for (let row = 0; row < strandCount; row++) {
    const v = row / (strandCount - 1);
    const z = (v - 0.5) * 2.25;
    const start = row * steps;

    for (let col = 0; col < steps; col++) {
      const u = col / (steps - 1);
      const x = (u - 0.5) * 2.95;
      const env = 0.65 + 0.35 * Math.cos(u * Math.PI - Math.PI * 0.5);
      const y =
        amp *
        env *
        (0.38 * Math.sin(2.4 * freq * x + timeSec * 0.95 + z * 1.45) +
          0.18 * Math.cos(4.2 * z - timeSec * 0.72 + x * freq) +
          0.09 * Math.sin(6.5 * freq * x - timeSec * 1.3));

      const idx = start + col;
      const i3 = idx * 3;
      points[i3] = x;
      points[i3 + 1] = y;
      points[i3 + 2] = z;
      wavelengths[idx] = (u * 0.68 + v * 0.32 + timeSec * 0.03) % 1;
    }

    polylines.push({ start, count: steps, closed: false });
  }

  const nodeIndices = [
    steps * 6 + Math.floor((timeSec * 22) % steps),
    steps * 13 + Math.floor((timeSec * 22 + 28) % steps),
    steps * 20 + Math.floor((timeSec * 22 + 56) % steps),
  ];

  return { preset: 'wave', points, wavelengths, polylines, nodeIndices };
}

/**
 * 3D Coupled Hypotrochoid / Spirograph interference manifold: 9 rings x 220 steps.
 */
function buildSpiroScene(timeSec, { freq, amp }) {
  const rings = 9;
  const steps = 220;
  const totalVerts = rings * steps;
  const points = new Float32Array(totalVerts * 3);
  const wavelengths = new Float32Array(totalVerts);
  const polylines = [];
  const nodeIndices = [];

  for (let r = 0; r < rings; r++) {
    const ratio = r / (rings - 1);
    const start = r * steps;
    const tilt = (ratio - 0.5) * 1.15 + Math.sin(timeSec * 0.3 + ratio * 2) * 0.25;
    const ct = Math.cos(tilt);
    const st = Math.sin(tilt);
    const major = (0.78 + 0.14 * Math.sin(ratio * Math.PI)) * clamp(amp * 0.5 + 0.5, 0.65, 1.35);
    const minor = 0.26 * amp;
    const p = 3;
    const q = Math.max(3, Math.round(7 * freq));

    for (let i = 0; i < steps; i++) {
      const t = (i / steps) * TAU;
      const wave = major + minor * Math.cos(q * t + timeSec * 0.7 + ratio * TAU);
      const lx = wave * Math.cos(p * t);
      const ly = minor * Math.sin(q * t + timeSec * 0.7 + ratio * TAU);
      const lz = wave * Math.sin(p * t);

      const y = ly * ct - lz * st;
      const z = ly * st + lz * ct;

      const idx = start + i;
      const i3 = idx * 3;
      points[i3] = lx;
      points[i3 + 1] = y;
      points[i3 + 2] = z;
      wavelengths[idx] = (ratio * 0.72 + i / steps + timeSec * 0.04) % 1;
    }

    polylines.push({ start, count: steps, closed: true });
    if (r % 3 === 0) {
      nodeIndices.push(start + (Math.floor(timeSec * 45 + r * 30) % steps));
    }
  }

  return { preset: 'spiro', points, wavelengths, polylines, nodeIndices };
}

/**
 * 4D Hypercube (Tesseract) rotated in XW & ZW planes projected R^4 -> R^3 + meridian rings.
 */
function buildTesseractScene(timeSec, { freq, amp }) {
  const half = 0.66 * clamp(0.65 + amp * 0.35, 0.72, 1.24);
  const verts4 = [];
  for (let mask = 0; mask < 16; mask++) {
    verts4.push([
      mask & 1 ? half : -half,
      mask & 2 ? half : -half,
      mask & 4 ? half : -half,
      mask & 8 ? half : -half,
    ]);
  }

  const edges = [];
  for (let a = 0; a < 16; a++) {
    for (let bit = 0; bit < 4; bit++) {
      const b = a ^ (1 << bit);
      if (a < b) {
        edges.push([a, b, bit]);
      }
    }
  }

  const a1 = timeSec * 0.58;
  const a2 = timeSec * 0.39 * freq;
  const c1 = Math.cos(a1);
  const s1 = Math.sin(a1);
  const c2 = Math.cos(a2);
  const s2 = Math.sin(a2);

  const verts3 = verts4.map(([x, y, z, w]) => {
    const x1 = x * c1 - w * s1;
    const w1 = x * s1 + w * c1;
    const z1 = z * c2 - w1 * s2;
    const w2 = z * s2 + w1 * c2;
    const persp = 2.02 / (2.45 - w2);
    return [x1 * persp, y * persp, z1 * persp];
  });

  const ringSteps = 96;
  const totalVerts = edges.length * 2 + ringSteps * 2;
  const points = new Float32Array(totalVerts * 3);
  const wavelengths = new Float32Array(totalVerts);
  const polylines = [];

  let cursor = 0;
  for (let e = 0; e < edges.length; e++) {
    const [ia, ib, dimBit] = edges[e];
    const pa = verts3[ia];
    const pb = verts3[ib];
    const start = cursor;

    points[cursor * 3] = pa[0];
    points[cursor * 3 + 1] = pa[1];
    points[cursor * 3 + 2] = pa[2];
    wavelengths[cursor] = (dimBit * 0.23 + 0.08 + timeSec * 0.05) % 1;
    cursor++;

    points[cursor * 3] = pb[0];
    points[cursor * 3 + 1] = pb[1];
    points[cursor * 3 + 2] = pb[2];
    wavelengths[cursor] = (dimBit * 0.23 + 0.24 + timeSec * 0.05) % 1;
    cursor++;

    polylines.push({ start, count: 2, closed: false });
  }

  for (let ring = 0; ring < 2; ring++) {
    const start = cursor;
    const rad = (ring === 0 ? 1.44 : 1.15) * clamp(0.85 + amp * 0.15, 0.85, 1.15);
    const tilt = ring === 0 ? 0.35 : -0.62;
    const ct = Math.cos(tilt);
    const st = Math.sin(tilt);
    for (let i = 0; i < ringSteps; i++) {
      const th = (i / ringSteps) * TAU + timeSec * (ring === 0 ? 0.25 : -0.32);
      const lx = Math.cos(th) * rad;
      const lz = Math.sin(th) * rad;
      const ly = 0.07 * amp * Math.sin(3 * freq * th + timeSec);
      const y = ly * ct - lz * st;
      const z = ly * st + lz * ct;

      points[cursor * 3] = lx;
      points[cursor * 3 + 1] = y;
      points[cursor * 3 + 2] = z;
      wavelengths[cursor] = (i / ringSteps + ring * 0.4) % 1;
      cursor++;
    }
    polylines.push({ start, count: ringSteps, closed: true });
  }

  return {
    preset: 'tesseract',
    points,
    wavelengths,
    polylines,
    nodeIndices: [0, 6, 12, 18, edges.length * 2 + 12],
  };
}

/**
 * Generates bounded 3D/4D spectral geometry for the active visual preset.
 *
 * @param {string} presetId
 * @param {number} [timeSec]
 * @param {{ freq?: number, amp?: number }} [params]
 */
export function sampleMathArtScene(presetId, timeSec = 0, params = DEFAULT_ART_PARAMS) {
  const t = Number.isFinite(timeSec) ? timeSec : 0;
  const cleanParams = normalizeArtParams(params);
  if (presetId === 'spiro') {
    return buildSpiroScene(t, cleanParams);
  }
  if (presetId === 'tesseract') {
    return buildTesseractScene(t, cleanParams);
  }
  return buildWaveScene(t, cleanParams);
}
