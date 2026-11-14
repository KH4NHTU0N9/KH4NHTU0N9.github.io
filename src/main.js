import { ART_PRESETS, DEFAULT_ART_PARAMS, clamp } from './math/mathArt.js';
import { createCameraState } from './math/projection3d.js';
import { MathCanvasRenderer } from './math/renderer.js';
import { OscilloscopeRenderer } from './math/scopeRenderer.js';
import { PROFILE_DATA, fetchPublicReposWithFallback } from './data/profile.js';
import { ProfileView } from './ui/profileView.js';

const PRESET_ORDER = Object.keys(ART_PRESETS);

function formatWrappedDeg(rad) {
  let deg = (rad * 180) / Math.PI;
  deg = ((((deg + 180) % 360) + 360) % 360) - 180;
  const sign = deg >= 0 ? '+' : '-';
  return `${sign}${Math.abs(deg).toFixed(1).padStart(5, '0')}°`;
}

function buildHeaderControls(navRoot, initialState, callbacks) {
  navRoot.textContent = '';

  const presetBtns = new Map();
  for (const preset of Object.values(ART_PRESETS)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nav-cell';
    btn.dataset.presetId = preset.id;
    btn.textContent = `${preset.code} ${preset.label.toUpperCase()}`;
    btn.addEventListener('click', () => callbacks.onSelectPreset(preset.id));
    presetBtns.set(preset.id, btn);
    navRoot.appendChild(btn);
  }

  const pauseBtn = document.createElement('button');
  pauseBtn.type = 'button';
  pauseBtn.className = 'nav-cell';
  pauseBtn.title = 'Toggle animation (Space)';
  pauseBtn.addEventListener('click', () => callbacks.onTogglePause());
  navRoot.appendChild(pauseBtn);

  const resetBtn = document.createElement('button');
  resetBtn.type = 'button';
  resetBtn.className = 'nav-cell';
  resetBtn.textContent = 'RESET';
  resetBtn.title = 'Reset camera & sliders (R)';
  resetBtn.addEventListener('click', () => callbacks.onResetAll());
  navRoot.appendChild(resetBtn);

  const soloBtn = document.createElement('button');
  soloBtn.type = 'button';
  soloBtn.className = 'nav-cell nav-cell--accent';
  soloBtn.textContent = 'SOLO [H]';
  soloBtn.title = 'Fullscreen geometric viewport (H)';
  soloBtn.addEventListener('click', () => callbacks.onToggleZen());
  navRoot.appendChild(soloBtn);

  const sync = ({ presetId, paused }) => {
    for (const [id, btn] of presetBtns.entries()) {
      const active = id === presetId;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    }
    pauseBtn.textContent = paused ? 'PLAY' : 'PAUSE';
    pauseBtn.setAttribute('aria-pressed', String(paused));
  };

  sync(initialState);
  return { sync };
}

