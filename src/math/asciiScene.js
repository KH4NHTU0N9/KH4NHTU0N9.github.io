import { clamp, normalizeArtParams, spectralRgbUnit } from './mathArt.js?v=gcs24';

const TAU = Math.PI * 2;

export const PART_KINDS = Object.freeze({
  SURFACE: 0,
  BEACON: 1,
  CORE: 2,
  GROUND: 3,
});

export const GLYPH_MODES = Object.freeze({
  math: Object.freeze({
    id: 'math',
    label: 'MATH',
    ramp: ' ·+-±×÷π∑∫∞',
  }),
  ascii: Object.freeze({
    id: 'ascii',
    label: 'ASCII',
    ramp: ' .:-=+*#%@',
  }),
  binary: Object.freeze({
    id: 'binary',
    label: 'BIN',
    ramp: ' 00010111',
  }),
});

export const ASCII_SCENE_SPECS = Object.freeze({
  wave: Object.freeze({
    id: 'wave',
    code: '01',
    label: 'Wave',
    equation: 'y(x,z,t) = Σ Aₙ·sin(kₙx + ωₙt + φz)',
  }),
  spiro: Object.freeze({
    id: 'spiro',
    code: '02',
    label: 'Knot',
    equation: 'γ(t) = ((R + r·cos qt)cos pt, r·sin qt, (R + r·cos qt)sin pt)',
  }),
  tesseract: Object.freeze({
    id: 'tesseract',
    code: '03',
    label: 'Core',
    equation: 'S²(u,v) ⊕ ⋃ SO(3) gimbal rings(t)',
  }),
});

function createRng(seed = 2026) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class ScenePointBuffer {
  constructor(capacity = 5200) {
    this.positions = new Float32Array(capacity * 3);
    this.normals = new Float32Array(capacity * 3);
    this.colors = new Float32Array(capacity * 3);
    this.kinds = new Uint8Array(capacity);
    this.phase = new Float32Array(capacity);
    this.shine = new Float32Array(capacity);
    this.count = 0;
    this.capacity = capacity;
  }

  reset() {
    this.count = 0;
  }

  push(x, y, z, nx, ny, nz, r, g, b, kind, phase = 0, shine = 0.4) {
    if (this.count >= this.capacity) {
      return;
    }
    const i = this.count;
    const i3 = i * 3;
    this.positions[i3] = x;
    this.positions[i3 + 1] = y;
    this.positions[i3 + 2] = z;
    this.normals[i3] = nx;
    this.normals[i3 + 1] = ny;
    this.normals[i3 + 2] = nz;
    this.colors[i3] = r;
    this.colors[i3 + 1] = g;
    this.colors[i3 + 2] = b;
    this.kinds[i] = kind;
    this.phase[i] = phase;
    this.shine[i] = shine;
    this.count = i + 1;
  }
}

const SHARED_BUFFER = new ScenePointBuffer(6000);

function appendGroundDisc(buf, timeSec, freq, radius = 1.92) {
  const rings = 11;
  const floorY = -0.96;

  for (let ring = 1; ring <= rings; ring++) {
    const radFrac = ring / rings;
    const rRing = radius * radFrac;
    const count = Math.round(14 + radFrac * 44);
    for (let j = 0; j < count; j++) {
      const theta = (j / count) * TAU + ring * 0.21;
      const x = rRing * Math.cos(theta);
      const z = rRing * Math.sin(theta);
      const ripple = 0.025 * Math.sin(radFrac * 8.0 * freq - timeSec * 1.6);
      const [cr, cg, cb] = spectralRgbUnit(0.55 + radFrac * 0.14 + 0.04 * Math.sin(theta));
      const fade = 0.36 + 0.38 * (1 - radFrac);
      buf.push(
        x,
        floorY + ripple,
        z,
        0,
        1,
        0,
        cr * fade,
        cg * fade,
        Math.min(1, cb * fade * 1.15),
        PART_KINDS.GROUND,
        theta,
        0.1,
      );
    }
  }
}

