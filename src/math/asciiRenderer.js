import { clamp } from './mathArt.js?v=gcs26';
import { GLYPH_MODES, PART_KINDS } from './asciiScene.js?v=gcs26';

const TAU = Math.PI * 2;
const BACKDROP_HEX = '#020308';
const SKY_EMPTY = 1e6;
const EMPTY_CHAR = ' ';

// Precompute normalized world-space lighting vectors (key, rim, camera fill)
const KEY_LEN = Math.hypot(0.44, 0.72, 0.54);
const KEY_X = 0.44 / KEY_LEN;
const KEY_Y = 0.72 / KEY_LEN;
const KEY_Z = 0.54 / KEY_LEN;

const RIM_LEN = Math.hypot(-0.62, 0.45, -0.52);
const RIM_X = -0.62 / RIM_LEN;
const RIM_Y = 0.45 / RIM_LEN;
const RIM_Z = -0.52 / RIM_LEN;

// Lookup tables avoiding heap churn in inner loops
const AURORA_GLYPHS = [' ', ' ', '·', '+', '×', 'π', '∫', '·'];
const AURORA_ASCII_GLYPHS = [' ', ' ', '.', ':', '~', '*', '+', '.'];
const BURST_GLYPHS_MATH = ['*', '+', '×', 'π', '∞', '·'];
const BURST_GLYPHS_ASCII = ['*', '+', 'x', '#', '%', '.'];
const BURST_GLYPHS_BIN = ['1', '0', '1', '1', '0', '1'];

/**
 * Quantizes 0..255 RGB into compact buckets for sprite caching and CSS string reuse.
 * Keeps Canvas `fillStyle` mutations tiny and cache-friendly per frame.
 */
const RGB_STR_CACHE = new Map();
function getQuantizedCssColor(r, g, b) {
  const qr = (r >> 3) << 3;
  const qg = (g >> 3) << 3;
  const qb = (b >> 3) << 3;
  const key = (qr << 16) | (qg << 8) | qb;
  let css = RGB_STR_CACHE.get(key);
  if (!css) {
    css = `rgb(${qr},${qg},${qb})`;
    if (RGB_STR_CACHE.size < 2048) {
      RGB_STR_CACHE.set(key, css);
    }
  }
  return css;
}

/**
 * Fast deterministic integer cell hash in [0, 1).
 */
