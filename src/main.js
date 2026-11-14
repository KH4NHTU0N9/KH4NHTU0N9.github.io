import { ART_PRESETS, clamp } from './math/mathArt.js';
import { createCameraState } from './math/projection3d.js';
import { COLOR_THEMES, MathCanvasRenderer } from './math/renderer.js';
import { PROFILE_DATA, fetchPublicReposWithFallback } from './data/profile.js';
import { ProfileView } from './ui/profileView.js';

const PRESET_ORDER = Object.keys(ART_PRESETS);

function buildVisualDock(dockEl, initialState, callbacks) {
  dockEl.textContent = '';

  const presetGroup = document.createElement('div');
  presetGroup.className = 'dock-group';
  presetGroup.setAttribute('role', 'tablist');
  presetGroup.setAttribute('aria-label', 'Background visual presets');

  const presetBtns = new Map();
  for (const preset of Object.values(ART_PRESETS)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dock-pill';
    btn.dataset.presetId = preset.id;
    btn.textContent = preset.label;
    btn.setAttribute('role', 'tab');
    btn.addEventListener('click', () => callbacks.onSelectPreset(preset.id));
    presetBtns.set(preset.id, btn);
    presetGroup.appendChild(btn);
  }

  const divider = document.createElement('span');
  divider.className = 'dock-divider';
  divider.setAttribute('aria-hidden', 'true');

  const themeGroup = document.createElement('div');
  themeGroup.className = 'dock-group';
  themeGroup.setAttribute('aria-label', 'Color aura palettes');

  const themeBtns = new Map();
  for (const theme of Object.values(COLOR_THEMES)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dock-swatch';
    btn.dataset.themeId = theme.id;
    btn.title = theme.label;

    const dot = document.createElement('span');
    dot.className = `dock-swatch__dot dock-swatch__dot--${theme.id}`;
    const label = document.createElement('span');
    label.textContent = theme.label.split(' ')[0];

    btn.append(dot, label);
    btn.addEventListener('click', () => callbacks.onSelectTheme(theme.id));
    themeBtns.set(theme.id, btn);
    themeGroup.appendChild(btn);
  }

  const actionGroup = document.createElement('div');
  actionGroup.className = 'dock-group';

  const pauseBtn = document.createElement('button');
  pauseBtn.type = 'button';
  pauseBtn.className = 'dock-pill dock-pill--icon';
  pauseBtn.title = 'Play / Pause (Space)';
  pauseBtn.addEventListener('click', () => callbacks.onTogglePause());

  const zenBtn = document.createElement('button');
  zenBtn.type = 'button';
  zenBtn.className = 'dock-pill dock-pill--accent';
  zenBtn.textContent = 'Focus Art (H)';
  zenBtn.title = 'Fullscreen visual showcase (H)';
  zenBtn.addEventListener('click', () => callbacks.onToggleZen());

  actionGroup.append(pauseBtn, zenBtn);
  dockEl.append(presetGroup, divider, themeGroup, actionGroup);

  const sync = ({ presetId, themeId, paused }) => {
    for (const [id, btn] of presetBtns.entries()) {
      const active = id === presetId;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', String(active));
    }
    for (const [id, btn] of themeBtns.entries()) {
      const active = id === themeId;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    }
    pauseBtn.textContent = paused ? 'Play' : 'Pause';
    pauseBtn.setAttribute('aria-pressed', String(paused));
  };

  sync(initialState);
  return { sync };
}

