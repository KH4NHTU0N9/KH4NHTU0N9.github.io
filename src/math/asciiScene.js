import { clamp, spectralRgbUnit } from './mathArt.js?v=gcs26';

const TAU = Math.PI * 2;

export const PART_KINDS = Object.freeze({
  SURFACE: 0,
  BEACON: 1,
  CORE: 2,
  GROUND: 3,
});

export const GLYPH_MODES = Object.freeze({
  math: {
    id: 'math',
    label: 'MATH',
    ramp: ' ·+-±×÷π∑∫∞',
  },
  ascii: {
    id: 'ascii',
    label: 'ASCII',
    ramp: ' .:-=+*#%@',
  },
  binary: {
    id: 'binary',
    label: 'BIN',
    ramp: ' 00010111',
  },
});

export const ASCII_SCENE_SPECS = Object.freeze({
  mesh: {
    id: 'mesh',
    code: '01',
    label: 'Mesh',
    equation: 'G(V,E) · packet_mesh(S², θ, t)',
  },
  cipher: {
    id: 'cipher',
    code: '02',
    label: 'Cipher',
    equation: 'Enc(k,m) ∈ ℤₚ × T² · helix(2,5)',
  },
  rf: {
    id: 'rf',
    code: '03',
    label: 'RF',
    equation: 'Ψ(r,θ,t) = J₀(kr)·cos(ωt) · WiFi/BLE',
  },
});

const MAX_POINTS = 5600;

function createPointBuffer(capacity) {
  return {
    capacity,
    count: 0,
    positions: new Float32Array(capacity * 3),
    normals: new Float32Array(capacity * 3),
    colors: new Float32Array(capacity * 3),
    kinds: new Uint8Array(capacity),
    phase: new Float32Array(capacity),
    shine: new Float32Array(capacity),
    reset() {
      this.count = 0;
    },
    push(x, y, z, nx, ny, nz, r, g, b, kind, phase, shine) {
      if (this.count >= this.capacity) return;
      const i = this.count;
      const o3 = i * 3;
      this.positions[o3] = x;
      this.positions[o3 + 1] = y;
      this.positions[o3 + 2] = z;
      this.normals[o3] = nx;
      this.normals[o3 + 1] = ny;
      this.normals[o3 + 2] = nz;
      this.colors[o3] = r;
      this.colors[o3 + 1] = g;
      this.colors[o3 + 2] = b;
      this.kinds[i] = kind;
      this.phase[i] = phase;
      this.shine[i] = shine;
      this.count++;
    },
  };
}

const SHARED_BUFFER = createPointBuffer(MAX_POINTS);

function createRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Maps a [0, 1] scalar into a disciplined SecOps palette:
 * Deep Slate-Teal -> Phosphor Emerald -> Cold Cyan -> Ice Mint.
 */
function cyberColorRgb(t) {
  const w = ((t % 1) + 1) % 1;
  // Blend constrained spectral slice [0.36 .. 0.62] (emerald -> cyan -> azure)
  const band = 0.36 + 0.26 * (0.5 - 0.5 * Math.cos(w * TAU));
  const [sr, sg, sb] = spectralRgbUnit(band);
  return [
    clamp(sr * 0.62 + 0.08, 0.06, 0.72),
    clamp(sg * 0.92 + 0.14, 0.28, 0.98),
    clamp(sb * 0.92 + 0.16, 0.26, 0.98),
  ];
}

function appendRadarHorizon(buf, timeSec, floorY = -1.04) {
  const rings = [
    { rad: 0.58, count: 44 },
    { rad: 1.05, count: 68 },
    { rad: 1.52, count: 88 },
  ];
  for (let rIdx = 0; rIdx < rings.length; rIdx++) {
    const ring = rings[rIdx];
    for (let i = 0; i < ring.count; i++) {
      const a = (i / ring.count) * TAU + timeSec * (rIdx % 2 === 0 ? 0.08 : -0.06);
      const px = Math.cos(a) * ring.rad;
      const pz = Math.sin(a) * ring.rad;
      const isNode = i % 11 === 0;
      const [cr, cg, cb] = isNode ? [0.22, 0.92, 0.68] : [0.16, 0.52, 0.74];
      buf.push(px, floorY, pz, 0, 1, 0, cr, cg, cb, PART_KINDS.GROUND, a, isNode ? 0.78 : 0.42);
    }
  }
}

