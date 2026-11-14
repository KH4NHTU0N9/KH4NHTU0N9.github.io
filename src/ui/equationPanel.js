import { MATH_MODELS } from '../math/integrators.js';
import { COLOR_THEMES } from '../math/renderer.js';

function createEl(tag, className, text) {
  const el = document.createElement(tag);
  if (className) {
    el.className = className;
  }
  if (text !== undefined && text !== null) {
    el.textContent = text;
  }
  return el;
}

/**
 * Interactive mathematical control dock:
 * switches chaotic attractors / 3D surfaces, exposes parameter sliders,
 * renders live differential equations, and updates real-time phase telemetry.
 */
export class EquationPanel {
  /**
   * @param {HTMLElement} container
   * @param {{
   *   initialState: { modelId: string, params: Record<string, number>, themeId: string, paused: boolean, showAxes: boolean },
   *   onSelectModel: (modelId: string) => void,
   *   onParamChange: (key: string, value: number) => void,
   *   onResetParams: () => void,
   *   onSelectTheme: (themeId: string) => void,
   *   onToggleAxes: (show: boolean) => void,
   *   onTogglePause: () => void,
   *   onResetCamera: () => void,
   *   onToggleZen: () => void,
   * }} options
   */
  constructor(container, options) {
    this.container = container;
    this.callbacks = options;
    this.state = { ...options.initialState };

    this.modelButtons = new Map();
    this.themeButtons = new Map();
    this.pauseBtn = null;
    this.axesToggleBtn = null;
    this.subtitleEl = null;
    this.eqListEl = null;
    this.slidersRoot = null;
    this.sliderControls = new Map();
    this.telemetryCoordsEl = null;
    this.telemetrySpeedEl = null;
    this.telemetryDerivEl = null;

    this.buildShell();
    this.syncModelUI(this.state.modelId, this.state.params);
    this.syncControlStates(this.state);
  }

  buildShell() {
    this.container.textContent = '';

    const header = createEl('div', 'eq-panel__header');
    const titleGroup = createEl('div', 'eq-panel__title-group');
    titleGroup.appendChild(createEl('span', 'eyebrow-tag', '00 // MATH LABORATORY'));
    this.subtitleEl = createEl('p', 'eq-panel__subtitle', '');
    titleGroup.appendChild(this.subtitleEl);
    header.appendChild(titleGroup);

    const actions = createEl('div', 'eq-panel__quick-actions');
    this.pauseBtn = createEl('button', 'btn btn--ghost', 'Pause');
    this.pauseBtn.type = 'button';
    this.pauseBtn.title = 'Play / Pause (Space)';
    this.pauseBtn.addEventListener('click', () => this.callbacks.onTogglePause());

    const resetCamBtn = createEl('button', 'btn btn--ghost', 'Reset View');
    resetCamBtn.type = 'button';
    resetCamBtn.title = 'Reset camera & time (R)';
    resetCamBtn.addEventListener('click', () => this.callbacks.onResetCamera());

    const zenBtn = createEl('button', 'btn btn--accent', 'Zen');
    zenBtn.type = 'button';
    zenBtn.title = 'Fullscreen math canvas (H)';
    zenBtn.addEventListener('click', () => this.callbacks.onToggleZen());

    actions.append(this.pauseBtn, resetCamBtn, zenBtn);
    header.appendChild(actions);
    this.container.appendChild(header);

  }
}
