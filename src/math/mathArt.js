/**
 * Creative 3D mathematical art generators (Golden-Angle Fibonacci Lattice,
 * Fourier Aurora Wave Manifold, and Harmonic Parametric Torus) built with
 * zero dependencies for real-time Canvas 2D rendering.
 */

const TAU = Math.PI * 2;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

export function clamp(val, min, max) {
  return val < min ? min : val > max ? max : val;
}

/**
 * Available generative math visual modes exposed via the showcase pill bar.
 */
export const ART_PRESETS = Object.freeze({
  constellation: Object.freeze({
    id: 'constellation',
    label: 'Fibonacci Orbit',
    subtitle: 'Golden-Angle Geodesic Sphere & Gyro Rings',
  }),
  aurora: Object.freeze({
    id: 'aurora',
    label: 'Fourier Aurora',
    subtitle: '3D Multi-Harmonic Wave Interference Field',
  }),
  torus: Object.freeze({
    id: 'torus',
    label: 'Harmonic Torus',
    subtitle: 'Coupled (p, q) Resonance Toroidal Manifold',
  }),
});

function buildConstellationScene(timeSec) {
  const nodeCount = 136;
  const nodeCoords = new Float32Array(nodeCount * 3);
  const nodeHues = new Float32Array(nodeCount);
  const nodeSizes = new Float32Array(nodeCount);

  for (let i = 0; i < nodeCount; i++) {
    const t = i / (nodeCount - 1);
    const yBase = 1 - 2 * t;
    const radial = Math.sqrt(Math.max(0, 1 - yBase * yBase));
    const theta = i * GOLDEN_ANGLE + timeSec * 0.22;
    const breath = 0.88 + 0.11 * Math.sin(theta * 2.0 + timeSec * 1.35 + yBase * 2.4);

    const x = Math.cos(theta) * radial * breath;
    const y = yBase * breath * 0.92;
    const z = Math.sin(theta) * radial * breath;

    const i3 = i * 3;
    nodeCoords[i3] = x;
    nodeCoords[i3 + 1] = y;
    nodeCoords[i3 + 2] = z;
    nodeHues[i] = (t * 0.8 + 0.5 + 0.5 * Math.sin(theta + timeSec * 0.7)) * 0.5;
    nodeSizes[i] = 1.6 + 1.4 * Math.pow(0.5 + 0.5 * Math.sin(i * 1.7 + timeSec * 2.1), 2);
  }

  // Build nearest-neighbor cybernetic mesh chords (bounded threshold)
  const chords = [];
  const maxDistSq = 0.36 * 0.36;
  for (let i = 0; i < nodeCount; i++) {
    const ax = nodeCoords[i * 3];
    const ay = nodeCoords[i * 3 + 1];
    const az = nodeCoords[i * 3 + 2];
    let links = 0;
    for (let j = i + 1; j < nodeCount && links < 4; j++) {
      const dx = nodeCoords[j * 3] - ax;
      const dy = nodeCoords[j * 3 + 1] - ay;
      const dz = nodeCoords[j * 3 + 2] - az;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < maxDistSq) {
        chords.push({ a: i, b: j, strength: 1 - Math.sqrt(d2) / 0.36, hue: nodeHues[i] });
        links++;
      }
    }
  }

  // 3 tilted counter-rotating gyroscopic orbital ribbons + bright tracer dots
  const ringConfigs = [
    { radius: 1.24, tiltX: 0.52, tiltZ: 0.25, speed: 0.55, hue: 0.15 },
    { radius: 1.34, tiltX: -0.68, tiltZ: 0.48, speed: -0.42, hue: 0.55 },
    { radius: 1.15, tiltX: 0.18, tiltZ: -0.82, speed: 0.72, hue: 0.85 },
  ];

  const stepsPerRing = 96;
  const ribbonPoints = new Float32Array(ringConfigs.length * stepsPerRing * 3);
  const ribbonHues = new Float32Array(ringConfigs.length * stepsPerRing);
  const ribbons = [];
  const tracers = [];

  for (let r = 0; r < ringConfigs.length; r++) {
    const cfg = ringConfigs[r];
    const cx = Math.cos(cfg.tiltX);
    const sx = Math.sin(cfg.tiltX);
    const cz = Math.cos(cfg.tiltZ);
    const sz = Math.sin(cfg.tiltZ);
    const spin = timeSec * cfg.speed;
    const start = r * stepsPerRing;

    for (let s = 0; s < stepsPerRing; s++) {
      const a = (s / stepsPerRing) * TAU + spin;
      const lx = Math.cos(a) * cfg.radius;
      const lz = Math.sin(a) * cfg.radius;
      const ly = 0.06 * Math.sin(3 * a + timeSec * 1.4);

      // Rotate around X then Z
      const y1 = ly * cx - lz * sx;
      const z1 = ly * sx + lz * cx;
      const x2 = lx * cz - y1 * sz;
      const y2 = lx * sz + y1 * cz;

      const idx = start + s;
      const i3 = idx * 3;
      ribbonPoints[i3] = x2;
      ribbonPoints[i3 + 1] = y2;
      ribbonPoints[i3 + 2] = z1;
      ribbonHues[idx] = (cfg.hue + s / stepsPerRing) % 1;
    }

    ribbons.push({ start, count: stepsPerRing, closed: true });
    tracers.push(start + (Math.floor(timeSec * 32 + r * 31) % stepsPerRing));
  }

  return {
    preset: 'constellation',
    nodeCoords,
    nodeHues,
    nodeSizes,
    chords,
    ribbonPoints,
    ribbonHues,
    ribbons,
    tracerIndices: tracers,
  };
}

