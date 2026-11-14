import { clamp, sampleMathArtScene } from './mathArt.js';
import { projectPoint3D } from './projection3d.js';

/**
 * Radiant multi-stop spectral themes designed for luminous dark-mode portfolios.
 */
export const COLOR_THEMES = Object.freeze({
  aurora: Object.freeze({
    id: 'aurora',
    label: 'Aurora Prism',
    bgCenter: '#0f1730',
    bgEdge: '#04060f',
    glowPrimary: 'rgba(56, 189, 248, 0.16)',
    glowSecondary: 'rgba(244, 114, 182, 0.14)',
    stops: [
      [34, 211, 238],
      [168, 85, 247],
      [244, 114, 182],
      [52, 211, 153],
    ],
    headCore: '#ffffff',
    headHalo: 'rgba(244, 114, 182, 0.42)',
    pulseRing: 'rgba(56, 239, 212, ',
  }),
  cyber: Object.freeze({
    id: 'cyber',
    label: 'Cyber Neon',
    bgCenter: '#091529',
    bgEdge: '#03050c',
    glowPrimary: 'rgba(0, 245, 212, 0.16)',
    glowSecondary: 'rgba(255, 46, 147, 0.14)',
    stops: [
      [0, 245, 212],
      [59, 130, 246],
      [255, 46, 147],
      [250, 204, 21],
    ],
    headCore: '#f8fafc',
    headHalo: 'rgba(0, 245, 212, 0.44)',
    pulseRing: 'rgba(255, 46, 147, ',
  }),
  solar: Object.freeze({
    id: 'solar',
    label: 'Solar Flare',
    bgCenter: '#1f1024',
    bgEdge: '#07040d',
    glowPrimary: 'rgba(251, 191, 36, 0.16)',
    glowSecondary: 'rgba(192, 132, 252, 0.14)',
    stops: [
      [251, 191, 36],
      [251, 113, 133],
      [192, 132, 252],
      [56, 189, 248],
    ],
    headCore: '#fffbeb',
    headHalo: 'rgba(251, 191, 36, 0.46)',
    pulseRing: 'rgba(251, 191, 36, ',
  }),
});

const LUT_SIZE = 32;
const POINTER_DEFLECT_RADIUS_PX = 128;
const POINTER_DEFLECT_STRENGTH_PX = 18;
const PULSE_LIFETIME_SEC = 1.25;
const MAX_ACTIVE_PULSES = 6;
const AMBIENT_SPARK_COUNT = 54;

function buildColorLut(stops, alpha) {
  const lut = new Array(LUT_SIZE);
  const segCount = stops.length - 1;
  for (let i = 0; i < LUT_SIZE; i++) {
    const t = i / (LUT_SIZE - 1);
    const scaled = t * segCount;
    const idx = Math.min(segCount - 1, Math.floor(scaled));
    const localT = scaled - idx;
    const c0 = stops[idx];
    const c1 = stops[idx + 1];
    const r = Math.round(c0[0] + (c1[0] - c0[0]) * localT);
    const g = Math.round(c0[1] + (c1[1] - c0[1]) * localT);
    const b = Math.round(c0[2] + (c1[2] - c0[2]) * localT);
    lut[i] = `rgba(${r},${g},${b},${alpha})`;
  }
  return lut;
}

const THEME_LUTS = new Map(
  Object.values(COLOR_THEMES).map((theme) => [
    theme.id,
    {
      core: buildColorLut(theme.stops, 0.94),
      halo: buildColorLut(theme.stops, 0.22),
      chord: buildColorLut(theme.stops, 0.34),
      node: buildColorLut(theme.stops, 0.92),
    },
  ]),
);

function buildAmbientSparks() {
  const sparks = new Array(AMBIENT_SPARK_COUNT);
  for (let i = 0; i < AMBIENT_SPARK_COUNT; i++) {
    // Deterministic pseudo-random stars (Halton-like spread)
    const u = ((i * 73 + 19) % 997) / 997;
    const v = ((i * 151 + 43) % 991) / 991;
    sparks[i] = {
      nx: u,
      ny: v,
      phase: i * 0.67,
      radius: 0.9 + (i % 3) * 0.55,
      bucket: i % LUT_SIZE,
    };
  }
  return sparks;
}

/**
 * Retina Canvas 2D renderer for creative, vibrant generative mathematics visuals.
 */
export class MathCanvasRenderer {
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.widthCss = 960;
    this.heightCss = 540;
    this.dpr = 1;

    this.themeId = 'aurora';
    this.zen = false;
    this.pointer = { x: 0, y: 0, active: false };
    this.pulses = [];
    this.sparks = buildAmbientSparks();