/**
 * Scene 01: 3D Network Defense Dome & Routed Packet Topology (`mesh`).
 */
function populateMeshVolumetric(buf, timeSec) {
  const rad = 0.98;
  const centerY = 0.08;

  // 1. Geodesic latitude + longitude wireframe lattice (crisp wireframe silhouette)
  const latLines = 11;
  const latSteps = 54;
  for (let li = 1; li < latLines; li++) {
    const phi = (li / latLines) * Math.PI - Math.PI * 0.5;
    const cp = Math.cos(phi);
    const sp = Math.sin(phi);
    for (let s = 0; s < latSteps; s++) {
      const theta = (s / latSteps) * TAU;
      const nx = cp * Math.cos(theta);
      const ny = sp;
      const nz = cp * Math.sin(theta);
      const [cr, cg, cb] = cyberColorRgb(li / latLines + 0.15);
      buf.push(
        nx * rad,
        centerY + ny * rad,
        nz * rad,
        nx,
        ny,
        nz,
        cr,
        cg,
        cb,
        PART_KINDS.SURFACE,
        theta,
        0.78,
      );
    }
  }

  const lonLines = 14;
  const lonSteps = 44;
  for (let lo = 0; lo < lonLines; lo++) {
    const theta = (lo / lonLines) * TAU;
    const ct = Math.cos(theta);
    const st = Math.sin(theta);
    for (let s = 0; s < lonSteps; s++) {
      const phi = (s / lonSteps) * TAU;
      const nx = Math.cos(phi) * ct;
      const ny = Math.sin(phi);
      const nz = Math.cos(phi) * st;
      const [cr, cg, cb] = cyberColorRgb(lo / lonLines);
      buf.push(
        nx * rad,
        centerY + ny * rad,
        nz * rad,
        nx,
        ny,
        nz,
        cr,
        cg,
        cb,
        PART_KINDS.SURFACE,
        phi,
        0.82,
      );
    }
  }

  // 2. Inner Encrypted Security Core
  const innerCount = 340;
  const golden = Math.PI * (3 - Math.sqrt(5));
  const innerRad = 0.32;
  for (let i = 0; i < innerCount; i++) {
    const fy = 1 - (i / (innerCount - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - fy * fy));
    const th = golden * i - timeSec * 0.45;
    const nx = Math.cos(th) * r;
    const ny = fy;
    const nz = Math.sin(th) * r;
    const isKey = i % 29 === 0;
    buf.push(
      nx * innerRad,
      centerY + ny * innerRad,
      nz * innerRad,
      nx,
      ny,
      nz,
      isKey ? 0.55 : 0.2,
      isKey ? 1.0 : 0.9,
      isKey ? 0.85 : 0.65,
      isKey ? PART_KINDS.BEACON : PART_KINDS.CORE,
      i * 0.3,
      isKey ? 1.0 : 0.86,
    );
  }

  // 3. Orbiting Network Packet Streams (6 crisscrossing great circles)
  for (let stream = 0; stream < 6; stream++) {
    const tiltX = stream * 0.52 + 0.3;
    const tiltZ = stream * 0.88 - 0.5;
    const cx = Math.cos(tiltX);
    const sx = Math.sin(tiltX);
    const cz = Math.cos(tiltZ);
    const sz = Math.sin(tiltZ);
    const headAngle = timeSec * (1.2 + stream * 0.15) + stream * 1.1;

    for (let seg = 0; seg < 18; seg++) {
      const a = headAngle - seg * 0.085;
      const lx = Math.cos(a) * (rad + 0.08);
      const ly = 0;
      const lz = Math.sin(a) * (rad + 0.08);

      const y1 = ly * cx - lz * sx;
      const z1 = ly * sx + lz * cx;
      const x2 = lx * cz - y1 * sz;
      const y2 = lx * sz + y1 * cz;

      const isHead = seg < 2;
      const fade = 1 - seg / 18;
      buf.push(
        x2,
        centerY + y2,
        z1,
        x2,
        y2,
        z1,
        isHead ? 0.68 : 0.22 * fade,
        isHead ? 1.0 : 0.85 * fade,
        isHead ? 0.92 : 0.96 * fade,
        isHead ? PART_KINDS.BEACON : PART_KINDS.CORE,
        a,
        isHead ? 1.0 : 0.72 * fade,
      );
    }
  }

  appendRadarHorizon(buf, timeSec, -1.04);
}

