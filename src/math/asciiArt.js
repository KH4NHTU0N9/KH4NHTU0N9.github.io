import { clamp, spectralRgbUnit } from './mathArt.js?v=gcs26';
import { GLYPH_MODES } from './asciiScene.js?v=gcs26';

const TAU = Math.PI * 2;

function resolveModeKey(glyphMode) {
  return Object.prototype.hasOwnProperty.call(GLYPH_MODES, glyphMode) ? glyphMode : 'math';
}

function getRamp(glyphMode) {
  return GLYPH_MODES[resolveModeKey(glyphMode)].ramp;
}

/**
 * Generates calm animated fallback sigil rows when portrait pixels are unavailable.
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
      const lum = clamp(ring * 0.85 + core * 0.72, 0.12, 1);

      const band = 0.36 + 0.24 * (0.5 + 0.5 * Math.sin(Math.atan2(ny, nx) + timeSec * 0.6));
      const [sr, sg, sb] = spectralRgbUnit(band);
      const ch =
        mode === 'binary'
          ? lum > 0.44
            ? '1'
            : '0'
          : ramp[clamp(Math.round(lum * rampMax), 1, rampMax)];

      const cr = Math.round((32 + sr * 180) * lum);
      const cg = Math.round((78 + sg * 175) * lum);
      const cb = Math.round((88 + sb * 165) * lum);
      rowCells.push({ ch, css: `rgb(${cr},${cg},${cb})` });
    }
    result.push(rowCells);
  }
  return result;
}

/**
 * Quantizes an RGBA pixel buffer (e.g. avatar canvas ImageData) into colorized
 * ASCII / Math / Binary character rows cleanly for pure zero-DOM unit testing.
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

      const cr = clamp(Math.round(pr * 1.15 + 34 * boostedLum), 0, 255);
      const cg = clamp(Math.round(pg * 1.15 + 38 * boostedLum), 0, 255);
      const cb = clamp(Math.round(pb * 1.15 + 42 * boostedLum), 0, 255);
      rowCells.push({ ch, css: `rgb(${cr},${cg},${cb})` });
    }
    out.push(rowCells);
  }

  return out;
}
