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

    // Model selector strip
    const modelNav = createEl('div', 'segmented-row');
    modelNav.setAttribute('role', 'tablist');
    modelNav.setAttribute('aria-label', 'Mathematical models');

    let index = 1;
    for (const model of Object.values(MATH_MODELS)) {
      const btn = createEl('button', 'seg-pill', `${index}. ${model.name}`);
      btn.type = 'button';
      btn.dataset.modelId = model.id;
      btn.setAttribute('role', 'tab');
      btn.addEventListener('click', () => this.callbacks.onSelectModel(model.id));
      this.modelButtons.set(model.id, btn);
      modelNav.appendChild(btn);
      index += 1;
    }
    this.container.appendChild(modelNav);

    // Governing equations box
    const eqBox = createEl('div', 'equation-card');
    const eqHead = createEl('div', 'equation-card__head');
    eqHead.appendChild(createEl('span', 'mono-label', 'GOVERNING SYSTEM'));
    eqBox.appendChild(eqHead);
    this.eqListEl = createEl('div', 'equation-card__lines');
    eqBox.appendChild(this.eqListEl);
    this.container.appendChild(eqBox);

    // Live parameter sliders container
    const paramsSection = createEl('div', 'params-section');
    const paramsHead = createEl('div', 'params-section__head');
    paramsHead.appendChild(createEl('span', 'mono-label', 'PARAMETERS'));
    const resetParamsBtn = createEl('button', 'link-action', 'Reset Defaults');
    resetParamsBtn.type = 'button';
    resetParamsBtn.addEventListener('click', () => this.callbacks.onResetParams());
    paramsHead.appendChild(resetParamsBtn);
    paramsSection.appendChild(paramsHead);

    this.slidersRoot = createEl('div', 'sliders-grid');
    paramsSection.appendChild(this.slidersRoot);
    this.container.appendChild(paramsSection);

    // Theme + coordinate grid row
    const visualsRow = createEl('div', 'visuals-row');
    const themeGroup = createEl('div', 'theme-pills');
    for (const theme of Object.values(COLOR_THEMES)) {
      const btn = createEl('button', 'theme-pill', theme.label);
      btn.type = 'button';
      btn.dataset.themeId = theme.id;
      btn.addEventListener('click', () => this.callbacks.onSelectTheme(theme.id));
      this.themeButtons.set(theme.id, btn);
      themeGroup.appendChild(btn);
    }

    this.axesToggleBtn = createEl('button', 'btn btn--ghost btn--compact', 'Axes: ON');
    this.axesToggleBtn.type = 'button';
    this.axesToggleBtn.addEventListener('click', () => {
      this.callbacks.onToggleAxes(!this.state.showAxes);
    });

    visualsRow.append(themeGroup, this.axesToggleBtn);
    this.container.appendChild(visualsRow);

    // Live phase telemetry strip
    const telemetry = createEl('div', 'telemetry-strip');
    const rowCoords = createEl('div', 'telemetry-item');
    rowCoords.appendChild(createEl('span', 'telemetry-key', 'r(t)'));
    this.telemetryCoordsEl = createEl('span', 'telemetry-val', '(0.00, 0.00, 0.00)');
    rowCoords.appendChild(this.telemetryCoordsEl);

    const rowDeriv = createEl('div', 'telemetry-item');
    rowDeriv.appendChild(createEl('span', 'telemetry-key', 'dr/dt'));
    this.telemetryDerivEl = createEl('span', 'telemetry-val', '(0.00, 0.00, 0.00)');
    rowDeriv.appendChild(this.telemetryDerivEl);

    const rowSpeed = createEl('div', 'telemetry-item');
    rowSpeed.appendChild(createEl('span', 'telemetry-key', '||v||'));
    this.telemetrySpeedEl = createEl('span', 'telemetry-val', '0.000');
    rowSpeed.appendChild(this.telemetrySpeedEl);

    telemetry.append(rowCoords, rowDeriv, rowSpeed);
    this.container.appendChild(telemetry);
  }

  /**
   * Rebuilds equation lines and slider inputs when active mathematical model changes.
   * @param {string} modelId
   * @param {Record<string, number>} params
   */
  syncModelUI(modelId, params) {
    this.state.modelId = modelId;
    this.state.params = { ...params };

    const model = MATH_MODELS[modelId] || MATH_MODELS.lorenz;
    this.subtitleEl.textContent = model.subtitle;

    for (const [id, btn] of this.modelButtons.entries()) {
      const active = id === model.id;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', String(active));
    }

    this.eqListEl.textContent = '';
    for (const eq of model.equations) {
      this.eqListEl.appendChild(createEl('code', 'equation-line', eq));
    }

    this.slidersRoot.textContent = '';
    this.sliderControls.clear();

    for (const spec of model.params) {
      const currentVal = Number.isFinite(params[spec.key]) ? params[spec.key] : spec.default;
      const row = createEl('label', 'slider-row');

      const meta = createEl('div', 'slider-row__meta');
      meta.appendChild(createEl('span', 'slider-label', spec.label));
      const valDisplay = createEl('span', 'slider-value', formatParamValue(currentVal, spec.step));
      meta.appendChild(valDisplay);

      const input = document.createElement('input');
      input.type = 'range';
      input.className = 'slider-input';
      input.min = String(spec.min);
      input.max = String(spec.max);
      input.step = String(spec.step);
      input.value = String(currentVal);
      input.setAttribute('aria-label', spec.label);
      input.addEventListener('input', () => {
        const numeric = Number(input.value);
        valDisplay.textContent = formatParamValue(numeric, spec.step);
        this.callbacks.onParamChange(spec.key, numeric);
      });

      row.append(meta, input);
      this.slidersRoot.appendChild(row);
      this.sliderControls.set(spec.key, { input, valDisplay, step: spec.step });
    }
  }

  /**
   * Updates slider values in place (e.g. on Reset Defaults) without recreating DOM nodes.
   * @param {Record<string, number>} params
   */
  updateParamValues(params) {
    this.state.params = { ...params };
    for (const [key, ctrl] of this.sliderControls.entries()) {
      if (Number.isFinite(params[key])) {
        ctrl.input.value = String(params[key]);
        ctrl.valDisplay.textContent = formatParamValue(params[key], ctrl.step);
      }
    }
  }

  /**
   * Synchronizes Play/Pause, Theme, and Axes indicator states.
   * @param {{ themeId?: string, paused?: boolean, showAxes?: boolean }} partial
   */
  syncControlStates(partial) {
    Object.assign(this.state, partial);
    if (this.pauseBtn) {
      this.pauseBtn.textContent = this.state.paused ? 'Resume' : 'Pause';
      this.pauseBtn.setAttribute('aria-pressed', String(this.state.paused));
    }
    if (this.axesToggleBtn) {
      this.axesToggleBtn.textContent = this.state.showAxes ? 'Axes: ON' : 'Axes: OFF';
      this.axesToggleBtn.setAttribute('aria-pressed', String(this.state.showAxes));
    }
    for (const [id, btn] of this.themeButtons.entries()) {
      const active = id === this.state.themeId;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    }
  }

  /**
   * Updates throttled real-time 3D state and velocity telemetry readouts.
   * @param {{ stateSample: number[], derivativeSample: number[], speedMag: number }} telemetry
   */
  updateTelemetry(telemetry) {
    if (!telemetry) {
      return;
    }
    const [x, y, z] = telemetry.stateSample;
    const [dx, dy, dz] = telemetry.derivativeSample;
    this.telemetryCoordsEl.textContent = `(${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)})`;
    this.telemetryDerivEl.textContent = `(${dx.toFixed(1)}, ${dy.toFixed(1)}, ${dz.toFixed(1)})`;
    this.telemetrySpeedEl.textContent = telemetry.speedMag.toFixed(2);
  }
}

function formatParamValue(val, step) {
  if (step >= 1) {
    return String(Math.round(val));
  }
  if (step >= 0.1) {
    return val.toFixed(1);
  }
  return val.toFixed(2);
}