function cellHash01(col, row) {
  let n = Math.imul(col + 37, 374761393) + Math.imul(row + 19, 668265263);
  n = (n ^ (n >>> 13)) * 1274126177;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

/**
 * Allocates reusable TypedArray cell buffers for the Z-buffered ASCII viewport.
 * @param {number} cols
 * @param {number} rows
 */
export function createAsciiGrid(cols, rows) {
  const safeCols = Math.max(1, Math.floor(cols));
  const safeRows = Math.max(1, Math.floor(rows));
  const size = safeCols * safeRows;
  return {
    cols: safeCols,
    rows: safeRows,
    size,
    chars: new Array(size).fill(EMPTY_CHAR),
    depths: new Float32Array(size),
    r: new Uint8Array(size),
    g: new Uint8Array(size),
    b: new Uint8Array(size),
    glow: new Uint8Array(size),
    kinds: new Uint8Array(size),
  };
}

/**
 * Clears grid buffers before frame compositing.
 */
function clearGrid(grid) {
  grid.chars.fill(EMPTY_CHAR);
  grid.depths.fill(SKY_EMPTY);
  grid.r.fill(0);
  grid.g.fill(0);
  grid.b.fill(0);
  grid.glow.fill(0);
  grid.kinds.fill(255);
}

/**
 * Writes a single cell into the Z-buffer if closer than existing occupant.
 */
function writeCell(grid, col, row, depth, ch, cr, cg, cb, glowFlag, kind) {
  if (col < 0 || col >= grid.cols || row < 0 || row >= grid.rows) return false;
  const idx = row * grid.cols + col;
  if (depth >= grid.depths[idx]) return false;
  grid.depths[idx] = depth;
  grid.chars[idx] = ch;
  grid.r[idx] = clamp(Math.round(cr), 0, 255);
  grid.g[idx] = clamp(Math.round(cg), 0, 255);
  grid.b[idx] = clamp(Math.round(cb), 0, 255);
  grid.glow[idx] = glowFlag ? 1 : 0;
  grid.kinds[idx] = kind;
  return true;
}

/**
 * Renders deep-night aurora shimmer, stars, and periodic shooting star behind the geometry.
 */
function renderBackdropSky(grid, skyField, timeSec, glyphMode) {
  const { cols, rows } = grid;
  const bandRows = Math.floor(rows * 0.32);
  const rampMode = glyphMode === 'binary' ? 'binary' : glyphMode === 'ascii' ? 'ascii' : 'math';
  const auroraPool = rampMode === 'ascii' ? AURORA_ASCII_GLYPHS : AURORA_GLYPHS;
  // 1. Subdued emerald-cyan atmospheric shimmer in top 32%
  for (let row = 0; row < bandRows; row++) {
    const vNorm = row / Math.max(1, bandRows);
    const curtainFade = 1 - vNorm;
    for (let col = 0; col < cols; col++) {
      const h = cellHash01(col, row);
      if (h > 0.11) continue;
      const uNorm = col / cols;
      const wave =
        Math.sin(uNorm * 7.2 + timeSec * 0.55 + vNorm * 2.6) * 0.5 +
        Math.cos(uNorm * 12.5 - timeSec * 0.38 + Math.sin(uNorm * 3.5) * 1.8) * 0.5;
      const band = Math.max(0, wave) * curtainFade;
      if (band < 0.28) continue;

      const ch =
        rampMode === 'binary'
          ? (col + row + Math.floor(timeSec * 1.5)) % 2 === 0
            ? '0'
            : '1'
          : auroraPool[Math.min(auroraPool.length - 1, Math.floor(band * (auroraPool.length - 1)) + 1)];
      if (ch === ' ') continue;

      const hueMix = 0.5 + 0.5 * Math.sin(uNorm * 4.5 + timeSec * 0.3);
      const r = (10 + 18 * hueMix) * band;
      const g = (76 + 68 * (1 - hueMix)) * band;
      const b = (78 + 74 * hueMix) * band;
      writeCell(grid, col, row, 1000, ch, r, g, b, 0, 254);
    }
  }

  // 2. Sparse background nodes
  if (skyField?.stars) {
    const stars = skyField.stars;
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      const col = Math.floor(s.u * cols);
      const row = Math.floor(s.v * rows);
      const twinkle = 0.45 + 0.55 * Math.sin(timeSec * s.speed + s.phase);
      const lum = s.bright * twinkle;
      if (lum < 0.30) continue;

      let ch = s.glyph;
      if (rampMode === 'binary') ch = i % 2 === 0 ? '0' : '1';
      else if (rampMode === 'ascii' && ch === '·') ch = '.';

      const base = 78 + 92 * lum;
      writeCell(grid, col, row, 950, ch, base * 0.45, base * 0.92, base * 0.88, 0, 253);
    }
  }

  // 3. Subtle periodic packet tracer across upper edge (~7.4s period)
  const cycle = timeSec % 7.4;
  if (cycle < 0.85) {
    const prog = cycle / 0.85;
    const headCol = Math.floor(cols * (0.14 + prog * 0.72));
    const headRow = Math.floor(rows * (0.08 + prog * 0.14));
    for (let seg = 0; seg < 5; seg++) {
      const fade = 1 - seg / 5;
      const ch =
        rampMode === 'binary'
          ? seg === 0
            ? '1'
            : '0'
          : seg === 0
            ? '+'
            : seg < 3
              ? '-'
              : '·';
      writeCell(
        grid,
        headCol - seg * 2,
        headRow - seg,
        920,
        ch,
        56 * fade,
        211 * fade,
        180 * fade,
        seg === 0 ? 1 : 0,
        252,
      );
    }
  }

  // 4. Floating foreground & background motes
  if (skyField?.motes) {
    const motes = skyField.motes;
    for (let i = 0; i < motes.length; i++) {
      const m = motes[i];
      const vWrapped = ((m.v0 - timeSec * m.vy) % 1 + 1) % 1;
      const uWrapped =
        ((m.u0 + timeSec * m.vx + Math.sin(timeSec * 1.4 + m.phase) * m.swayAmp) % 1 + 1) % 1;
      const col = Math.floor(uWrapped * cols);
      const row = Math.floor(vWrapped * rows);
      const depth = m.inFront ? 0.55 : 880;
      let ch = m.glyph;
      if (rampMode === 'binary') ch = i % 2 === 0 ? '1' : '0';
      else if (rampMode === 'ascii' && (ch === '∞' || ch === 'π' || ch === '×' || ch === '·')) {
        ch = i % 2 === 0 ? '*' : '.';
      }
      const boost = m.inFront ? 1.0 : 0.62;
      writeCell(
        grid,
        col,
        row,
        depth,
        ch,
        96 * boost + 120 * m.bright * boost,
        165 * boost + 75 * m.bright * boost,
        235 * boost,
        0,
        251,
      );
    }
  }
}

