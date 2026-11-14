import { DEFAULT_ART_PARAMS, clamp } from './math/mathArt.js?v=gcs23';
import { ASCII_SCENE_SPECS, GLYPH_MODES, buildAsciiScene, createSkyField } from './math/asciiScene.js?v=gcs23';
import { AsciiMathRenderer } from './math/asciiRenderer.js?v=gcs23';
import { createCameraState } from './math/projection3d.js?v=gcs23';
import { OscilloscopeRenderer } from './math/scopeRenderer.js?v=gcs23';
import { PROFILE_DATA, fetchPublicReposWithFallback } from './data/profile.js?v=gcs23';
import { ProfileView } from './ui/profileView.js?v=gcs23';

const PRESET_ORDER = Object.keys(ASCII_SCENE_SPECS);
const GLYPH_ORDER = Object.keys(GLYPH_MODES);

function hasOwnPreset(presetId) {
  return Object.prototype.hasOwnProperty.call(ASCII_SCENE_SPECS, presetId);
}

function renderBootRecovery(message) {
  const host = document.getElementById('hero-content') || document.body;
  if (!host) {
    return;
  }
  const box = document.createElement('div');
  box.className = 'boot-warning-panel';
  box.setAttribute('role', 'alert');

  const title = document.createElement('strong');
  title.className = 'boot-warning-panel__title';
  title.textContent = 'SYSTEM_SYNC // RECOVERY MODE';

  const desc = document.createElement('p');
  desc.className = 'boot-warning-panel__msg';
  desc.textContent = message || 'Interactive viewport failed to initialize (likely stale browser cache).';

  const reloadBtn = document.createElement('button');
  reloadBtn.type = 'button';
  reloadBtn.className = 'boot-reload-btn';
  reloadBtn.textContent = 'HARD RELOAD LATEST BUILD ↻';
  reloadBtn.addEventListener('click', () => {
    const url = new URL(window.location.href);
    url.searchParams.set('sync', String(Date.now()));
    window.location.replace(url.toString());
  });

  box.append(title, desc, reloadBtn);
  host.appendChild(box);
}

function formatWrappedDeg(rad) {
  let deg = (rad * 180) / Math.PI;
  deg = ((((deg + 180) % 360) + 360) % 360) - 180;
  const sign = deg >= 0 ? '+' : '-';
  return `${sign}${Math.abs(deg).toFixed(1).padStart(5, '0')}°`;
}

function buildHeaderControls(navRoot, initialState, callbacks) {
  navRoot.textContent = '';

  const presetBtns = new Map();
  for (const spec of Object.values(ASCII_SCENE_SPECS)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nav-cell';
    btn.dataset.presetId = spec.id;
    btn.textContent = `${spec.code} ${spec.label.toUpperCase()}`;
    btn.addEventListener('click', () => callbacks.onSelectPreset(spec.id));
    presetBtns.set(spec.id, btn);
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
  soloBtn.title = 'Fullscreen ASCII/Math viewport (H)';
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

function bindGlyphControls(glyphRoot, initialMode, onSelectGlyphMode) {
  if (!glyphRoot) {
    return { sync: () => {} };
  }

  const buttons = Array.from(glyphRoot.querySelectorAll('[data-glyph-mode]'));
  glyphRoot.addEventListener('pointerdown', (ev) => {
    ev.stopPropagation();
  });

  for (const btn of buttons) {
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const modeId = btn.dataset.glyphMode;
      if (modeId) {
        onSelectGlyphMode(modeId);
      }
    });
  }

  const sync = (glyphMode) => {
    for (const btn of buttons) {
      const active = btn.dataset.glyphMode === glyphMode;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    }
  };

  sync(initialMode);
  return { sync };
}