function buildAuroraScene(timeSec) {
  const strandCount = 20;
  const segs = 74;
  const total = strandCount * segs;
  const ribbonPoints = new Float32Array(total * 3);
  const ribbonHues = new Float32Array(total);
  const ribbons = [];

  const nodeCount = 56;
  const nodeCoords = new Float32Array(nodeCount * 3);
  const nodeHues = new Float32Array(nodeCount);
  const nodeSizes = new Float32Array(nodeCount);

  for (let row = 0; row < strandCount; row++) {
    const vNorm = row / (strandCount - 1);
    const z = (vNorm - 0.5) * 2.1;
    const start = row * segs;

    for (let col = 0; col < segs; col++) {
      const uNorm = col / (segs - 1);
      const x = (uNorm - 0.5) * 2.5;
      const y =
        0.34 * Math.sin(2.5 * x + timeSec * 1.2 + z * 1.4) * Math.cos(1.3 * z - timeSec * 0.55) +
        0.16 * Math.sin(5.0 * x - timeSec * 1.7 + vNorm * 3.1) -
        0.05;

      const idx = start + col;
      const i3 = idx * 3;
      ribbonPoints[i3] = x;
      ribbonPoints[i3 + 1] = y;
      ribbonPoints[i3 + 2] = z;
      ribbonHues[idx] = clamp(uNorm * 0.65 + vNorm * 0.35, 0, 1);
    }
    ribbons.push({ start, count: segs, closed: false });
  }

  // Ambient glowing harmonic particles rising along wave peaks
  for (let i = 0; i < nodeCount; i++) {
    const px = Math.sin(i * 2.399 + timeSec * 0.25) * 1.15;
    const pz = Math.cos(i * 1.732 - timeSec * 0.2) * 0.95;
    const floatY = ((i * 0.13 + timeSec * 0.18) % 1.4) - 0.65;
    const i3 = i * 3;
    nodeCoords[i3] = px;
    nodeCoords[i3 + 1] = floatY;
    nodeCoords[i3 + 2] = pz;
    nodeHues[i] = (i / nodeCount + timeSec * 0.08) % 1;
    nodeSizes[i] = 1.6 + 1.5 * (0.5 + 0.5 * Math.sin(timeSec * 2.2 + i));
  }

  const tracers = [
    Math.floor(segs * 0.35) + segs * 6,
    Math.floor(segs * 0.68) + segs * 12,
    Math.floor(segs * 0.22) + segs * 16,
  ];

  return {
    preset: 'aurora',
    nodeCoords,
    nodeHues,
    nodeSizes,
    chords: [],
    ribbonPoints,
    ribbonHues,
    ribbons,
    tracerIndices: tracers,
  };
}