function initApp() {
  const appShell = document.getElementById('app-shell');
  const canvas = document.getElementById('math-canvas');
  const canvasStage = document.getElementById('canvas-stage');
  const navRoot = document.getElementById('nav-controls');
  const telemetryRoot = document.getElementById('top-telemetry');
  const viewportBadgeEl = document.getElementById('viewport-badge');
  const viewportEqEl = document.getElementById('viewport-eq');
  const viewportAttitudeEl = document.getElementById('viewport-attitude');
  const consoleRoot = document.getElementById('hero-content');
  const sectionsRoot = document.getElementById('profile-sections');
  const footerRoot = document.getElementById('site-footer');
  const zenExitBtn = document.getElementById('zen-exit-btn');

  if (!appShell || !canvas || !canvasStage || !navRoot || !consoleRoot || !sectionsRoot || !footerRoot) {
    return;
  }

  const reducedMotionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const state = {
    presetId: 'wave',
    paused: Boolean(reducedMotionQuery?.matches),
    zen: false,
    camera: createCameraState(),
    params: { ...DEFAULT_ART_PARAMS, speed: 1.0 },
    simTimeSec: 0,
  };

  const renderer = new MathCanvasRenderer(canvas);
  const profileView = new ProfileView(
    { consoleRoot, sectionsRoot, footerRoot },
    PROFILE_DATA,
    {
      onParamChange: (key, val) => {
        if (key === 'zoom') {
          state.camera.zoom = clamp(val, 0.65, 1.65);
        } else {
          state.params[key] = val;
        }
        renderFrameNow(true);
      },
    },
  );
  const scopeCanvas = profileView.getScopeCanvas();
  const scopeRenderer = scopeCanvas ? new OscilloscopeRenderer(scopeCanvas) : null;

  const nav = buildHeaderControls(navRoot, state, {
    onSelectPreset: (presetId) => switchPreset(presetId),
    onTogglePause: () => togglePause(),
    onResetAll: () => resetAll(),
    onToggleZen: () => setZenMode(!state.zen),
  });

  let lastHudSyncMs = 0;
  let lastScopeStats = { peak: 0, rms: 0 };

  function syncTelemetry(force = false) {
    const now = performance.now();
    if (!force && now - lastHudSyncMs < 90) {
      return;
    }
    lastHudSyncMs = now;

    const preset = ART_PRESETS[state.presetId] || ART_PRESETS.wave;
    const yawText = formatWrappedDeg(state.camera.yawRad);
    const pitchText = formatWrappedDeg(state.camera.pitchRad);
    const zoomText = `${state.camera.zoom.toFixed(2)}×`;
    const phaseText = state.simTimeSec.toFixed(1).padStart(5, '0');

    if (telemetryRoot) {
      telemetryRoot.textContent = `AZ ${yawText} · EL ${pitchText} · ZM ${zoomText} · T ${phaseText}s`;
    }
    if (viewportBadgeEl) {
      viewportBadgeEl.textContent = `${preset.code} · ${preset.label.toUpperCase()} · ${preset.topology}`;
    }
    if (viewportEqEl) {
      viewportEqEl.textContent = preset.equation;
    }
    if (viewportAttitudeEl) {
      viewportAttitudeEl.textContent = `AZ ${yawText} · EL ${pitchText} · ZM ${zoomText}`;
    }
    profileView.updateScopeReadout(lastScopeStats);
  }

  function renderFrameNow(forceTelemetry = false) {
    const scene = renderer.render({
      presetId: state.presetId,
      camera: state.camera,
      timeSec: state.simTimeSec,
      params: state.params,
    });
    if (scene && scopeRenderer && !state.zen) {
      lastScopeStats = scopeRenderer.render(scene);
    }
    syncTelemetry(forceTelemetry);
  }

  function switchPreset(presetId) {
    if (!Object.hasOwn(ART_PRESETS, presetId)) {
      return;
    }
    state.presetId = presetId;
    nav.sync(state);
    renderFrameNow(true);
  }

  function togglePause() {
    state.paused = !state.paused;
    nav.sync(state);
    syncTelemetry(true);
  }

  function resetAll() {
    state.camera = createCameraState();
    state.params = { ...DEFAULT_ART_PARAMS, speed: 1.0 };
    profileView.syncSliderValues({ ...state.params, zoom: state.camera.zoom });
    renderFrameNow(true);
  }

  function setZenMode(enabled) {
    state.zen = Boolean(enabled);
    appShell.classList.toggle('is-zen', state.zen);
    document.body.classList.toggle('is-zen-lock', state.zen);
    renderer.setZenMode(state.zen);
    if (zenExitBtn) {
      zenExitBtn.hidden = !state.zen;
    }
    requestAnimationFrame(() => {
      renderer.resize();
      scopeRenderer?.resize();
      renderFrameNow(true);
    });
  }

  // Orbit & ripple inside the dedicated CAD viewport stage
  const activePointers = new Map();
  let dragMovedPx = 0;

  canvasStage.addEventListener('pointerdown', (ev) => {
    activePointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    dragMovedPx = 0;
    document.body.classList.add('is-orbiting');
  });

  window.addEventListener('pointermove', (ev) => {
    renderer.setPointerPosition(ev.clientX, ev.clientY, true);
    if (!activePointers.has(ev.pointerId)) {
      return;
    }
    const prev = activePointers.get(ev.pointerId);
    const dx = ev.clientX - prev.x;
    const dy = ev.clientY - prev.y;
    activePointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });

    dragMovedPx += Math.hypot(dx, dy);
    state.camera.yawRad += dx * 0.008;
    state.camera.pitchRad = clamp(state.camera.pitchRad + dy * 0.0068, -1.25, 1.25);
    renderFrameNow();
  });

  const endPointer = (ev) => {
    const hadPointer = activePointers.has(ev.pointerId);
    activePointers.delete(ev.pointerId);
    if (activePointers.size === 0) {
      document.body.classList.remove('is-orbiting');
      if (hadPointer && dragMovedPx < 6) {
        renderer.triggerWavePulse(ev.clientX, ev.clientY, state.simTimeSec);
        renderFrameNow();
      }
    }
  };

  window.addEventListener('pointerup', endPointer);
  window.addEventListener('pointercancel', endPointer);
  canvasStage.addEventListener('mouseleave', () => {
    renderer.setPointerPosition(0, 0, false);
  });

  canvasStage.addEventListener('dblclick', () => {
    resetAll();
  });

  zenExitBtn?.addEventListener('click', () => setZenMode(false));

  window.addEventListener('keydown', (ev) => {
    const tag = ev.target?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || ev.metaKey || ev.ctrlKey || ev.altKey) {
      return;
    }
    const key = ev.key.toLowerCase();
    if (key === ' ') {
      ev.preventDefault();
      togglePause();
    } else if (key === 'r') {
      resetAll();
    } else if (key === 'h') {
      setZenMode(!state.zen);
    } else if (key === 'escape' && state.zen) {
      setZenMode(false);
    } else if (/^[1-3]$/.test(key)) {
      const idx = Number(key) - 1;
      if (PRESET_ORDER[idx]) {
        switchPreset(PRESET_ORDER[idx]);
      }
    }
  });

  window.addEventListener('resize', () => {
    renderer.resize();
    scopeRenderer?.resize();
    renderFrameNow();
  });

  let lastFrameMs = performance.now();
  const tick = (nowMs) => {
    const dtSec = Math.min(0.05, Math.max(0.001, (nowMs - lastFrameMs) / 1000));
    lastFrameMs = nowMs;

    if (!state.paused) {
      const rate = state.params.speed;
      state.simTimeSec += dtSec * rate;
      if (activePointers.size === 0 && !reducedMotionQuery?.matches && rate > 0) {
        state.camera.yawRad += dtSec * 0.22 * rate;
      }
      renderFrameNow();
    }
    requestAnimationFrame(tick);
  };

  renderer.resize();
  scopeRenderer?.resize();
  renderFrameNow(true);
  requestAnimationFrame(tick);

  fetchPublicReposWithFallback(PROFILE_DATA.login, { limit: 6 }).then(({ repos, source }) => {
    if (source === 'live') {
      profileView.renderRepos(repos, 'live');
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp, { once: true });
} else {
  initApp();
}
