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
});