/**
 * Computes Blinn-Phong + rim + camera fill illumination factor for a volumetric point.
 */
function computePointIllum(nx, ny, nz, camX, camY, camZ) {
  const len = Math.hypot(nx, ny, nz) || 1;
  const ux = nx / len;
  const uy = ny / len;
  const uz = nz / len;

  const keyDiff = Math.max(0, ux * KEY_X + uy * KEY_Y + uz * KEY_Z);
  const rimDiff = Math.max(0, ux * RIM_X + uy * RIM_Y + uz * RIM_Z);

  // View vector from origin toward camera rotated into world orientation
  const vx = camX;
  const vy = camY;
  const vz = camZ;
  const vLen = Math.hypot(vx, vy, vz) || 1;
  const invVx = vx / vLen;
  const invVy = vy / vLen;
  const invVz = vz / vLen;
  const camFill = Math.max(0, ux * invVx + uy * invVy + uz * invVz);

  // Half-vector specular between key light and view vector
  let hx = KEY_X + invVx;
  let hy = KEY_Y + invVy;
  let hz = KEY_Z + invVz;
  const hLen = Math.hypot(hx, hy, hz) || 1;
  hx /= hLen;
  hy /= hLen;
  hz /= hLen;
  const spec = Math.pow(Math.max(0, ux * hx + uy * hy + uz * hz), 14) * 0.42;

  return clamp(0.24 + keyDiff * 0.62 + rimDiff * 0.24 + camFill * 0.26 + spec, 0.16, 1.38);
}

/**
 * Spills subtle phosphor glow from bright beacon/core glyphs into orthogonal neighbor sky cells.
 */
function applyAsciiLightBounce(grid, glyphMode) {
  const { cols, rows, glow, r, g, b, depths, chars } = grid;
  const fillChar = glyphMode === 'binary' ? '0' : glyphMode === 'ascii' ? '.' : '·';

  for (let row = 1; row < rows - 1; row++) {
    const rowOff = row * cols;
    for (let col = 1; col < cols - 1; col++) {
      const idx = rowOff + col;
      if (!glow[idx]) continue;

      const sr = Math.round(r[idx] * 0.34);
      const sg = Math.round(g[idx] * 0.34);
      const sb = Math.round(b[idx] * 0.34);
      if (sr + sg + sb < 28) continue;

      const neighbors = [idx - 1, idx + 1, idx - cols, idx + cols];
      for (let k = 0; k < 4; k++) {
        const nIdx = neighbors[k];
        if (depths[nIdx] < 800) continue; // Do not overwrite foreground geometry
        depths[nIdx] = 850;
        chars[nIdx] = fillChar;
        r[nIdx] = sr;
        g[nIdx] = sg;
        b[nIdx] = sb;
        glow[nIdx] = 0;
      }
    }
  }
}

