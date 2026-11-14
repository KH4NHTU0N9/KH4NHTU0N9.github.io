import { clamp, sampleMathScene } from './integrators.js';
import { buildAxisDescriptors, projectPoint3D } from './projection3d.js';

/**
 * Available oscilloscope color palettes tailored to dark observatory backgrounds.
 */
export const COLOR_THEMES = Object.freeze({
  quantum: Object.freeze({
    id: 'quantum',
    label: 'Quantum Cyan',
    bgCenter: '#0d1526',
    bgEdge: '#06080f',
    gridStroke: 'rgba(56, 189, 248, 0.14)',
    axisLabel: 'rgba(148, 163, 184, 0.78)',
    stops: [
      [56, 189, 248],
      [52, 211, 153],
      [129, 140, 248],
    ],
    headCore: '#f0f9ff',
    headHalo: 'rgba(56, 189, 248, 0.45)',
    pulseRing: 'rgba(52, 211, 153, ',
  }),
  plasma: Object.freeze({
    id: 'plasma',
    label: 'Solar Plasma',
    bgCenter: '#180f22',
    bgEdge: '#09060e',
    gridStroke: 'rgba(251, 146, 60, 0.15)',
    axisLabel: 'rgba(226, 200, 248, 0.78)',
    stops: [
      [168, 85, 247],
      [251, 113, 133],
      [251, 191, 36],
    ],
    headCore: '#fffbeb',
    headHalo: 'rgba(251, 191, 36, 0.48)',
    pulseRing: 'rgba(251, 113, 133, ',
  }),
  phosphor: Object.freeze({
    id: 'phosphor',
    label: 'CRT Phosphor',
    bgCenter: '#081910',
    bgEdge: '#040a06',
    gridStroke: 'rgba(34, 197, 94, 0.16)',
    axisLabel: 'rgba(134, 239, 172, 0.78)',
    stops: [
      [22, 163, 74],
      [52, 211, 153],
      [190, 242, 100],
    ],
    headCore: '#f0fdf4',
    headHalo: 'rgba(74, 222, 128, 0.48)',
    pulseRing: 'rgba(134, 239, 172, ',
  }),
});

const LUT_SIZE = 32;
const POINTER_DEFLECT_RADIUS_PX = 108;
const POINTER_DEFLECT_STRENGTH_PX = 16;
const PULSE_LIFETIME_SEC = 1.15;
const MAX_ACTIVE_PULSES = 6;

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
      core: buildColorLut(theme.stops, 0.92),
      halo: buildColorLut(theme.stops, 0.2),
    },
  ]),
);

/**
 * High-precision Canvas 2D renderer for 3D dynamical attractors and parametric surfaces.
 */
export class MathCanvasRenderer {
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.widthCss = 640;
    this.heightCss = 480;
    this.dpr = 1;

    this.themeId = 'quantum';
    this.showAxes = true;
    this.pointer = { x: 0, y: 0, active: false };
    this.pulses = [];
    this.axesDesc = buildAxisDescriptors(1.22);

    this.capacity = 0;
    this.projX = new Float32Array(0);
    this.projY = new Float32Array(0);
    this.projDepth = new Float32Array(0);
    this.projVis = new Uint8Array(0);

    this.lastTelemetry = {
      stateSample: [0, 0, 0],
      derivativeSample: [0, 0, 0],
      speedMag: 0,
      vertexCount: 0,
    };

