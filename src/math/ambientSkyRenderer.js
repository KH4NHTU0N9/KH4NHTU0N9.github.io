import { clamp } from './mathArt.js?v=gcs24';
import { GLYPH_MODES, createSkyField } from './asciiScene.js?v=gcs24';

const BACKDROP_HEX = '#020308';

/**
 * Full-viewport low-overhead ambient ASCII/Math/Binary cosmos backdrop.
 * Runs cleanly behind scrollable cockpit & portfolio sections so the entire page
 * lives inside one continuous twilight matrix without extra animation timers.
 */
export class AmbientSkyRenderer {
  constructor(canvas, seed = 4096) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.sky = createSkyField(seed);
    this.widthCss = 0;
    this.heightCss = 0;
    this.dpr = 0;
    this.glyphMode = 'math';
    this.resize();
  }

  setGlyphMode(modeId) {
    if (Object.prototype.hasOwnProperty.call(GLYPH_MODES, modeId)) {
      this.glyphMode = modeId;
    }
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    const rawDpr =
      typeof globalThis !== 'undefined' && typeof globalThis.devicePixelRatio === 'number'
        ? globalThis.devicePixelRatio
        : 1;
    const dpr = Math.min(rawDpr || 1, 1.5);

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
  }

  render(timeSec = 0) {
    if (this.widthCss === 0 || this.heightCss === 0 || this.canvas.width === 0 || this.canvas.height === 0) {
      this.resize();
    }
    const ctx = this.ctx;
    if (!ctx) return;

    const w = this.widthCss;
    const h = this.heightCss;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = BACKDROP_HEX;
    ctx.fillRect(0, 0, w, h);

    ctx.font = "600 10px 'JetBrains Mono', ui-monospace, monospace";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const mode = this.glyphMode;
    const { stars, motes } = this.sky;

    // Distant twilight stars
    for (let i = 0; i < stars.length; i += 2) {
      const s = stars[i];
      const twinkle = 0.35 + 0.65 * Math.sin(timeSec * s.speed * 0.7 + s.phase);
      const alpha = clamp(s.bright * twinkle * 0.34, 0.05, 0.38);
      const ch = mode === 'binary' ? (i % 4 === 0 ? '1' : '0') : mode === 'ascii' && s.glyph === '·' ? '.' : s.glyph;
      ctx.fillStyle = `rgba(148, 188, 240, ${alpha.toFixed(2)})`;
      ctx.fillText(ch, s.u * w, s.v * h);
    }

    // Drifting ambient math/ascii motes across full page
    for (let i = 0; i < motes.length; i += 2) {
      const m = motes[i];
      const vWrapped = ((m.v0 - timeSec * m.vy * 0.55) % 1 + 1) % 1;
      const uWrapped =
        ((m.u0 + timeSec * m.vx * 0.55 + Math.sin(timeSec * 0.9 + m.phase) * m.swayAmp) % 1 + 1) % 1;
      const ch =
        mode === 'binary'
          ? i % 4 === 0
            ? '1'
            : '0'
          : mode === 'ascii' && (m.glyph === 'π' || m.glyph === '∞' || m.glyph === '×' || m.glyph === '·')
            ? '*'
            : m.glyph;
      const alpha = clamp(m.bright * 0.28, 0.08, 0.3);
      ctx.fillStyle = i % 4 === 0 ? `rgba(125, 211, 252, ${alpha.toFixed(2)})` : `rgba(255, 130, 72, ${(alpha * 0.85).toFixed(2)})`;
      ctx.fillText(ch, uWrapped * w, vWrapped * h);
    }
  }
}
