import { clamp, spectralRgba } from './mathArt.js?v=gcs24';
import { GLYPH_MODES } from './asciiScene.js?v=gcs24';

const SPECTRUM_BANDS = 16;
const SCOPE_COLS = 34;

/**
 * Renders a real-time 2D ASCII/Math/Binary oscilloscope waveform & spectral energy analyzer
 * sampled directly from the active 3D manifold's displacement buffer.
 */
export class OscilloscopeRenderer {
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.widthCss = 0;
    this.heightCss = 0;
    this.dpr = 0;
    this.glyphMode = 'math';
    this.bandEnergy = new Float32Array(SPECTRUM_BANDS);
    this.bandCounts = new Uint16Array(SPECTRUM_BANDS);
    this.resize();
  }

  setGlyphMode(modeId) {
    if (Object.prototype.hasOwnProperty.call(GLYPH_MODES, modeId)) {
      this.glyphMode = modeId;
    }
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(180, Math.floor(rect.width || 360));
    const h = Math.max(64, Math.floor(rect.height || 84));
    const dpr = clamp(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 1, 2);
    const targetW = Math.round(w * dpr);
    const targetH = Math.round(h * dpr);

    if (
      w === this.widthCss &&
      h === this.heightCss &&
      dpr === this.dpr &&
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
  }

  /**
   * Plots live ASCII/Math waveform + spectrum and returns true peak & RMS amplitudes.
   * @param {{ positions?: Float32Array, points?: Float32Array, count?: number }} scene
   * @param {'math' | 'ascii' | 'binary'} [glyphMode]
   * @returns {{ peak: number, rms: number }}
   */
  render(scene, glyphMode = this.glyphMode) {
    if (this.widthCss === 0 || this.heightCss === 0 || this.canvas.width === 0 || this.canvas.height === 0) {
      this.resize();
    }
    const ctx = this.ctx;
    const pts = scene?.positions || scene?.points;
    const vertCount = scene?.count ?? Math.floor((pts?.length || 0) / 3);
    if (!ctx || !pts || vertCount <= 0) {
      return { peak: 0, rms: 0 };
    }

    const mode = Object.prototype.hasOwnProperty.call(GLYPH_MODES, glyphMode) ? glyphMode : 'math';
    const ramp = GLYPH_MODES[mode].ramp;
    const rampMax = ramp.length - 1;

    const w = this.widthCss;
    const h = this.heightCss;

    this.bandEnergy.fill(0);
    this.bandCounts.fill(0);

    let peak = 0;
    let sumSq = 0;
    for (let i = 0; i < vertCount; i++) {
      const y = pts[i * 3 + 1];
      const absY = Math.abs(y);
      if (absY > peak) peak = absY;
      sumSq += y * y;

      const band = Math.min(SPECTRUM_BANDS - 1, Math.floor((i / vertCount) * SPECTRUM_BANDS));
      this.bandEnergy[band] += absY;
      this.bandCounts[band]++;
    }
    const rms = Math.sqrt(sumSq / Math.max(1, vertCount));
    const normScale = Math.max(0.8, peak * 1.15);

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = '#020308';
    ctx.fillRect(0, 0, w, h);

    // Monospace calibrated ASCII graticule
    const midY = h * 0.5;
    const specX = Math.floor(w * 0.68);
    ctx.font = "600 9px 'JetBrains Mono', ui-monospace, monospace";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = 'rgba(165, 195, 235, 0.22)';
    const gridCols = Math.floor((specX - 8) / 8);
    for (let c = 0; c < gridCols; c++) {
      const gx = 6 + c * 8;
      ctx.fillText(c % 6 === 0 ? '+' : '·', gx, midY);
    }

    // Divider rail between waveform and spectrum
    const dividerGlyph = mode === 'binary' ? ':' : mode === 'ascii' ? '|' : '┆';
    for (let y = 6; y < h - 4; y += 9) {
      ctx.fillText(dividerGlyph, specX - 4, y);
    }

    // Left 66%: Real-time ASCII / Math / Binary waveform plot + stem fade
    const waveW = specX - 16;
    const colStep = waveW / Math.max(1, SCOPE_COLS - 1);
    for (let s = 0; s < SCOPE_COLS; s++) {
      const tNorm = s / (SCOPE_COLS - 1);
      const idx = Math.min(vertCount - 1, Math.floor(tNorm * (vertCount - 1)));
      const yVal = clamp(pts[idx * 3 + 1] / normScale, -1, 1);
      const px = 8 + s * colStep;
      const py = midY - yVal * (h * 0.36);

      // Subtle vertical trail glyph from zero baseline toward peak
      const deltaY = py - midY;
      if (Math.abs(deltaY) > 10) {
        const stemY = midY + deltaY * 0.52;
        ctx.fillStyle = 'rgba(255, 77, 0, 0.34)';
        ctx.fillText(mode === 'binary' ? '0' : '·', px, stemY);
      }

      const intensity = clamp(Math.abs(yVal) * 0.7 + 0.3, 0.25, 1);
      const glyph =
        mode === 'binary'
          ? Math.abs(yVal) > 0.35
            ? '1'
            : '0'
          : ramp[clamp(Math.round(intensity * rampMax), 1, rampMax)];

      ctx.fillStyle = Math.abs(yVal) > 0.55 ? '#ff7a33' : '#ff4d00';
      ctx.fillText(glyph, px, py);
    }

    // Right 30%: Real-time ASCII / Math / Binary vertical spectral analyzer stacks
    const specW = w - specX - 6;
    const bandStep = specW / SPECTRUM_BANDS;
    const maxRows = clamp(Math.floor((h - 10) / 8.5), 4, 9);
    const rowStep = (h - 10) / maxRows;

    for (let b = 0; b < SPECTRUM_BANDS; b++) {
      const avg = this.bandCounts[b] > 0 ? this.bandEnergy[b] / this.bandCounts[b] : 0;
      const litRows = Math.max(1, Math.round(clamp(avg / normScale, 0, 1) * maxRows));
      const bx = specX + 6 + b * bandStep;
      ctx.fillStyle = spectralRgba(b / SPECTRUM_BANDS, 0.88);

      for (let r = 0; r < litRows; r++) {
        const frac = (r + 1) / maxRows;
        const ch =
          mode === 'binary'
            ? r === litRows - 1 || (b + r) % 2 === 0
              ? '1'
              : '0'
            : ramp[clamp(Math.round(frac * rampMax), 1, rampMax)];
        const by = h - 6 - r * rowStep;
        ctx.fillText(ch, bx, by);
      }
    }

    return { peak, rms };
  }
}