function initApp() {
  const appShell = document.getElementById('app-shell');
  const canvas = document.getElementById('math-canvas');
  const canvasStage = document.getElementById('canvas-stage');
  const navRoot = document.getElementById('nav-controls');
  const glyphRoot = document.getElementById('glyph-controls');
  const telemetryRoot = document.getElementById('top-telemetry');
  const viewportBadgeEl = document.getElementById('viewport-badge');
  const viewportAttitudeEl = document.getElementById('viewport-attitude');
  const consoleRoot = document.getElementById('hero-content');
  const sectionsRoot = document.getElementById('profile-sections');
  const footerRoot = document.getElementById('site-footer');
  const zenExitBtn = document.getElementById('zen-exit-btn');

  if (!appShell || !navRoot || !consoleRoot || !sectionsRoot || !footerRoot) {
    renderBootRecovery('Cockpit mount nodes missing due to stale cached HTML.');
    return;
  }
  const interactionStage = canvasStage || canvas;
  if (!canvas || !interactionStage) {
    renderBootRecovery('Canvas element missing from cached document.');
    return;
  }

  const reducedMotionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const state = {
    presetId: 'wave',
    glyphMode: 'math',
    paused: Boolean(reducedMotionQuery?.matches),
    zen: false,
    camera: createCameraState(),
    params: { ...DEFAULT_ART_PARAMS, speed: 1.0 },
    simTimeSec: 0,
  };

  const skyField = createSkyField(2026);
  const renderer = new AsciiMathRenderer(canvas);
  renderer.setGlyphMode(state.glyphMode);

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

  const glyphUi = bindGlyphControls(glyphRoot, state.glyphMode, (modeId) => setGlyphMode(modeId));

  let lastHudSyncMs = 0;
  let lastScopeStats = { peak: 0, rms: 0 };
  let lastGridStats = { cols: 0, rows: 0, activeGlyphs: 0 };

  function syncTelemetry(force = false) {
    const now = performance.now();
    if (!force && now - lastHudSyncMs < 90) {
      return;
    }
    lastHudSyncMs = now;

    const spec = ASCII_SCENE_SPECS[state.presetId] || ASCII_SCENE_SPECS.wave;
    const yawText = formatWrappedDeg(state.camera.yawRad);
    const pitchText = formatWrappedDeg(state.camera.pitchRad);
    const zoomText = `${state.camera.zoom.toFixed(2)}×`;
    const gridText = `${lastGridStats.cols}×${lastGridStats.rows}`;

    if (telemetryRoot) {
      telemetryRoot.textContent = `AZ ${yawText} · EL ${pitchText} · ZM ${zoomText} · ${gridText}`;
    }
    if (viewportBadgeEl) {
      viewportBadgeEl.textContent = `${spec.code} · ${spec.label.toUpperCase()} · ${spec.equation}`;
    }
    if (viewportAttitudeEl) {
      viewportAttitudeEl.textContent = `AZ ${yawText} · EL ${pitchText} · ${gridText}`;
    }
    profileView.updateScopeReadout(lastScopeStats);
  }

  function renderFrameNow(forceTelemetry = false) {
    const scene = buildAsciiScene(state.presetId, state.simTimeSec, state.params);
    const frameResult = renderer.render(scene, state.camera, skyField, state.simTimeSec);
    if (frameResult) {
      lastGridStats = {
        cols: frameResult.cols || 0,
        rows: frameResult.rows || 0,
        activeGlyphs: frameResult.activeGlyphs || 0,
      };
    }
    if (scene && scopeRenderer && !state.zen) {
      lastScopeStats = scopeRenderer.render(scene);
    }
    syncTelemetry(forceTelemetry);
  }

  const activePointers = new Map();
  let dragMovedPx = 0;
  let rafId = null;
  let lastFrameMs = performance.now();

  const tick = (nowMs) => {
    rafId = null;
    const isRunning = !state.paused;
    const hasBursts = renderer.hasActiveBursts();
    if (!isRunning && !hasBursts) {
      return;
    }

    const dtSec = Math.min(0.05, Math.max(0.001, (nowMs - lastFrameMs) / 1000));
    lastFrameMs = nowMs;

    if (isRunning) {
      const rate = state.params.speed;
      state.simTimeSec += dtSec * rate;
      if (activePointers.size === 0 && !reducedMotionQuery?.matches && rate > 0) {
        state.camera.yawRad += dtSec * 0.22 * rate;
      }
    }
    if (hasBursts) {
      renderer.stepBursts(dtSec);
    }

    renderFrameNow();
    scheduleNextTick();
  };

  function scheduleNextTick() {
    if ((state.paused && !renderer.hasActiveBursts()) || rafId !== null) {
      return;
    }
    lastFrameMs = performance.now();
    rafId = requestAnimationFrame(tick);
  }

  function stopAnimationLoop() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function switchPreset(presetId) {
    if (!hasOwnPreset(presetId)) {
      return;
    }
    state.presetId = presetId;
    nav.sync(state);
    renderFrameNow(true);
  }

  function setGlyphMode(modeId) {
    if (!Object.prototype.hasOwnProperty.call(GLYPH_MODES, modeId)) {
      return;
    }
    state.glyphMode = modeId;
    renderer.setGlyphMode(modeId);
    glyphUi.sync(modeId);
    renderFrameNow(true);
  }

  function togglePause() {
    state.paused = !state.paused;
    nav.sync(state);
    syncTelemetry(true);
    if (state.paused && !renderer.hasActiveBursts()) {
      stopAnimationLoop();
    } else {
      scheduleNextTick();
    }
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
    if (zenExitBtn) {
      zenExitBtn.hidden = !state.zen;
    }
    requestAnimationFrame(() => {
      renderer.resize();
      scopeRenderer?.resize();
      renderFrameNow(true);
    });
  }

  function getCanvasUv(ev) {
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    const inside =
      rect.width > 0 &&
      rect.height > 0 &&
      ev.clientX >= rect.left &&
      ev.clientX <= rect.right &&
      ev.clientY >= rect.top &&
      ev.clientY <= rect.bottom;
    return {
      u: clamp((ev.clientX - rect.left) / w, 0, 1),
      v: clamp((ev.clientY - rect.top) / h, 0, 1),
      inside,
    };
  }

  const clearPointers = () => {
    if (activePointers.size > 0) {
      activePointers.clear();
    }
    document.body.classList.remove('is-orbiting');
  };

  interactionStage.addEventListener('pointerdown', (ev) => {
    if (ev.target?.closest?.('#glyph-controls')) {
      return;
    }
    activePointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    dragMovedPx = 0;
    document.body.classList.add('is-orbiting');
  });

  window.addEventListener('pointermove', (ev) => {
    const { u, v, inside } = getCanvasUv(ev);
    renderer.setCursorUv(u, v, inside);

    if (activePointers.has(ev.pointerId)) {
      const prev = activePointers.get(ev.pointerId);
      const dx = ev.clientX - prev.x;
      const dy = ev.clientY - prev.y;
      activePointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });

      dragMovedPx += Math.hypot(dx, dy);
      state.camera.yawRad += dx * 0.008;
      state.camera.pitchRad = clamp(state.camera.pitchRad + dy * 0.0068, -1.25, 1.25);
      renderFrameNow();
      return;
    }

    if (state.paused && inside && !renderer.hasActiveBursts()) {
      renderFrameNow();
    }
  });

  const endPointer = (ev) => {
    const hadPointer = activePointers.has(ev.pointerId);
    activePointers.delete(ev.pointerId);
    if (activePointers.size === 0) {
      document.body.classList.remove('is-orbiting');
      if (hadPointer && dragMovedPx < 6) {
        const { u, v } = getCanvasUv(ev);
        renderer.triggerBurst(u, v, (state.simTimeSec * 0.25) % 1);
        renderFrameNow();
        scheduleNextTick();
      }
    }
  };

  window.addEventListener('pointerup', endPointer);
  window.addEventListener('pointercancel', endPointer);
  window.addEventListener('blur', () => {
    clearPointers();
    renderer.setCursorUv(0.5, 0.5, false);
    if (state.paused && !renderer.hasActiveBursts()) {
      renderFrameNow();
    }
  });
  interactionStage.addEventListener('lostpointercapture', clearPointers);
  interactionStage.addEventListener('contextmenu', clearPointers);
  interactionStage.addEventListener('mouseleave', () => {
    renderer.setCursorUv(0.5, 0.5, false);
    if (state.paused && !renderer.hasActiveBursts()) {
      renderFrameNow();
    }
  });

  interactionStage.addEventListener('dblclick', (ev) => {
    if (ev.target?.closest?.('#glyph-controls')) {
      return;
    }
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
    } else if (key === 'g') {
      const nextIdx = (GLYPH_ORDER.indexOf(state.glyphMode) + 1) % GLYPH_ORDER.length;
      setGlyphMode(GLYPH_ORDER[nextIdx]);
    } else if (key === 'escape' && state.zen) {
      setZenMode(false);
    } else if (/^[1-3]$/.test(key)) {
      const idx = Number(key) - 1;
      if (PRESET_ORDER[idx]) {
        switchPreset(PRESET_ORDER[idx]);
      }
    }
  });

  const handleViewportResize = () => {
    renderer.resize();
    scopeRenderer?.resize();
    renderFrameNow();
  };

  window.addEventListener('resize', handleViewportResize);
  if (typeof ResizeObserver === 'function') {
    const ro = new ResizeObserver(handleViewportResize);
    ro.observe(interactionStage);
    if (scopeCanvas) {
      ro.observe(scopeCanvas);
    }
  }

  renderer.resize();
  scopeRenderer?.resize();
  renderFrameNow(true);
  scheduleNextTick();

  fetchPublicReposWithFallback(PROFILE_DATA.login, { limit: 6 }).then(({ repos, source }) => {
    if (source === 'live') {
      profileView.renderRepos(repos, 'live');
    }
  });
}

function safeBoot() {
  try {
    initApp();
  } catch (err) {
    renderBootRecovery(
      `Initialization fault: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', safeBoot, { once: true });
} else {
  safeBoot();
}