function initApp() {
  const appShell = document.getElementById('app-shell');
  const heroStage = document.getElementById('hero-stage');
  const canvas = document.getElementById('math-canvas');
  const heroRoot = document.getElementById('hero-content');
  const sectionsRoot = document.getElementById('profile-sections');
  const dockEl = document.getElementById('visual-dock');
  const zenExitBtn = document.getElementById('zen-exit-btn');

  if (!appShell || !heroStage || !canvas || !heroRoot || !sectionsRoot || !dockEl) {
    return;
  }

  const reducedMotionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const state = {
    presetId: 'constellation',
    themeId: 'aurora',
    paused: Boolean(reducedMotionQuery?.matches),
    zen: false,
    camera: createCameraState(),
    simTimeSec: 0,
  };

  document.documentElement.dataset.aura = state.themeId;

  const renderer = new MathCanvasRenderer(canvas);
  const profileView = new ProfileView({ heroRoot, sectionsRoot }, PROFILE_DATA);

  const dock = buildVisualDock(dockEl, state, {
    onSelectPreset: (presetId) => switchPreset(presetId),
    onSelectTheme: (themeId) => switchTheme(themeId),
    onTogglePause: () => togglePause(),
    onToggleZen: () => setZenMode(!state.zen),
  });

  function renderFrameNow() {
    renderer.render({
      presetId: state.presetId,
      camera: state.camera,
      timeSec: state.simTimeSec,
    });
  }

  function switchPreset(presetId) {
    if (!Object.hasOwn(ART_PRESETS, presetId)) {
      return;
    }
    state.presetId = presetId;
    dock.sync(state);
    renderFrameNow();
  }

  function switchTheme(themeId) {
    if (!Object.hasOwn(COLOR_THEMES, themeId)) {
      return;
    }
    state.themeId = themeId;
    document.documentElement.dataset.aura = themeId;
    renderer.setTheme(themeId);
    dock.sync(state);
    renderFrameNow();
  }

  function togglePause() {
    state.paused = !state.paused;
    dock.sync(state);
  }

  function resetCamera() {
    state.camera = createCameraState();
    renderFrameNow();
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
      renderFrameNow();
    });
  }

  // Interactive pointer orbit, pinch-zoom & ripple pulses directly on canvas
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
    heroStage.classList.add('is-dragging');
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
      state.camera.yawRad += dx * 0.008;
      state.camera.pitchRad = clamp(state.camera.pitchRad + dy * 0.007, -1.25, 1.25);
      renderFrameNow();
    } else if (activePointers.size === 2) {
      const pts = Array.from(activePointers.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (lastPinchDist !== null && dist > 8) {
        const ratio = dist / lastPinchDist;
        state.camera.zoom = clamp(state.camera.zoom * ratio, 0.5, 2.4);
        renderFrameNow();
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
      heroStage.classList.remove('is-dragging');
      if (hadPointer && dragMovedPx < 6) {
        const local = canvasCoords(ev);
        renderer.triggerWavePulse(local.x, local.y, state.simTimeSec);
        renderFrameNow();
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
      // Zoom smoothly when Shift held or in Zen showcase mode, otherwise allow natural page scroll
      if (!state.zen && !ev.ctrlKey && !ev.shiftKey) {
        return;
      }
      ev.preventDefault();
      const factor = ev.deltaY > 0 ? 0.92 : 1.08;
      state.camera.zoom = clamp(state.camera.zoom * factor, 0.5, 2.4);
      renderFrameNow();
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
    } else if (/^[1-3]$/.test(key)) {
      const idx = Number(key) - 1;
      if (PRESET_ORDER[idx]) {
        switchPreset(PRESET_ORDER[idx]);
      }
    }
  });

  if (typeof ResizeObserver === 'function') {
    const ro = new ResizeObserver(() => {
      renderer.resize();
      renderFrameNow();
    });
    ro.observe(heroStage);
  } else {
    window.addEventListener('resize', () => {
      renderer.resize();
      renderFrameNow();
    });
  }

  let lastFrameMs = performance.now();
  const tick = (nowMs) => {
    const dtSec = Math.min(0.05, Math.max(0.001, (nowMs - lastFrameMs) / 1000));
    lastFrameMs = nowMs;

    if (!state.paused) {
      state.simTimeSec += dtSec;
      if (activePointers.size === 0 && !reducedMotionQuery?.matches) {
        state.camera.yawRad += dtSec * 0.24;
      }
      renderFrameNow();
    }
    requestAnimationFrame(tick);
  };

  renderer.resize();
  renderFrameNow();
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