    this.nodeCap = 0;
    this.nodeX = new Float32Array(0);
    this.nodeY = new Float32Array(0);
    this.nodeDepth = new Float32Array(0);
    this.nodeVis = new Uint8Array(0);

    this.ribCap = 0;
    this.ribX = new Float32Array(0);
    this.ribY = new Float32Array(0);
    this.ribDepth = new Float32Array(0);
    this.ribVis = new Uint8Array(0);

    this.resize();
  }

  /**
   * Selects active spectral color aura palette.
   * @param {string} themeId
   */
  setTheme(themeId) {
    if (Object.hasOwn(COLOR_THEMES, themeId)) {
      this.themeId = themeId;
    }
  }

  /**
   * Adjusts hero right-bias vs centered Zen composition.
   * @param {boolean} zen
   */
  setZenMode(zen) {
    this.zen = Boolean(zen);
  }

  /**
   * Updates cursor position for localized harmonic field perturbation.
   * @param {number} xPx
   * @param {number} yPx
   * @param {boolean} active
   */
  setPointerPosition(xPx, yPx, active) {
    this.pointer.x = xPx;
    this.pointer.y = yPx;
    this.pointer.active = Boolean(active);
  }

  /**
   * Emits an expanding harmonic wave ring from pointer interaction.
   * @param {number} xPx
   * @param {number} yPx
   * @param {number} timeSec
   */
  triggerWavePulse(xPx, yPx, timeSec) {
    if (this.pulses.length >= MAX_ACTIVE_PULSES) {
      this.pulses.shift();
    }
    this.pulses.push({
      x: xPx,
      y: yPx,
      birthSec: timeSec,
      maxRadius: Math.min(this.widthCss, this.heightCss) * 0.42,
    });
  }

  /**
   * Resizes Canvas backing store crisply up to 2x Retina DPR.
   */
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(240, Math.floor(rect.width || this.canvas.clientWidth || 960));
    const h = Math.max(240, Math.floor(rect.height || this.canvas.clientHeight || 540));
    const rawDpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const dpr = clamp(rawDpr, 1, 2);

    if (w === this.widthCss && h === this.heightCss && dpr === this.dpr) {
      return;
    }
    this.widthCss = w;
    this.heightCss = h;
    this.dpr = dpr;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
  }

  ensureNodeCap(count) {
    if (count <= this.nodeCap) {
      return;
    }
    this.nodeCap = count;
    this.nodeX = new Float32Array(count);
    this.nodeY = new Float32Array(count);
    this.nodeDepth = new Float32Array(count);
    this.nodeVis = new Uint8Array(count);
  }

  ensureRibCap(count) {
    if (count <= this.ribCap) {
      return;
    }
    this.ribCap = count;
    this.ribX = new Float32Array(count);
    this.ribY = new Float32Array(count);
    this.ribDepth = new Float32Array(count);
    this.ribVis = new Uint8Array(count);
  }

  /**
   * Samples the generative math art scene and renders one crisp frame.
   * @param {{ presetId: string, camera: object, timeSec: number }} frameState
   */
  render({ presetId, camera, timeSec }) {
    const ctx = this.ctx;
    if (!ctx) {
      return;
    }

    const theme = COLOR_THEMES[this.themeId] || COLOR_THEMES.aurora;
    const luts = THEME_LUTS.get(theme.id);
    const w = this.widthCss;
    const h = this.heightCss;

    // Position 3D sculpture on right showcase zone on wide desktop hero, centered on mobile/Zen
    const wideDesktop = w >= 880 && !this.zen;
    const centerXRatio = wideDesktop ? 0.73 : 0.5;
    const centerYRatio = wideDesktop ? 0.49 : this.zen ? 0.5 : 0.47;

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.drawBackdrop(ctx, w, h, centerXRatio, centerYRatio, theme);
    this.drawAmbientSparks(ctx, w, h, timeSec, luts.node);

    const activePulses = this.pulses.filter((p) => timeSec - p.birthSec < PULSE_LIFETIME_SEC);
    this.pulses = activePulses;

    const scene = sampleMathArtScene(presetId, timeSec);
    const nodeCount = scene.nodeCoords.length / 3;
    const ribVertCount = scene.ribbonPoints.length / 3;

    this.ensureNodeCap(nodeCount);
    this.ensureRibCap(ribVertCount);

    this.projectArray(
      scene.nodeCoords,
      nodeCount,
      w,
      h,
      camera,
      centerXRatio,
      centerYRatio,
      activePulses,
      timeSec,
      this.nodeX,
      this.nodeY,
      this.nodeDepth,
      this.nodeVis,
    );

    this.projectArray(
      scene.ribbonPoints,
      ribVertCount,
      w,
      h,
      camera,
      centerXRatio,
      centerYRatio,
      activePulses,
      timeSec,
      this.ribX,
      this.ribY,
      this.ribDepth,
      this.ribVis,
    );

    this.drawChords(ctx, scene.chords, luts.chord);
    this.drawRibbons(ctx, scene, luts.halo, 3.6);
    this.drawRibbons(ctx, scene, luts.core, 1.45);
    this.drawNodes(ctx, scene, nodeCount, luts.node);
    this.drawTracers(ctx, scene.tracerIndices, theme);
    this.drawWavePulses(ctx, timeSec, theme);
  }

  drawBackdrop(ctx, w, h, cxRatio, cyRatio, theme) {
    const cx = w * cxRatio;
    const cy = h * cyRatio;

    const baseGrad = ctx.createRadialGradient(cx, cy, 24, w * 0.5, h * 0.5, Math.max(w, h) * 0.85);
    baseGrad.addColorStop(0, theme.bgCenter);
    baseGrad.addColorStop(1, theme.bgEdge);
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, w, h);

    // Dual spectral nebula wash for radiant depth without washed-out glare
    const glowRadius = Math.min(w, h) * 0.62;
    const aura1 = ctx.createRadialGradient(cx - 40, cy - 30, 10, cx - 40, cy - 30, glowRadius);
    aura1.addColorStop(0, theme.glowPrimary);
    aura1.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = aura1;
    ctx.fillRect(0, 0, w, h);

    const aura2 = ctx.createRadialGradient(cx + 70, cy + 45, 10, cx + 70, cy + 45, glowRadius * 0.9);
    aura2.addColorStop(0, theme.glowSecondary);
    aura2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = aura2;
    ctx.fillRect(0, 0, w, h);
  }

  drawAmbientSparks(ctx, w, h, timeSec, paletteLut) {
    ctx.save();
    for (const s of this.sparks) {
      const twinkle = 0.25 + 0.65 * (0.5 + 0.5 * Math.sin(timeSec * 1.4 + s.phase));
      ctx.globalAlpha = twinkle * 0.55;
      ctx.fillStyle = paletteLut[s.bucket];
      ctx.beginPath();
      ctx.arc(s.nx * w, s.ny * h, s.radius, 0, TAU_CONST);
      ctx.fill();
    }
    ctx.restore();
  }

  projectArray(
    coords,
    count,
    w,
    h,
    camera,
    cxRatio,
    cyRatio,
    activePulses,
    timeSec,
    outX,
    outY,
    outDepth,
    outVis,
  ) {
    const pActive = this.pointer.active;
    const px = this.pointer.x;
    const py = this.pointer.y;
    const deflectSq = POINTER_DEFLECT_RADIUS_PX * POINTER_DEFLECT_RADIUS_PX;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const p = projectPoint3D(
        coords[i3],
        coords[i3 + 1],
        coords[i3 + 2],
        w,
        h,
        camera,
        cxRatio,
        cyRatio,
      );
      if (!p.visible) {
        outVis[i] = 0;
        continue;
      }

      let sx = p.sx;
      let sy = p.sy;

      if (pActive) {
        const dx = sx - px;
        const dy = sy - py;
        const d2 = dx * dx + dy * dy;
        if (d2 > 0.5 && d2 < deflectSq) {
          const dist = Math.sqrt(d2);
          const falloff = 1 - dist / POINTER_DEFLECT_RADIUS_PX;
          const push = falloff * falloff * POINTER_DEFLECT_STRENGTH_PX;
          sx += (dx / dist) * push;
          sy += (dy / dist) * push;
        }
      }

      for (const pulse of activePulses) {
        const ageNorm = (timeSec - pulse.birthSec) / PULSE_LIFETIME_SEC;
        const waveRadius = ageNorm * pulse.maxRadius;
        const dx = sx - pulse.x;
        const dy = sy - pulse.y;
        const dist = Math.hypot(dx, dy);
        const band = Math.abs(dist - waveRadius);
        if (dist > 1 && band < 32) {
          const amp = (1 - band / 32) * (1 - ageNorm) * 8.5;
          sx += (dx / dist) * amp;
          sy += (dy / dist) * amp;
        }
      }

      outX[i] = sx;
      outY[i] = sy;
      outDepth[i] = p.depthNorm;
      outVis[i] = 1;
    }
  }

  drawChords(ctx, chords, chordLut) {
    if (!chords || chords.length === 0) {
      return;
    }
    ctx.save();
    ctx.lineWidth = 1.05;
    const lastIdx = LUT_SIZE - 1;

    for (const chord of chords) {
      if (!this.nodeVis[chord.a] || !this.nodeVis[chord.b]) {
        continue;
      }
      const depthAlpha = clamp(chord.strength * 0.55 + this.nodeDepth[chord.a] * 0.45, 0.15, 0.95);
      const bucket = Math.min(lastIdx, Math.floor(clamp(chord.hue, 0, 1) * LUT_SIZE));
      ctx.globalAlpha = depthAlpha;
      ctx.strokeStyle = chordLut[bucket];
      ctx.beginPath();
      ctx.moveTo(this.nodeX[chord.a], this.nodeY[chord.a]);
      ctx.lineTo(this.nodeX[chord.b], this.nodeY[chord.b]);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawRibbons(ctx, scene, paletteLut, lineWidth) {
    ctx.save();
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const lastIdx = LUT_SIZE - 1;
    const { ribbonHues, ribbons } = scene;

    for (const poly of ribbons) {
      const end = poly.start + poly.count;
      let activeBucket = -1;
      let pathOpen = false;

      for (let i = poly.start; i < end - 1; i++) {
        if (!this.ribVis[i] || !this.ribVis[i + 1]) {
          if (pathOpen) {
            ctx.stroke();
            pathOpen = false;
            activeBucket = -1;
          }
          continue;
        }
        const mix = clamp(ribbonHues[i] * 0.72 + this.ribDepth[i] * 0.28, 0, 1);
        const bucket = Math.min(lastIdx, Math.floor(mix * LUT_SIZE));

        if (!pathOpen || bucket !== activeBucket) {
          if (pathOpen) {
            ctx.stroke();
          }
          ctx.strokeStyle = paletteLut[bucket];
          ctx.beginPath();
          ctx.moveTo(this.ribX[i], this.ribY[i]);
          activeBucket = bucket;
          pathOpen = true;
        }
        ctx.lineTo(this.ribX[i + 1], this.ribY[i + 1]);
      }

      if (poly.closed && poly.count > 2) {
        const first = poly.start;
        const last = end - 1;
        if (this.ribVis[last] && this.ribVis[first]) {
          if (!pathOpen) {
            const bucket = Math.min(lastIdx, Math.floor(clamp(ribbonHues[last], 0, 1) * LUT_SIZE));
            ctx.strokeStyle = paletteLut[bucket];
            ctx.beginPath();
            ctx.moveTo(this.ribX[last], this.ribY[last]);
            pathOpen = true;
          }
          ctx.lineTo(this.ribX[first], this.ribY[first]);
        }
      }

      if (pathOpen) {
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  drawNodes(ctx, scene, nodeCount, nodeLut) {
    ctx.save();
    const lastIdx = LUT_SIZE - 1;
    for (let i = 0; i < nodeCount; i++) {
      if (!this.nodeVis[i]) {
        continue;
      }
      const depth = this.nodeDepth[i];
      const r = scene.nodeSizes[i] * (0.62 + depth * 0.55);
      const bucket = Math.min(lastIdx, Math.floor(clamp(scene.nodeHues[i], 0, 1) * LUT_SIZE));
      ctx.globalAlpha = 0.4 + depth * 0.58;
      ctx.fillStyle = nodeLut[bucket];
      ctx.beginPath();
      ctx.arc(this.nodeX[i], this.nodeY[i], r, 0, TAU_CONST);
      ctx.fill();
    }
    ctx.restore();
  }

  drawTracers(ctx, tracerIndices, theme) {
    if (!tracerIndices || tracerIndices.length === 0) {
      return;
    }
    ctx.save();
    for (const idx of tracerIndices) {
      if (idx < 0 || idx >= this.ribVis.length || !this.ribVis[idx]) {
        continue;
      }
      const x = this.ribX[idx];
      const y = this.ribY[idx];

      ctx.fillStyle = theme.headHalo;
      ctx.beginPath();
      ctx.arc(x, y, 8.2, 0, TAU_CONST);
      ctx.fill();

      ctx.fillStyle = theme.headCore;
      ctx.beginPath();
      ctx.arc(x, y, 2.8, 0, TAU_CONST);
      ctx.fill();
    }
    ctx.restore();
  }

  drawWavePulses(ctx, timeSec, theme) {
    if (this.pulses.length === 0) {
      return;
    }
    ctx.save();
    ctx.lineWidth = 1.5;
    for (const pulse of this.pulses) {
      const ageNorm = clamp((timeSec - pulse.birthSec) / PULSE_LIFETIME_SEC, 0, 1);
      const radius = Math.max(4, ageNorm * pulse.maxRadius);
      const alpha = (1 - ageNorm) * 0.62;
      ctx.strokeStyle = `${theme.pulseRing}${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(pulse.x, pulse.y, radius, 0, TAU_CONST);
      ctx.stroke();
    }
    ctx.restore();
  }
}

const TAU_CONST = Math.PI * 2;