function populateWaveVolumetric(buf, timeSec, { freq, amp }) {
  const rows = 46;
  const cols = 74;
  const spanX = 2.7;
  const spanZ = 2.15;

  for (let r = 0; r < rows; r++) {
    const v = r / (rows - 1);
    const z = (v - 0.5) * spanZ;
    for (let c = 0; c < cols; c++) {
      const u = c / (cols - 1);
      const x = (u - 0.5) * spanX;
      const env = 0.62 + 0.38 * Math.cos((u - 0.5) * Math.PI);
      const p1 = 2.4 * freq * x + timeSec * 1.05 + z * 1.45;
      const p2 = 4.1 * z - timeSec * 0.78 + x * freq;
      const p3 = 6.2 * freq * x - timeSec * 1.4;

      const y =
        0.12 +
        amp * env * (0.42 * Math.sin(p1) + 0.2 * Math.cos(p2) + 0.1 * Math.sin(p3));

      // Analytical surface gradient -> true normal vector for directional specular lighting
      const dydx =
        amp *
        env *
        (0.42 * 2.4 * freq * Math.cos(p1) -
          0.2 * freq * Math.sin(p2) +
          0.1 * 6.2 * freq * Math.cos(p3));
      const dydz =
        amp * env * (0.42 * 1.45 * Math.cos(p1) - 0.2 * 4.1 * Math.sin(p2));
      const nLen = Math.hypot(-dydx, 1, -dydz) || 1;
      const nx = -dydx / nLen;
      const ny = 1 / nLen;
      const nz = -dydz / nLen;

      const hue = 0.06 + 0.78 * u + 0.12 * Math.sin(v * Math.PI + timeSec * 0.25);
      const [cr, cg, cb] = spectralRgbUnit(hue);
      const isCrestBeacon = r % 9 === 4 && c % 11 === 5 && y > 0.22;
      buf.push(
        x,
        y,
        z,
        nx,
        ny,
        nz,
        cr,
        cg,
        cb,
        isCrestBeacon ? PART_KINDS.BEACON : PART_KINDS.SURFACE,
        u * 4 + v * 3,
        isCrestBeacon ? 1.0 : 0.65,
      );
    }
  }

  appendGroundDisc(buf, timeSec, freq, 1.95);
}

function evalTorusKnot(t, freq, amp, timeSec) {
  const R = 0.74;
  const r = 0.34 * (0.72 + 0.28 * amp);
  const p = 3;
  const q = 5;
  const pulse = 1 + 0.08 * amp * Math.sin(t * 4 * freq - timeSec * 2.2);
  const rad = (R + r * Math.cos(q * t + timeSec * 0.35)) * pulse;
  const x = rad * Math.cos(p * t);
  const z = rad * Math.sin(p * t);
  const y = 0.14 + r * 1.15 * Math.sin(q * t + timeSec * 0.35);
  return [x, y, z];
}

