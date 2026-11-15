import { clamp, spectralRgbUnit } from './mathArt.js?v=gcs24';
import { GLYPH_MODES } from './asciiScene.js?v=gcs24';

const TAU = Math.PI * 2;
const MODE_CYCLE = Object.keys(GLYPH_MODES);

function resolveModeKey(glyphMode) {
  return Object.prototype.hasOwnProperty.call(GLYPH_MODES, glyphMode) ? glyphMode : 'math';
}

function getRamp(glyphMode) {
  return GLYPH_MODES[resolveModeKey(glyphMode)].ramp;
}

/**
 * Deterministic 32-bit FNV-1a string hash for seeding per-card ASCII geometry.
 * @param {string} input
 * @returns {number}
 */
export function hashString32(input) {
  let h = 2166136261;
  const text = String(input || 'KH4NHTU0N9');
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Generates an animated full-width ASCII/Math/Binary horizon band divider.
 * Pure string output bounded strictly to `cols` characters.
 *
 * @param {number} [cols]
 * @param {number} [timeSec]
 * @param {'math' | 'ascii' | 'binary'} [glyphMode]
 * @returns {string}
 */
export function generateHorizonBanner(cols = 96, timeSec = 0, glyphMode = 'math') {
  const width = clamp(Math.floor(cols), 16, 160);
  const mode = resolveModeKey(glyphMode);
  const ramp = getRamp(mode);
  const rampMax = ramp.length - 1;
  const out = new Array(width);

  for (let c = 0; c < width; c++) {
    if (c === 0) {
      out[c] = mode === 'ascii' ? '[' : mode === 'binary' ? '1' : '╞';
      continue;
    }
    if (c === width - 1) {
      out[c] = mode === 'ascii' ? ']' : mode === 'binary' ? '1' : '╡';
      continue;
    }
    if (c % 24 === 0) {
      out[c] = mode === 'binary' ? '|' : mode === 'ascii' ? '+' : '╪';
      continue;
    }

    const x = c / width;
    const carrier =
      0.5 +
      0.34 * Math.sin(x * TAU * 4.5 - timeSec * 1.9) +
      0.16 * Math.cos(x * TAU * 9.0 + timeSec * 1.3);
    if (mode === 'binary') {
      const bit = (Math.round(carrier * 7) + c + Math.floor(timeSec * 3)) & 1;
      out[c] = c % 4 === 0 ? '-' : bit ? '1' : '0';
    } else {
      const idx = clamp(Math.round(carrier * rampMax), 1, rampMax);
      out[c] = ramp[idx];
    }
  }
  return out.join('');
}

/**
 * Generates a compact 3-line × 36-char live procedural ASCII telemetry mini-banner
 * tailored to each capability domain (`embedded`, `security`, `systems`).
 *
 * @param {string} domainId
 * @param {number} [timeSec]
 * @param {'math' | 'ascii' | 'binary'} [glyphMode]
 * @returns {string[]}
 */
export function generateDomainBanner(domainId, timeSec = 0, glyphMode = 'math') {
  const mode = resolveModeKey(glyphMode);
  const ramp = getRamp(mode);
  const rampMax = ramp.length - 1;
  const phase = Math.floor(timeSec * 4.5);
  const width = 36;
  const lines = [];

  if (domainId === 'embedded') {
    for (let r = 0; r < 3; r++) {
      let row = r === 0 ? 'CH0 ' : r === 1 ? 'PWM ' : 'IMU ';
      for (let c = 4; c < width; c++) {
        if (r < 2) {
          const duty = r === 0 ? 3 : 2;
          const period = r === 0 ? 6 : 5;
          const hi = ((c + phase + r * 2) % period) < duty;
          if (mode === 'binary') row += hi ? '1' : '0';
          else if (mode === 'ascii') row += hi ? '#' : '_';
          else row += hi ? '▀' : '·';
        } else {
          const w = 0.5 + 0.5 * Math.sin((c + phase * 0.6) * 0.45);
          const idx = clamp(Math.round(w * rampMax), 1, rampMax);
          row += mode === 'binary' ? (w > 0.5 ? '1' : '0') : ramp[idx];
        }
      }
      lines.push(row.slice(0, width));
    }
    return lines;
  }

  if (domainId === 'security') {
    const hexChars = '0123456789ABCDEF';
    for (let r = 0; r < 3; r++) {
      let row = r === 0 ? 'PKT ' : r === 1 ? 'XOR ' : 'ENT ';
      for (let c = 4; c < width; c++) {
        const s = (c * 13 + r * 29 + phase * 7) ^ (c >> 1);
        if (mode === 'binary') {
          row += s & 1 ? '1' : '0';
        } else if (r === 1 && c % 3 !== 0) {
          row += hexChars[Math.abs(s) % hexChars.length];
        } else {
          const norm = ((Math.sin(s * 0.19) + 1) * 0.5);
          const idx = clamp(Math.round(norm * rampMax), 1, rampMax);
          row += ramp[idx];
        }
      }
      lines.push(row.slice(0, width));
    }
    return lines;
  }

  // Default / 'systems' distributed topology flow
  for (let r = 0; r < 3; r++) {
    if (r === 0) {
      const pulseCol = 6 + (phase % 22);
      let row = '[API]';
      for (let c = 5; c < 31; c++) {
        if (c === pulseCol) {
          row += mode === 'binary' ? '1' : mode === 'ascii' ? '>' : 'π';
        } else if (c === 18) {
          row += mode === 'binary' ? '0' : mode === 'ascii' ? '@' : '∞';
        } else {
          row += mode === 'ascii' ? '-' : '─';
        }
      }
      row += '[DB] ';
      lines.push(row.slice(0, width));
    } else {
      let row = r === 1 ? 'BUS ' : 'DAG ';
      for (let c = 4; c < width; c++) {
        const wave = 0.5 + 0.5 * Math.cos((c - phase * 0.8) * 0.38 + r * 1.4);
        if (mode === 'binary') {
          row += wave > 0.48 ? '1' : '0';
        } else {
          const idx = clamp(Math.round(wave * rampMax), 1, rampMax);
          row += ramp[idx];
        }
      }
      lines.push(row.slice(0, width));
    }
  }
  return lines;
}

/**
 * Generates a deterministic 3-line × 34-char procedural ASCII/Math waveform banner
 * seeded from repository metadata so each repo card carries unique live math geometry.
 *
 * @param {string} repoName
 * @param {string} [language]
 * @param {number} [stars]
 * @param {number} [timeSec]
 * @param {'math' | 'ascii' | 'binary'} [glyphMode]
 * @returns {{ lines: string[], accentCss: string }}
 */
export function generateRepoAsciiPreview(
  repoName,
  language = 'Code',
  stars = 0,
  timeSec = 0,
  glyphMode = 'math',
) {
  const mode = resolveModeKey(glyphMode);
  const ramp = getRamp(mode);
  const rampMax = ramp.length - 1;
  const seed = hashString32(`${repoName}:${language}:${stars}`);
  const k1 = 1.6 + ((seed & 0x1f) / 31) * 3.4;
  const k2 = 2.4 + (((seed >> 5) & 0x1f) / 31) * 4.2;
  const phi = (((seed >> 10) & 0xff) / 255) * TAU;
  const cols = 34;
  const lines = [];

  for (let row = 0; row < 3; row++) {
    let str = '';
    const yNorm = (row - 1) * 0.72;
    for (let col = 0; col < cols; col++) {
      const x = (col / (cols - 1)) * 2 - 1;
      const waveY =
        0.65 * Math.sin(x * k1 + timeSec * 1.45 + phi) * Math.cos(x * k2 * 0.55 - timeSec * 0.8);
      const dist = Math.abs(yNorm - waveY);
      const intensity = clamp(1 - dist * 0.78, 0.14, 1);

      if (mode === 'binary') {
        str += intensity > 0.55 || ((seed + col + row) & 3) === 0 ? '1' : '0';
      } else {
        const idx = clamp(Math.round(intensity * rampMax), 1, rampMax);
        str += ramp[idx];
      }
    }
    lines.push(str);
  }

  const hue = (seed % 360) / 360;
  const [cr, cg, cb] = spectralRgbUnit(hue);
  const accentCss = `rgb(${Math.round(90 + cr * 165)}, ${Math.round(115 + cg * 140)}, ${Math.round(135 + cb * 120)})`;
  return { lines, accentCss };
}

/**
 * Formats an inline ASCII skill signal tag aligned cleanly inside capability list items.
 *
 * @param {number} index
 * @param {number} _total
 * @param {number} [timeSec]
 * @param {'math' | 'ascii' | 'binary'} [glyphMode]
 * @returns {string}
 */
export function formatSkillMeter(index, _total, timeSec = 0, glyphMode = 'math') {
  const mode = resolveModeKey(glyphMode);
  const ramp = getRamp(mode);
  const rampMax = ramp.length - 1;
  const step = Math.floor(timeSec * 3.0);

  let bars = '';
  for (let slot = 0; slot < 4; slot++) {
    const val = 0.5 + 0.5 * Math.sin((index + 1) * 0.9 + slot * 1.15 + step * 0.35);
    if (mode === 'binary') {
      bars += val > 0.48 ? '1' : '0';
    } else {
      const idx = clamp(Math.round(val * rampMax), 1, rampMax);
      bars += ramp[idx];
    }
  }
  return bars;
}

/**
 * Generates animated parametric ASCII sigil rows when raw portrait pixels are unavailable.
 *
 * @param {number} [cols]
 * @param {number} [rows]
 * @param {number} [timeSec]
 * @param {'math' | 'ascii' | 'binary'} [glyphMode]
 */
export function generateFallbackSigilRows(cols = 16, rows = 10, timeSec = 0, glyphMode = 'math') {
  const mode = resolveModeKey(glyphMode);
  const ramp = getRamp(mode);
  const rampMax = ramp.length - 1;
  const result = [];

  for (let r = 0; r < rows; r++) {
    const ny = (r / Math.max(1, rows - 1)) * 2 - 1;
    const rowCells = [];
    for (let c = 0; c < cols; c++) {
      const nx = (c / Math.max(1, cols - 1)) * 2 - 1;
      const rad = Math.hypot(nx, ny * 1.08);
      const ring = Math.exp(-Math.pow((rad - 0.58) * 3.8, 2));
      const core = Math.max(0, 1 - rad * 1.45);
      const lum = clamp(ring * 0.85 + core * 0.72, 0.08, 1);

      const hue = (0.5 + Math.atan2(ny, nx) / TAU + timeSec * 0.12) % 1;
      const [sr, sg, sb] = spectralRgbUnit(hue);
      const ch =
        mode === 'binary'
          ? lum > 0.42
            ? (c + r + Math.floor(timeSec * 3)) % 2 === 0
              ? '1'
              : '0'
            : '0'
          : lum > 0.18
            ? ramp[clamp(Math.round(lum * rampMax), 1, rampMax)]
            : '·';

      const cr = Math.round((45 + sr * 210) * lum);
      const cg = Math.round((65 + sg * 190) * lum);
      const cb = Math.round((95 + sb * 160) * lum);
      rowCells.push({ ch, css: `rgb(${cr},${cg},${cb})` });
    }
    result.push(rowCells);
  }
  return result;
}

/**
 * Quantizes an RGBA pixel buffer (e.g. avatar canvas ImageData) into colorized
 * ASCII / Math / Binary character rows. Pure JS for zero-DOM unit testing.
 *
 * @param {Uint8ClampedArray | number[]} pixelsRgba
 * @param {number} srcW
 * @param {number} srcH
 * @param {number} [cols]
 * @param {number} [rows]
 * @param {'math' | 'ascii' | 'binary'} [glyphMode]
 * @returns {Array<Array<{ ch: string, css: string }>>}
 */
export function sampleImagePixelsToAscii(
  pixelsRgba,
  srcW,
  srcH,
  cols = 16,
  rows = 10,
  glyphMode = 'math',
) {
  if (!pixelsRgba || !pixelsRgba.length || srcW <= 0 || srcH <= 0) {
    return generateFallbackSigilRows(cols, rows, 0, glyphMode);
  }

  const mode = resolveModeKey(glyphMode);
  const ramp = getRamp(mode);
  const rampMax = ramp.length - 1;
  const out = [];

  for (let row = 0; row < rows; row++) {
    const sy = Math.min(srcH - 1, Math.floor(((row + 0.5) / rows) * srcH));
    const rowCells = [];
    for (let col = 0; col < cols; col++) {
      const sx = Math.min(srcW - 1, Math.floor(((col + 0.5) / cols) * srcW));
      const pIdx = (sy * srcW + sx) * 4;
      const pr = pixelsRgba[pIdx] ?? 0;
      const pg = pixelsRgba[pIdx + 1] ?? 0;
      const pb = pixelsRgba[pIdx + 2] ?? 0;
      const pa = (pixelsRgba[pIdx + 3] ?? 255) / 255;

      const lum = clamp(((0.299 * pr + 0.587 * pg + 0.114 * pb) / 255) * pa, 0.05, 1);
      const boostedLum = clamp(Math.pow(lum, 0.62), 0.18, 1);

      let ch;
      if (mode === 'binary') {
        ch = boostedLum > 0.45 ? '1' : '0';
      } else {
        const idx = clamp(Math.round(boostedLum * rampMax), 2, rampMax);
        ch = ramp[idx];
      }

      // Lift vibrant midtones & dark shadows so portrait silhouette pops clearly on #020308
      const cr = clamp(Math.round(pr * 1.18 + 38 * boostedLum), 0, 255);
      const cg = clamp(Math.round(pg * 1.18 + 38 * boostedLum), 0, 255);
      const cb = clamp(Math.round(pb * 1.18 + 46 * boostedLum), 0, 255);
      rowCells.push({ ch, css: `rgb(${cr},${cg},${cb})` });
    }
    out.push(rowCells);
  }

  return out;
}

export { MODE_CYCLE };
