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