/**
 * Lightweight deterministic pool for click-triggered mathematical spark bursts.
 */
export class BurstPool {
  constructor(capacity = 96) {
    this.sparks = [];
    this.capacity = capacity;
  }

  /**
   * Spawns a radial ring of sparks around normalized canvas coordinates (u, v).
   */
  spawnUv(u, v, burstHueSeed = 0.5) {
    const count = 20;
    const baseHue = ((burstHueSeed % 1) + 1) % 1;
    for (let i = 0; i < count; i++) {
      if (this.sparks.length >= this.capacity) {
        this.sparks.shift();
      }
      const angle = (i / count) * TAU + ((i % 3) - 1) * 0.14;
      const speed = 0.14 + (i % 5) * 0.045;
      const tint = (baseHue + i * 0.045) % 1;
      this.sparks.push({
        u,
        v,
        vu: Math.cos(angle) * speed,
        vv: Math.sin(angle) * speed * 1.15 - 0.04,
        life: 0,
        maxLife: 0.52 + (i % 4) * 0.14,
        idx: i,
        tint,
      });
    }
  }

  hasActive() {
    return this.sparks.length > 0;
  }

  step(dtSec) {
    if (this.sparks.length === 0) return;
    const safeDt = Math.min(0.05, Math.max(0, dtSec));
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.life += safeDt;
      if (s.life >= s.maxLife) {
        this.sparks.splice(i, 1);
        continue;
      }
      s.u += s.vu * safeDt;
      s.v += s.vv * safeDt;
      s.vv += 0.22 * safeDt;
      s.vu *= 1 - 1.8 * safeDt;
    }
  }
}

/**
 * Projects a 3D volumetric point cloud onto the Z-buffered ASCII/Math grid cleanly.
 * Exported as a pure function so unit tests can assert character projection without DOM.
 *
 * @param {ReturnType<createAsciiGrid>} grid
 * @param {ReturnType<import('./asciiScene.js').buildAsciiScene>} scene
 * @param {object} camera
 * @param {ReturnType<import('./asciiScene.js').createSkyField> | null} skyField
 * @param {{
 *   widthCss?: number,
 *   heightCss?: number,
 *   timeSec?: number,
 *   glyphMode?: 'math' | 'ascii' | 'binary',
 *   cursorUv?: { u: number, v: number, active: boolean } | null,
 *   bursts?: BurstPool | null,
 * }} [options]
 */