/**
 * Scene 02: 3D Cryptographic (2,5) Modular Cipher Torus (`cipher`).
 */
function populateCipherVolumetric(buf, timeSec) {
  const p = 2;
  const q = 5;
  const steps = 190;
  const tubeSides = 12;
  const majorR = 0.68;
  const minorAmp = 0.25;
  const tubeR = 0.095;
  const phaseShift = timeSec * 0.42;

  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * TAU;
    const r = majorR + minorAmp * Math.cos(q * t + phaseShift * 0.5);
    const px = r * Math.cos(p * t);
    const py = 0.08 + minorAmp * Math.sin(q * t + phaseShift * 0.5) * 1.35;
    const pz = r * Math.sin(p * t);

    const eps = 0.012;
    const t2 = t + eps;
    const r2 = majorR + minorAmp * Math.cos(q * t2 + phaseShift * 0.5);
    let tx = r2 * Math.cos(p * t2) - px;
    let ty = 0.08 + minorAmp * Math.sin(q * t2 + phaseShift * 0.5) * 1.35 - py;
    let tz = r2 * Math.sin(p * t2) - pz;
    const tLen = Math.hypot(tx, ty, tz) || 1;
    tx /= tLen;
    ty /= tLen;
    tz /= tLen;

    let nx = -tz;
    let ny = 0;
    let nz = tx;
    const nLen = Math.hypot(nx, ny, nz);
    if (nLen < 1e-4) {
      nx = 0;
      ny = 1;
      nz = 0;
    } else {
      nx /= nLen;
      nz /= nLen;
    }
    const bx = ty * nz - tz * ny;
    const by = tz * nx - tx * nz;
    const bz = tx * ny - ty * nx;

    const [cr, cg, cb] = cyberColorRgb(i / steps + timeSec * 0.06);

    for (let j = 0; j < tubeSides; j++) {
      const phi = (j / tubeSides) * TAU + t * 2.0;
      const cp = Math.cos(phi);
      const sp = Math.sin(phi);
      const vnx = cp * nx + sp * bx;
      const vny = cp * ny + sp * by;
      const vnz = cp * nz + sp * bz;
      const isBeacon = i % 19 === 0 && j === 0;

      buf.push(
        px + vnx * tubeR,
        py + vny * tubeR,
        pz + vnz * tubeR,
        vnx,
        vny,
        vnz,
        isBeacon ? 0.58 : cr,
        isBeacon ? 1.0 : cg,
        isBeacon ? 0.88 : cb,
        isBeacon ? PART_KINDS.BEACON : PART_KINDS.SURFACE,
        t + phi,
        isBeacon ? 1.0 : 0.84,
      );
    }
  }

  appendRadarHorizon(buf, timeSec, -0.98);
}

/**
 * Scene 03: 3D Wireless / RF Radiation Field & Antenna Spine (`rf`).
 */
