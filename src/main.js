import { MATH_MODELS, clamp, getDefaultParams } from './math/integrators.js';
import { createCameraState } from './math/projection3d.js';
import { MathCanvasRenderer } from './math/renderer.js';
import { PROFILE_DATA, fetchPublicReposWithFallback } from './data/profile.js';
import { EquationPanel } from './ui/equationPanel.js';
import { ProfileView } from './ui/profileView.js';

const MODEL_ORDER = Object.keys(MATH_MODELS);

function initApp() {
  const appShell = document.getElementById('app-shell');
  const canvasStage = document.getElementById('canvas-stage');
  const canvas = document.getElementById('math-canvas');
  const eqPanelRoot = document.getElementById('equation-panel');
  const profileRoot = document.getElementById('profile-view');
  const zenExitBtn = document.getElementById('zen-exit-btn');
  const hudModelBadge = document.getElementById('hud-model-badge');

  if (!appShell || !canvasStage || !canvas || !eqPanelRoot || !profileRoot) {
    return;
  }

  const reducedMotionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const state = {
    modelId: 'lorenz',
    params: getDefaultParams('lorenz'),
    themeId: 'quantum',
    showAxes: true,
    paused: Boolean(reducedMotionQuery?.matches),
    zen: false,
    camera: createCameraState(),
    simTimeSec: 0,
  };

  const renderer = new MathCanvasRenderer(canvas);
  const profileView = new ProfileView(profileRoot, PROFILE_DATA);

  let telemetryLastUpdateMs = 0;

  const updateHudTitle = () => {
    const activeModel = MATH_MODELS[state.modelId];
    if (hudModelBadge && activeModel) {
      hudModelBadge.textContent = `@KH4NHTU0N9 · ${activeModel.name.toUpperCase()}`;
    }
  };

  const eqPanel = new EquationPanel(eqPanelRoot, {
    initialState: {
      modelId: state.modelId,
      params: state.params,
      themeId: state.themeId,
      paused: state.paused,
      showAxes: state.showAxes,
    },
    onSelectModel: (modelId) => switchModel(modelId),
    onParamChange: (key, value) => {
      state.params[key] = value;
      renderFrameNow(true);
    },
    onResetParams: () => {
      state.params = getDefaultParams(state.modelId);
      eqPanel.updateParamValues(state.params);
      renderFrameNow(true);
    },
    onSelectTheme: (themeId) => {
      state.themeId = themeId;
      renderer.setTheme(themeId);
      eqPanel.syncControlStates({ themeId });
      renderFrameNow(false);
    },
    onToggleAxes: (showAxes) => {
      state.showAxes = showAxes;
      renderer.setShowAxes(showAxes);
      eqPanel.syncControlStates({ showAxes });
      renderFrameNow(false);
    },
    onTogglePause: () => togglePause(),
    onResetCamera: () => resetCamera(),
    onToggleZen: () => setZenMode(!state.zen),
  });

  function switchModel(modelId) {
    if (!Object.hasOwn(MATH_MODELS, modelId)) {
      return;
    }
    state.modelId = modelId;
    state.params = getDefaultParams(modelId);
    eqPanel.syncModelUI(modelId, state.params);
    updateHudTitle();
    renderFrameNow(true);
  }

  function togglePause() {
    state.paused = !state.paused;
    eqPanel.syncControlStates({ paused: state.paused });
  }

  function resetCamera() {
    state.camera = createCameraState();
    renderFrameNow(false);
  }

  function setZenMode(enabled) {
    state.zen = Boolean(enabled);
    appShell.classList.toggle('is-zen', state.zen);
    document.body.classList.toggle('is-zen-lock', state.zen);
    if (zenExitBtn) {
      zenExitBtn.hidden = !state.zen;
    }
    requestAnimationFrame(() => {
      renderer.resize();
      renderFrameNow(false);
    });
  }

  function renderFrameNow(forceTelemetry) {
    const telemetry = renderer.render({
      modelId: state.modelId,
      params: state.params,
      camera: state.camera,
      timeSec: state.simTimeSec,
    });
    const now = performance.now();
    if (forceTelemetry || now - telemetryLastUpdateMs >= 90) {
      eqPanel.updateTelemetry(telemetry);
      telemetryLastUpdateMs = now;
    }
  }

  // Pointer orbit, pinch-zoom, cursor field deflection & harmonic click pulses
  const activePointers = new Map();
  let dragMovedPx = 0;
  let lastPinchDist = null;

  const canvasCoords = (ev) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ev.clientX - rect.left,
      y: ev.clientY - rect.top,
    };
  };

  canvas.addEventListener('pointerdown', (ev) => {
    canvas.setPointerCapture?.(ev.pointerId);
    activePointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    dragMovedPx = 0;
    lastPinchDist = null;
    canvasStage.classList.add('is-dragging');
  });

  canvas.addEventListener('pointermove', (ev) => {
    const local = canvasCoords(ev);
    renderer.setPointerPosition(local.x, local.y, true);

    if (!activePointers.has(ev.pointerId)) {
      return;
    }
    const prev = activePointers.get(ev.pointerId);
    const dx = ev.clientX - prev.x;
    const dy = ev.clientY - prev.y;
    activePointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });

    if (activePointers.size === 1) {
      dragMovedPx += Math.hypot(dx, dy);
      state.camera.yawRad += dx * 0.0085;
      state.camera.pitchRad = clamp(state.camera.pitchRad + dy * 0.0075, -1.35, 1.35);
      renderFrameNow(false);
    } else if (activePointers.size === 2) {
      const pts = Array.from(activePointers.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (lastPinchDist !== null && dist > 8) {
        const ratio = dist / lastPinchDist;
        state.camera.zoom = clamp(state.camera.zoom * ratio, 0.45, 2.8);
        renderFrameNow(false);
      }
      lastPinchDist = dist;
    }
  });

  const endPointer = (ev) => {
    const hadPointer = activePointers.has(ev.pointerId);
    activePointers.delete(ev.pointerId);
    if (activePointers.size < 2) {
      lastPinchDist = null;
    }
    if (activePointers.size === 0) {
      canvasStage.classList.remove('is-dragging');
      if (hadPointer && dragMovedPx < 6) {
        const local = canvasCoords(ev);
        renderer.triggerWavePulse(local.x, local.y, state.simTimeSec);
        renderFrameNow(false);
      }
    }
  };

  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('pointerleave', () => {
    renderer.setPointerPosition(0, 0, false);
  });

  canvas.addEventListener('dblclick', () => resetCamera());

  canvas.addEventListener(
    'wheel',
    (ev) => {
      ev.preventDefault();
      const factor = ev.deltaY > 0 ? 0.92 : 1.08;
      state.camera.zoom = clamp(state.camera.zoom * factor, 0.45, 2.8);
      renderFrameNow(false);
    },
    { passive: false },
  );

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
      resetCamera();
    } else if (key === 'h') {
      setZenMode(!state.zen);
    } else if (key === 'escape' && state.zen) {
      setZenMode(false);
    } else if (/^[1-4]$/.test(key)) {
      const idx = Number(key) - 1;
      if (MODEL_ORDER[idx]) {
        switchModel(MODEL_ORDER[idx]);
      }
    }
  });

  if (typeof ResizeObserver === 'function') {
    const ro = new ResizeObserver(() => {
      renderer.resize();
      renderFrameNow(false);
    });
    ro.observe(canvasStage);
  } else {
    window.addEventListener('resize', () => {
      renderer.resize();
      renderFrameNow(false);
    });
  }
}
initApp();