export function projectVolumetricToGrid(grid, scene, camera, skyField = null, options = {}) {
  clearGrid(grid);

  const timeSec = options.timeSec ?? 0;
  const glyphModeKey = Object.prototype.hasOwnProperty.call(GLYPH_MODES, options.glyphMode)
    ? options.glyphMode
    : 'math';
  const ramp = GLYPH_MODES[glyphModeKey].ramp;
  const rampMax = ramp.length - 1;

  renderBackdropSky(grid, skyField, timeSec, glyphModeKey);

  const count = scene?.count ?? 0;
  if (count === 0) return { activeGlyphs: 0 };

  const widthCss = Math.max(1, options.widthCss ?? grid.cols * 6);
  const heightCss = Math.max(1, options.heightCss ?? grid.rows * 10);
  const actualCellW = widthCss / grid.cols;
  const actualCellH = heightCss / grid.rows;

  const cy = Math.cos(camera.yawRad);
  const sy = Math.sin(camera.yawRad);
  const cp = Math.cos(camera.pitchRad);
  const sp = Math.sin(camera.pitchRad);
  const scalePx = Math.min(widthCss, heightCss) * 0.40 * camera.zoom;

  // Approximate camera world position vector for fill lighting
  const camWorldX = -sy * cp;
  const camWorldY = sp;
  const camWorldZ = cy * cp;

  const cursorUv = options.cursorUv?.active ? options.cursorUv : null;
  const cursorCol = cursorUv ? cursorUv.u * grid.cols : -999;
  const cursorRow = cursorUv ? cursorUv.v * grid.rows : -999;
  const scatterRadCols = Math.max(5, grid.cols * 0.085);
  const scatterRadRows = Math.max(3, grid.rows * 0.11);

  const { positions, normals, colors, kinds, phase, shine } = scene;
  const centerPxX = widthCss * 0.5;
  const centerPxY = heightCss * 0.53;

  for (let i = 0; i < count; i++) {
    const o3 = i * 3;
    const x = positions[o3];
    const y = positions[o3 + 1];
    const z = positions[o3 + 2];

    const rx = x * cy + z * sy;
    const rz = -x * sy + z * cy;
    const py = y * cp + rz * sp;
    const pz = -y * sp + rz * cp;

    const zCam = camera.cameraDist + pz;
    if (zCam <= 0.45) continue;

    const proj = camera.focalScale / zCam;
    let col = Math.round((centerPxX + rx * proj * scalePx) / actualCellW);
    let row = Math.round((centerPxY - py * proj * scalePx) / actualCellH);

    // Interactive cursor scatter ripple like ASCII-CHRISTMAS
    let hoverBoost = 0;
    if (cursorUv) {
      const dc = col - cursorCol;
      const dr = (row - cursorRow) * (scatterRadCols / scatterRadRows);
      const distSq = dc * dc + dr * dr;
      const rSq = scatterRadCols * scatterRadCols;
      if (distSq < rSq && distSq > 0.01) {
        const dist = Math.sqrt(distSq);
        const factor = 1 - dist / scatterRadCols;
        const push = factor * factor * 2.4;
        col += Math.round((dc / dist) * push);
        row += Math.round((dr / dist) * push * 0.65);
        hoverBoost = factor * 0.35;
      }
    }

    if (col < 0 || col >= grid.cols || row < 0 || row >= grid.rows) continue;

    const kind = kinds[i];
    const depthBias =
      kind === PART_KINDS.BEACON
        ? -0.09
        : kind === PART_KINDS.CORE
          ? -0.05
          : kind === PART_KINDS.GROUND
            ? 0.2
            : 0;
    const depth = zCam + depthBias;
    const idx = row * grid.cols + col;
    if (depth >= grid.depths[idx]) continue;

    const depthAtten = clamp(1.38 - (zCam - 2.1) / 3.4, 0.24, 1.05);
    const illum =
      kind === PART_KINDS.GROUND
        ? 0.42
        : computePointIllum(
            normals[o3],
            normals[o3 + 1],
            normals[o3 + 2],
            camWorldX,
            camWorldY,
            camWorldZ,
          );

    const pulse =
      kind === PART_KINDS.BEACON
        ? 0.72 + 0.28 * Math.sin(timeSec * 4.4 + phase[i])
        : 1.0;

    const lum = clamp(
      illum * depthAtten * shine[i] * pulse + hoverBoost + (kind === PART_KINDS.SURFACE ? 0.14 : 0),
      0.16,
      1.0,
    );
    let rampIdx = Math.max(1, Math.round(lum * rampMax));
    if (glyphModeKey === 'binary') {
      // Shimmer binary density between '0' and '1' in high-luminance cells
      rampIdx = lum > 0.56 ? 4 + ((col + row + i) & 3) : 1 + ((col * 3 + row) & 2);
    } else if (kind === PART_KINDS.BEACON && lum > 0.75) {
      rampIdx = rampMax;
    }

    const ch = ramp[rampIdx] || ramp[rampMax];
    const cr = colors[o3] * 255 * clamp(illum * 0.96 + hoverBoost, 0.36, 1.18);
    const cg = colors[o3 + 1] * 255 * clamp(illum * 0.98 + hoverBoost, 0.38, 1.18);
    const cb = colors[o3 + 2] * 255 * clamp(illum * 1.0 + hoverBoost, 0.38, 1.18);
    const hasGlow =
      kind === PART_KINDS.BEACON || kind === PART_KINDS.CORE || (kind === PART_KINDS.SURFACE && lum > 0.91);

    writeCell(grid, col, row, depth, ch, cr, cg, cb, hasGlow ? 1 : 0, kind);
  }

  // Click bursts composited near camera plane
  if (options.bursts?.sparks?.length) {
    const burstPool =
      glyphModeKey === 'binary'
        ? BURST_GLYPHS_BIN
        : glyphModeKey === 'ascii'
          ? BURST_GLYPHS_ASCII
          : BURST_GLYPHS_MATH;
    for (let i = 0; i < options.bursts.sparks.length; i++) {
      const spk = options.bursts.sparks[i];
      const fade = 1 - spk.life / spk.maxLife;
      if (fade <= 0) continue;
      const col = Math.round(spk.u * grid.cols);
      const row = Math.round(spk.v * grid.rows);
      const ch = burstPool[spk.idx % burstPool.length];
      const mix = 0.5 + 0.5 * Math.cos(spk.tint * TAU);
      const br = Math.round((48 + 42 * mix) * fade);
      const bg = Math.round((205 + 48 * mix) * fade);
      const bb = Math.round((172 + 80 * (1 - mix)) * fade);
      writeCell(grid, col, row, 0.25, ch, br, bg, bb, fade > 0.35 ? 1 : 0, PART_KINDS.BEACON);
    }
  }

  applyAsciiLightBounce(grid, glyphModeKey);

  let activeGlyphs = 0;
  for (let i = 0; i < grid.size; i++) {
    if (grid.chars[i] !== EMPTY_CHAR) activeGlyphs++;
  }
  return { activeGlyphs };
}