function buildTorusScene(timeSec) {
  const strandDefs = [
    { p: 3, q: 5, minor: 0.34, major: 0.82, speed: 0.38, hueShift: 0.0 },
    { p: 3, q: 5, minor: 0.24, major: 0.82, speed: -0.26, hueShift: 0.38 },
    { p: 5, q: 7, minor: 0.15, major: 0.82, speed: 0.52, hueShift: 0.72 },
  ];

  const stepsPerStrand = 280;
  const totalRibbonVerts = strandDefs.length * stepsPerStrand;
  const ribbonPoints = new Float32Array(totalRibbonVerts * 3);
  const ribbonHues = new Float32Array(totalRibbonVerts);
  const ribbons = [];
  const tracers = [];

  for (let s = 0; s < strandDefs.length; s++) {
    const cfg = strandDefs[s];
    const start = s * stepsPerStrand;
    const phase = timeSec * cfg.speed;

    for (let i = 0; i < stepsPerStrand; i++) {
      const t = (i / stepsPerStrand) * TAU;
      const r = cfg.major + cfg.minor * Math.cos(cfg.q * t + phase);
      const x = r * Math.cos(cfg.p * t);
      const y = cfg.minor * Math.sin(cfg.q * t + phase) * 1.18;
      const z = r * Math.sin(cfg.p * t);

      const idx = start + i;
      const i3 = idx * 3;
      ribbonPoints[i3] = x;
      ribbonPoints[i3 + 1] = y;
      ribbonPoints[i3 + 2] = z;
      ribbonHues[idx] = (i / stepsPerStrand + cfg.hueShift) % 1;
    }

    ribbons.push({ start, count: stepsPerStrand, closed: true });
    tracers.push(start + (Math.floor(timeSec * 84 + s * 90) % stepsPerStrand));
  }

  // Central harmonic core + orbit satellites
  const nodeCount = 44;
  const nodeCoords = new Float32Array(nodeCount * 3);
  const nodeHues = new Float32Array(nodeCount);
  const nodeSizes = new Float32Array(nodeCount);

  for (let i = 0; i < nodeCount; i++) {
    const theta = i * GOLDEN_ANGLE + timeSec * 0.45;
    const y = (1 - (2 * i) / (nodeCount - 1)) * 0.36;
    const rr = Math.sqrt(Math.max(0, 0.36 * 0.36 - y * y));
    const i3 = i * 3;
    nodeCoords[i3] = Math.cos(theta) * rr;
    nodeCoords[i3 + 1] = y;
    nodeCoords[i3 + 2] = Math.sin(theta) * rr;
    nodeHues[i] = i / nodeCount;
    nodeSizes[i] = 1.8 + 1.2 * Math.sin(timeSec * 2 + i);
  }

  return {
    preset: 'torus',
    nodeCoords,
    nodeHues,
    nodeSizes,
    chords: [],
    ribbonPoints,
    ribbonHues,
    ribbons,
    tracerIndices: tracers,
  };
}

/**
 * Generates bounded 3D mathematical art geometry (ribbons, constellation nodes, chords, and tracers).
 *
 * @param {string} presetId
 * @param {number} [timeSec]
 */
export function sampleMathArtScene(presetId, timeSec = 0) {
  const safeTime = Number.isFinite(timeSec) ? timeSec : 0;
  if (presetId === 'aurora') {
    return buildAuroraScene(safeTime);
  }
  if (presetId === 'torus') {
    return buildTorusScene(safeTime);
  }
  return buildConstellationScene(safeTime);
}