    this.resize();
  }

  /**
   * Selects active oscilloscope color theme.
   * @param {string} themeId
   */
  setTheme(themeId) {
    if (Object.hasOwn(COLOR_THEMES, themeId)) {
      this.themeId = themeId;
    }
  }

  /**
   * Toggles 3D coordinate axes and polar reference rings.
   * @param {boolean} visible
   */
  setShowAxes(visible) {
    this.showAxes = Boolean(visible);
  }

  /**
   * Updates cursor coordinates for localized magnetic deflection.
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
   * Emits an expanding harmonic wave ring from a canvas click.
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
      maxRadius: Math.min(this.widthCss, this.heightCss) * 0.36,
    });
  }

  /**
   * Resizes backing store cleanly for Retina displays capped at 2x DPR.
   */
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(240, Math.floor(rect.width || this.canvas.clientWidth || 640));
    const h = Math.max(240, Math.floor(rect.height || this.canvas.clientHeight || 480));
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

  /**
   * Ensures typed projection scratch buffers match active vertex count.
   * @param {number} count
   */
  ensureCapacity(count) {
    if (count <= this.capacity) {
      return;
    }
    this.capacity = count;
    this.projX = new Float32Array(count);
    this.projY = new Float32Array(count);
    this.projDepth = new Float32Array(count);
    this.projVis = new Uint8Array(count);
  }

  /**
   * Samples the active mathematical model and draws a single frame.
   * @param {{ modelId: string, params: Record<string, number>, camera: object, timeSec: number }} frameState
   * @returns {{ stateSample: number[], derivativeSample: number[], speedMag: number, vertexCount: number }}
   */
  render({ modelId, params, camera, timeSec }) {
    const ctx = this.ctx;
    if (!ctx) {
      return this.lastTelemetry;
    }

    const theme = COLOR_THEMES[this.themeId] || COLOR_THEMES.quantum;
    const luts = THEME_LUTS.get(theme.id);
    const w = this.widthCss;
    const h = this.heightCss;

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.drawBackdrop(ctx, w, h, theme);

    if (this.showAxes) {
      this.drawCoordinateFrame(ctx, w, h, camera, theme);
    }

    const scene = sampleMathScene(modelId, params, timeSec);
    const vertexCount = scene.points.length / 3;
    this.ensureCapacity(vertexCount);
    this.projectVertices(scene.points, vertexCount, w, h, camera, timeSec);

    this.drawPolylines(ctx, scene, luts.halo, 3.3);
    this.drawPolylines(ctx, scene, luts.core, 1.38);
    this.drawTracerHeads(ctx, scene.headIndices, theme);
    this.drawWavePulses(ctx, timeSec, theme);

    const [dx, dy, dz] = scene.derivativeSample;
    this.lastTelemetry = {
      stateSample: scene.stateSample,
      derivativeSample: scene.derivativeSample,
      speedMag: Math.hypot(dx, dy, dz),
      vertexCount,
    };
    return this.lastTelemetry;
  }

  drawBackdrop(ctx, w, h, theme) {
    const grad = ctx.createRadialGradient(w * 0.5, h * 0.48, 24, w * 0.5, h * 0.5, Math.max(w, h) * 0.72);
    grad.addColorStop(0, theme.bgCenter);
    grad.addColorStop(1, theme.bgEdge);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  drawCoordinateFrame(ctx, w, h, camera, theme) {
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = theme.gridStroke;

    for (const ring of this.axesDesc.rings) {
      ctx.beginPath();
      let started = false;
      for (const [rx, ry, rz] of ring) {
        const p = projectPoint3D(rx, ry, rz, w, h, camera);
        if (!p.visible) {
          started = false;
          continue;
        }
        if (!started) {
          ctx.moveTo(p.sx, p.sy);
          started = true;
        } else {
          ctx.lineTo(p.sx, p.sy);
        }
      }
      ctx.stroke();
    }

    ctx.font = '600 11px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const axis of this.axesDesc.axes) {
      const pa = projectPoint3D(axis.a[0], axis.a[1], axis.a[2], w, h, camera);
      const pb = projectPoint3D(axis.b[0], axis.b[1], axis.b[2], w, h, camera);
      if (!pa.visible || !pb.visible) {
        continue;
      }
      ctx.strokeStyle = axis.color;
      ctx.beginPath();
      ctx.moveTo(pa.sx, pa.sy);
      ctx.lineTo(pb.sx, pb.sy);
      ctx.stroke();

      ctx.fillStyle = theme.axisLabel;
      ctx.fillText(axis.label, pb.sx + 9, pb.sy - 6);
    }
    ctx.restore();
  }

  projectVertices(points, vertexCount, w, h, camera, timeSec) {
    const pActive = this.pointer.active;
    const px = this.pointer.x;
    const py = this.pointer.y;
    const deflectSq = POINTER_DEFLECT_RADIUS_PX * POINTER_DEFLECT_RADIUS_PX;

    const activePulses = this.pulses.filter((pulse) => timeSec - pulse.birthSec < PULSE_LIFETIME_SEC);
    this.pulses = activePulses;

    for (let i = 0; i < vertexCount; i++) {
      const base = i * 3;
      const p = projectPoint3D(points[base], points[base + 1], points[base + 2], w, h, camera);
      if (!p.visible) {
        this.projVis[i] = 0;
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
        if (dist > 1 && band < 28) {
          const amp = (1 - band / 28) * (1 - ageNorm) * 7.5;
          sx += (dx / dist) * amp;
          sy += (dy / dist) * amp;
        }
      }

      this.projX[i] = sx;
      this.projY[i] = sy;
      this.projDepth[i] = p.depthNorm;
      this.projVis[i] = 1;
    }
  }

  drawPolylines(ctx, scene, paletteLut, lineWidth) {
    ctx.save();
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const lastIdx = LUT_SIZE - 1;
    const { speeds, polylines } = scene;

    for (const poly of polylines) {
      const end = poly.start + poly.count;
      let activeBucket = -1;
      let pathOpen = false;

      for (let i = poly.start; i < end - 1; i++) {
        if (!this.projVis[i] || !this.projVis[i + 1]) {
          if (pathOpen) {
            ctx.stroke();
            pathOpen = false;
            activeBucket = -1;
          }
          continue;
        }

        const colorMix = clamp(speeds[i] * 0.72 + this.projDepth[i] * 0.28, 0, 1);
        const bucket = Math.min(lastIdx, Math.floor(colorMix * LUT_SIZE));

        if (!pathOpen || bucket !== activeBucket) {
          if (pathOpen) {
            ctx.stroke();
          }
          ctx.strokeStyle = paletteLut[bucket];
          ctx.beginPath();
          ctx.moveTo(this.projX[i], this.projY[i]);
          activeBucket = bucket;
          pathOpen = true;
        }
        ctx.lineTo(this.projX[i + 1], this.projY[i + 1]);
      }

      if (poly.closed && poly.count > 2) {
        const first = poly.start;
        const last = end - 1;
        if (this.projVis[last] && this.projVis[first]) {
          if (!pathOpen) {
            const bucket = Math.min(lastIdx, Math.floor(clamp(speeds[last], 0, 1) * LUT_SIZE));
            ctx.strokeStyle = paletteLut[bucket];
            ctx.beginPath();
            ctx.moveTo(this.projX[last], this.projY[last]);
            pathOpen = true;
          }
          ctx.lineTo(this.projX[first], this.projY[first]);
        }
      }

      if (pathOpen) {
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}
