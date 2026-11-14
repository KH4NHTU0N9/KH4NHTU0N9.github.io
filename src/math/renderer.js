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
}