function populateRfVolumetric(buf, timeSec) {
  const centerY = 0.04;

  // 1. Central Vertical Antenna Dipole Mast + Pulsing Feed Beacon
  for (let i = 0; i <= 26; i++) {
    const y = -0.68 + (i / 26) * 1.48;
    const isTip = i === 26 || i === 14;
    buf.push(
      0,
      y,
      0,
      0,
      0,
      1,
      isTip ? 0.6 : 0.25,
      1.0,
      isTip ? 0.92 : 0.72,
      isTip ? PART_KINDS.BEACON : PART_KINDS.CORE,
      i * 0.25,
      isTip ? 1.0 : 0.88,
    );
  }

  // 2. Concentric 3D RF Radiation Shells / Rippling Carrier Grid
  const rows = 40;
  const cols = 58;
  const span = 1.42;

  for (let r = 0; r < rows; r++) {
    const u = (r / (rows - 1)) * 2 - 1;
    const z = u * span;
    for (let c = 0; c < cols; c++) {
      const v = (c / (cols - 1)) * 2 - 1;
      const x = v * span;
      const rad = Math.hypot(x, z);
      if (rad > 1.45) continue;

      const angle = Math.atan2(z, x);
      const y =
        centerY +
        0.34 * Math.sin(rad * 7.2 - timeSec * 2.8) * Math.exp(-rad * 0.72) +
        0.12 * Math.cos(angle * 3 + timeSec * 1.4) * Math.sin(rad * 4.2);

      // Analytical radial derivative approximation for crisp lighting
      const dyDr = 2.4 * Math.cos(rad * 7.2 - timeSec * 2.8) * Math.exp(-rad * 0.72);
      const invR = rad > 1e-4 ? 1 / rad : 0;
      const dxSlope = dyDr * x * invR;
      const dzSlope = dyDr * z * invR;
      const nLen = Math.hypot(-dxSlope, 1, -dzSlope) || 1;

      const isPeak = y > 0.24 && (r + c) % 7 === 0;
      const [cr, cg, cb] = cyberColorRgb(rad * 0.55 - timeSec * 0.14);

      buf.push(
        x,
        y,
        z,
        -dxSlope / nLen,
        1 / nLen,
        -dzSlope / nLen,
        isPeak ? 0.58 : cr,
        isPeak ? 1.0 : cg,
        isPeak ? 0.9 : cb,
        isPeak ? PART_KINDS.BEACON : PART_KINDS.SURFACE,
        rad * 4,
        isPeak ? 0.98 : 0.82,
      );
    }
  }

  appendRadarHorizon(buf, timeSec, -0.98);
}

/**
 * Builds deterministic volumetric 3D Cybersecurity ASCII/Math scenes.
 * @param {string} presetId
 * @param {number} timeSec
 */
export function buildAsciiScene(presetId, timeSec = 0) {
  const legacyAlias = { wave: 'mesh', spiro: 'cipher', tesseract: 'rf' };
  const resolved = legacyAlias[presetId] || presetId;
  const safeId = Object.prototype.hasOwnProperty.call(ASCII_SCENE_SPECS, resolved)
    ? resolved
    : 'mesh';
  const t = Number.isFinite(timeSec) ? timeSec : 0;

  SHARED_BUFFER.reset();
  if (safeId === 'cipher') {
    populateCipherVolumetric(SHARED_BUFFER, t);
  } else if (safeId === 'rf') {
    populateRfVolumetric(SHARED_BUFFER, t);
  } else {
    populateMeshVolumetric(SHARED_BUFFER, t);
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
 * Builds sparse calm backdrop stars & minimal floating telemetry motes.
 */
export function createSkyField(seed = 2026) {
  const rand = createRng(seed);
  const stars = [];
  const motes = [];
  const starGlyphs = ['.', '·', '+'];
  const moteGlyphs = ['·', '+', 'π'];

  for (let i = 0; i < 85; i++) {
    stars.push({
      u: rand(),
      v: 0.03 + rand() * 0.84,
      phase: rand() * TAU,
      speed: 0.9 + rand() * 1.8,
      glyph: starGlyphs[i % starGlyphs.length],
      bright: 0.35 + rand() * 0.45,
    });
  }

  for (let i = 0; i < 24; i++) {
    motes.push({
      u0: rand(),
      v0: rand(),
      vy: 0.015 + rand() * 0.03,
      vx: -0.008 + rand() * 0.016,
      swayAmp: 0.004 + rand() * 0.008,
      phase: rand() * TAU,
      glyph: moteGlyphs[i % moteGlyphs.length],
      inFront: i % 4 === 0,
      bright: 0.45 + rand() * 0.35,
    });
  }

  return { stars, motes };
}