function populateKnotVolumetric(buf, timeSec, { freq, amp }) {
  const segs = 168;
  const tubeSides = 16;
  const tubeRadius = clamp(0.115 * (0.75 + 0.25 * amp), 0.06, 0.19);
  const eps = 0.008;

  for (let i = 0; i < segs; i++) {
    const t = (i / segs) * TAU;
    const [px, py, pz] = evalTorusKnot(t, freq, amp, timeSec);
    const [nx1, ny1, nz1] = evalTorusKnot(t + eps, freq, amp, timeSec);

    let tx = nx1 - px;
    let ty = ny1 - py;
    let tz = nz1 - pz;
    const tLen = Math.hypot(tx, ty, tz) || 1;
    tx /= tLen;
    ty /= tLen;
    tz /= tLen;

    // Reference up vector avoiding gimbal singularity
    const ux = Math.abs(ty) > 0.9 ? 1 : 0;
    const uy = Math.abs(ty) > 0.9 ? 0 : 1;
    const uz = 0;

    let bx = ty * uz - tz * uy;
    let by = tz * ux - tx * uz;
    let bz = tx * uy - ty * ux;
    const bLen = Math.hypot(bx, by, bz) || 1;
    bx /= bLen;
    by /= bLen;
    bz /= bLen;

    const nrmX = by * tz - bz * ty;
    const nrmY = bz * tx - bx * tz;
    const nrmZ = bx * ty - by * tx;

    for (let j = 0; j < tubeSides; j++) {
      const phi = (j / tubeSides) * TAU + t * 2;
      const ca = Math.cos(phi);
      const sa = Math.sin(phi);
      const ox = ca * nrmX + sa * bx;
      const oy = ca * nrmY + sa * by;
      const oz = ca * nrmZ + sa * bz;

      const hue = i / segs + j * 0.015 + timeSec * 0.05;
      const [cr, cg, cb] = spectralRgbUnit(hue);
      const isBeacon = i % 14 === 0 && j % 8 === 0;
      buf.push(
        px + ox * tubeRadius,
        py + oy * tubeRadius,
        pz + oz * tubeRadius,
        ox,
        oy,
        oz,
        cr,
        cg,
        cb,
        isBeacon ? PART_KINDS.BEACON : PART_KINDS.SURFACE,
        t * 2 + phi,
        isBeacon ? 1.0 : 0.85,
      );
    }
  }

  appendGroundDisc(buf, timeSec, freq, 1.88);
}

function populateCoreVolumetric(buf, timeSec, { freq, amp }) {
  // 1. Central Fibonacci Geodesic Luminous Core
  const coreCount = 1150;
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const coreRad = 0.42 * (0.76 + 0.24 * amp);
  const centerY = 0.14;

  for (let i = 0; i < coreCount; i++) {
    const frac = 1 - (i / (coreCount - 1)) * 2;
    const radial = Math.sqrt(Math.max(0, 1 - frac * frac));
    const theta = goldenAngle * i + timeSec * 0.35;
    const nx = Math.cos(theta) * radial;
    const ny = frac;
    const nz = Math.sin(theta) * radial;
    const wave = 1 + 0.09 * Math.sin(ny * 7 * freq - timeSec * 3.1 + nx * 3);

    const [cr, cg, cb] = spectralRgbUnit(0.45 + 0.35 * (ny * 0.5 + 0.5) + timeSec * 0.06);
    const isBeacon = i % 37 === 0;
    buf.push(
      nx * coreRad * wave,
      centerY + ny * coreRad * wave,
      nz * coreRad * wave,
      nx,
      ny,
      nz,
      cr,
      cg,
      cb,
      isBeacon ? PART_KINDS.BEACON : PART_KINDS.CORE,
      i * 0.19,
      isBeacon ? 1.0 : 0.78,
    );
  }

  // 2. Three Precessing Tubular Gyroscope Gimbal Rings
  const ringConfigs = [
    { rad: 0.78, tiltX: 0.55 + timeSec * 0.42, tiltZ: 0.28, hueBase: 0.08 },
    { rad: 0.96, tiltX: -0.68, tiltZ: 0.62 - timeSec * 0.36, hueBase: 0.52 },
    { rad: 1.14, tiltX: 0.22 + timeSec * 0.25, tiltZ: -0.82, hueBase: 0.78 },
  ];

  for (let rIdx = 0; rIdx < ringConfigs.length; rIdx++) {
    const cfg = ringConfigs[rIdx];
    const majorR = cfg.rad * (0.82 + 0.18 * amp);
    const minorR = 0.048;
    const segs = 96;
    const sides = 6;
    const cxRot = Math.cos(cfg.tiltX);
    const sxRot = Math.sin(cfg.tiltX);
    const czRot = Math.cos(cfg.tiltZ);
    const szRot = Math.sin(cfg.tiltZ);

    for (let i = 0; i < segs; i++) {
      const theta = (i / segs) * TAU;
      const ct = Math.cos(theta);
      const st = Math.sin(theta);

      for (let j = 0; j < sides; j++) {
        const phi = (j / sides) * TAU;
        const cp = Math.cos(phi);
        const sp = Math.sin(phi);
        const localR = majorR + minorR * cp;
        const lx = localR * ct;
        const ly = minorR * sp;
        const lz = localR * st;

        // Rotate ring in 3D space
        const y1 = ly * cxRot - lz * sxRot;
        const z1 = ly * sxRot + lz * cxRot;
        const x2 = lx * czRot - y1 * szRot;
        const y2 = lx * szRot + y1 * czRot;

        const n1y = sp * cxRot - st * cp * sxRot;
        const n1z = sp * sxRot + st * cp * cxRot;
        const nx = cp * ct * czRot - n1y * szRot;
        const ny = cp * ct * szRot + n1y * czRot;
        const nz = n1z;

        const [cr, cg, cb] = spectralRgbUnit(cfg.hueBase + (i / segs) * 0.38);
        const isBeacon = i % 16 === 0 && j === 0;
        buf.push(
          x2,
          centerY + y2,
          z1,
          nx,
          ny,
          nz,
          cr,
          cg,
          cb,
          isBeacon ? PART_KINDS.BEACON : PART_KINDS.SURFACE,
          theta + rIdx,
          isBeacon ? 1.0 : 0.9,
        );
      }
    }
  }

  appendGroundDisc(buf, timeSec, freq, 1.9);
}