/**
 * Generates and caches a pre-rendered 32x32 soft radial glow sprite for quantized colors.
 * Avoids allocating per-cell CanvasRadialGradient objects inside the animation loop.
 */
function createGlowSpriteCache() {
  const sprites = new Map();
  return function getGlowSprite(r, g, b) {
    if (typeof document === 'undefined') return null;
    const qr = Math.round(r / 42) * 42;
    const qg = Math.round(g / 42) * 42;
    const qb = Math.round(b / 42) * 42;
    const key = (qr << 16) | (qg << 8) | qb;
    let canvas = sprites.get(key);
    if (canvas) return canvas;

    canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const gctx = canvas.getContext('2d');
    if (!gctx) return null;

    const grad = gctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, `rgba(${qr}, ${qg}, ${qb}, 0.34)`);
    grad.addColorStop(0.28, `rgba(${qr}, ${qg}, ${qb}, 0.16)`);
    grad.addColorStop(0.62, `rgba(${qr}, ${qg}, ${qb}, 0.04)`);
    grad.addColorStop(1, `rgba(${qr}, ${qg}, ${qb}, 0)`);
    gctx.fillStyle = grad;
    gctx.fillRect(0, 0, 32, 32);

    if (sprites.size < 96) {
      sprites.set(key, canvas);
    }
    return canvas;
  };
}

/**
 * Hardware-friendly 60fps ASCII & Math-symbol 3D canvas renderer.
 */
