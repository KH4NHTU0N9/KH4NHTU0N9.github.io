import { clamp, spectralRgba } from './mathArt.js';

const SPECTRUM_BANDS = 18;
const SCOPE_SAMPLES = 72;

/**
 * Renders a real-time 2D oscilloscope waveform & spectral energy analyzer
 * sampled directly from the active 3D manifold's vertex displacement buffer.
 */
export class OscilloscopeRenderer {
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.widthCss = 360;
    this.heightCss = 84;
    this.dpr = 1;
    this.bandEnergy = new Float32Array(SPECTRUM_BANDS);
    this.bandCounts = new Uint16Array(SPECTRUM_BANDS);
    this.resize();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(180, Math.floor(rect.width || 360));
    const h = Math.max(64, Math.floor(rect.height || 84));
    const dpr = clamp(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 1, 2);

    if (w === this.widthCss && h === this.heightCss && dpr === this.dpr) {
      return;
    }
    this.widthCss = w;
    this.heightCss = h;
    this.dpr = dpr;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
  }

  /**
   * Plots live signal metrics and returns true peak & RMS amplitudes from `scene.points`.
   * @param {{ points: Float32Array, wavelengths: Float32Array }} scene
   * @returns {{ peak: number, rms: number }}
   */
  render(scene) {
    this.resize();
    const ctx = this.ctx;
    if (!ctx || !scene?.points?.length) {
      return { peak: 0, rms: 0 };
    }

    const w = this.widthCss;
    const h = this.heightCss;
    const vertCount = Math.floor(scene.points.length / 3);

    this.bandEnergy.fill(0);
    this.bandCounts.fill(0);

    let peak = 0;
    let sumSq = 0;
    for (let i = 0; i < vertCount; i++) {
      const y = scene.points[i * 3 + 1];
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
    ctx.fillStyle = '#030406';
    ctx.fillRect(0, 0, w, h);

    // Calibrated graticule divisions
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.08)';
    ctx.beginPath();
    const midY = Math.floor(h * 0.5) + 0.5;
    ctx.moveTo(0, midY);
    ctx.lineTo(w, midY);
    ctx.moveTo(0, Math.floor(h * 0.25) + 0.5);
    ctx.lineTo(w, Math.floor(h * 0.25) + 0.5);
    ctx.moveTo(0, Math.floor(h * 0.75) + 0.5);
    ctx.lineTo(w, Math.floor(h * 0.75) + 0.5);
    for (let c = 1; c < 8; c++) {
      const gx = Math.floor((c / 8) * w) + 0.5;
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, h);
    }
    ctx.stroke();

    // Spectral bar histogram on right 28% of scope
    const specX = Math.floor(w * 0.72);
    const specW = w - specX - 4;
    const barW = Math.max(2, Math.floor(specW / SPECTRUM_BANDS) - 2);

    ctx.strokeStyle = 'rgba(226, 232, 240, 0.16)';
    ctx.beginPath();
    ctx.moveTo(specX - 4.5, 0);
    ctx.lineTo(specX - 4.5, h);
    ctx.stroke();

    for (let b = 0; b < SPECTRUM_BANDS; b++) {
      const avg = this.bandCounts[b] > 0 ? this.bandEnergy[b] / this.bandCounts[b] : 0;
      const barH = Math.max(2, Math.round(clamp(avg / normScale, 0, 1) * (h - 14)));
      const bx = specX + b * (barW + 2);
      const by = h - 4 - barH;
      ctx.fillStyle = spectralRgba(b / SPECTRUM_BANDS, 0.78);
      ctx.fillRect(bx, by, barW, barH);
    }

    // Continuous sampled waveform trace on left 70%
    const waveW = specX - 10;
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = '#ff4d00';
    ctx.beginPath();
    for (let s = 0; s < SCOPE_SAMPLES; s++) {
      const tNorm = s / (SCOPE_SAMPLES - 1);
      const idx = Math.min(vertCount - 1, Math.floor(tNorm * (vertCount - 1)));
      const yVal = clamp(scene.points[idx * 3 + 1] / normScale, -1, 1);
      const px = tNorm * waveW;
      const py = h * 0.5 - yVal * (h * 0.38);
      if (s === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    return { peak, rms };
  }
}