/**
 * Samples deterministic volumetric 3D ASCII/Math point cloud for the selected manifold preset.
 * Reuses a pre-allocated TypedArray buffer cleanly for zero GC pressure during 60fps animation.
 *
 * @param {string} presetId
 * @param {number} timeSec
 * @param {{ freq?: number, amp?: number }} [rawParams]
 */
export function buildAsciiScene(presetId, timeSec = 0, rawParams = {}) {
  const safeId = Object.prototype.hasOwnProperty.call(ASCII_SCENE_SPECS, presetId)
    ? presetId
    : 'wave';
  const t = Number.isFinite(timeSec) ? timeSec : 0;
  const params = normalizeArtParams(rawParams);

  SHARED_BUFFER.reset();
  if (safeId === 'spiro') {
    populateKnotVolumetric(SHARED_BUFFER, t, params);
  } else if (safeId === 'tesseract') {
    populateCoreVolumetric(SHARED_BUFFER, t, params);
  } else {
    populateWaveVolumetric(SHARED_BUFFER, t, params);
  }

  return {
    preset: safeId,
    count: SHARED_BUFFER.count,
    positions: SHARED_BUFFER.positions,
    normals: SHARED_BUFFER.normals,
    colors: SHARED_BUFFER.colors,
    kinds: SHARED_BUFFER.kinds,
    phase: SHARED_BUFFER.phase,
    shine: SHARED_BUFFER.shine,
  };
}

/**
 * Builds deterministic backdrop stars and floating cosmic motes directly in normalized [0,1] space.
 */
export function createSkyField(seed = 2026) {
  const rand = createRng(seed);
  const stars = [];
  const motes = [];
  const starGlyphs = ['.', '·', '+', '*'];
  const moteGlyphs = ['·', '×', '+', '∞', 'π'];

  for (let i = 0; i < 160; i++) {
    stars.push({
      u: rand(),
      v: 0.02 + rand() * 0.82,
      phase: rand() * TAU,
      speed: 1.2 + rand() * 3.0,
      glyph: starGlyphs[i % starGlyphs.length],
      bright: 0.55 + rand() * 0.45,
    });
  }

  for (let i = 0; i < 65; i++) {
    motes.push({
      u0: rand(),
      v0: rand(),
      vy: 0.025 + rand() * 0.055,
      vx: -0.012 + rand() * 0.024,
      swayAmp: 0.005 + rand() * 0.012,
      phase: rand() * TAU,
      glyph: moteGlyphs[i % moteGlyphs.length],
      inFront: i % 3 === 0,
      bright: 0.65 + rand() * 0.35,
    });
  }

  return { stars, motes };
}