export class AsciiMathRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.widthCss = 0;
    this.heightCss = 0;
    this.dpr = 0;
    this.grid = null;
    this.bursts = new BurstPool(96);
    this.cursorUv = { u: 0.5, v: 0.5, active: false };
    this.glyphMode = 'math';
    this.getGlowSprite = createGlowSpriteCache();
    this.resize();
  }

  setGlyphMode(modeId) {
    if (Object.prototype.hasOwnProperty.call(GLYPH_MODES, modeId)) {
      this.glyphMode = modeId;
    }
  }

  setCursorUv(u, v, active) {
    this.cursorUv.u = clamp(u, 0, 1);
    this.cursorUv.v = clamp(v, 0, 1);
    this.cursorUv.active = Boolean(active);
  }

  triggerBurst(u, v, hueSeed = 0.5) {
    this.bursts.spawnUv(clamp(u, 0, 1), clamp(v, 0, 1), hueSeed);
  }

  stepBursts(dtSec) {
    this.bursts.step(dtSec);
  }

  hasActiveBursts() {
    return this.bursts.hasActive();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    const rawDpr =
      typeof globalThis !== 'undefined' && typeof globalThis.devicePixelRatio === 'number'
        ? globalThis.devicePixelRatio
        : 1;
    const dpr = Math.min(rawDpr || 1, 2);

    const targetW = Math.round(w * dpr);
    const targetH = Math.round(h * dpr);
    if (
      this.widthCss === w &&
      this.heightCss === h &&
      this.dpr === dpr &&
      this.canvas.width === targetW &&
      this.canvas.height === targetH
    ) {
      return;
    }

    this.widthCss = w;
    this.heightCss = h;
    this.dpr = dpr;
    this.canvas.width = targetW;
    this.canvas.height = targetH;

    // Derive crisp readable cell matrix proportions matched to monospace ~0.60 aspect ratio
    const targetRows = clamp(Math.round(h / 9.4), 34, 78);
    const cellH = h / targetRows;
    const cellW = Math.max(4.5, cellH * 0.60);
    const cols = clamp(Math.floor(w / cellW), 44, 156);

    if (!this.grid || this.grid.cols !== cols || this.grid.rows !== targetRows) {
      this.grid = createAsciiGrid(cols, targetRows);
    }
  }

  render(scene, camera, skyField, timeSec) {
    if (this.widthCss === 0 || this.heightCss === 0 || this.canvas.width === 0 || this.canvas.height === 0) {
      this.resize();
    }
    const ctx = this.ctx;
    if (!ctx || !this.grid) {
      return { points: scene?.positions || null, count: scene?.count || 0, activeGlyphs: 0, cols: 0, rows: 0 };
    }

    const w = this.widthCss;
    const h = this.heightCss;
    const { activeGlyphs } = projectVolumetricToGrid(this.grid, scene, camera, skyField, {
      widthCss: w,
      heightCss: h,
      timeSec,
      glyphMode: this.glyphMode,
      cursorUv: this.cursorUv,
      bursts: this.bursts,
    });

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = BACKDROP_HEX;
    ctx.fillRect(0, 0, w, h);

    const { cols, rows, chars, r, g, b, glow } = this.grid;
    const actualCellW = w / cols;
    const actualCellH = h / rows;
    const fontSize = clamp(Math.round(actualCellH * 0.94 * 10) / 10, 7.2, 11.0);

    // 1. Pre-baked glow sprites pass underneath glyphs
    const prevComp = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = 'lighter';
    const glowSize = Math.max(14, actualCellH * 2.4);
    const halfGlow = glowSize * 0.5;

    for (let row = 0; row < rows; row++) {
      const cy = (row + 0.5) * actualCellH;
      const rowOff = row * cols;
      for (let col = 0; col < cols; col++) {
        const idx = rowOff + col;
        if (!glow[idx]) continue;
        const sprite = this.getGlowSprite(r[idx], g[idx], b[idx]);
        if (sprite) {
          const cx = (col + 0.5) * actualCellW;
          ctx.drawImage(sprite, cx - halfGlow, cy - halfGlow, glowSize, glowSize);
        }
      }
    }
    ctx.globalCompositeOperation = prevComp;

    // 2. Crisp monospace glyph rasterization pass
    ctx.font = `600 ${fontSize}px 'JetBrains Mono', 'SFMono-Regular', ui-monospace, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let lastFill = '';
    for (let row = 0; row < rows; row++) {
      const cy = (row + 0.5) * actualCellH;
      const rowOff = row * cols;
      for (let col = 0; col < cols; col++) {
        const idx = rowOff + col;
        const ch = chars[idx];
        if (ch === EMPTY_CHAR) continue;

        const css = getQuantizedCssColor(r[idx], g[idx], b[idx]);
        if (css !== lastFill) {
          ctx.fillStyle = css;
          lastFill = css;
        }
        ctx.fillText(ch, (col + 0.5) * actualCellW, cy);
      }
    }

    return {
      points: scene.positions,
      count: scene.count,
      activeGlyphs,
      cols,
      rows,
    };
  }
}
