import { ART_PRESETS, clamp } from './math/mathArt.js';
import { createCameraState } from './math/projection3d.js';
import { MathCanvasRenderer } from './math/renderer.js';
import { PROFILE_DATA, fetchPublicReposWithFallback } from './data/profile.js';
import { ProfileView } from './ui/profileView.js';

const PRESET_ORDER = Object.keys(ART_PRESETS);

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

  const soloBtn = document.createElement('button');
  soloBtn.type = 'button';
  soloBtn.className = 'nav-cell nav-cell--accent';
  soloBtn.textContent = 'SOLO [H]';
  soloBtn.title = 'Fullscreen geometric canvas (H)';
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
  const navRoot = document.getElementById('nav-controls');
  const heroRoot = document.getElementById('hero-content');
  const sectionsRoot = document.getElementById('profile-sections');
  const footerRoot = document.getElementById('site-footer');
  const zenExitBtn = document.getElementById('zen-exit-btn');

  if (!appShell || !canvas || !navRoot || !heroRoot || !sectionsRoot || !footerRoot) {
    return;
  }

  const reducedMotionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const state = {
    presetId: 'wave',
    paused: Boolean(reducedMotionQuery?.matches),
    zen: false,
    camera: createCameraState(),
    simTimeSec: 0,
  };

  const renderer = new MathCanvasRenderer(canvas);
  const profileView = new ProfileView({ heroRoot, sectionsRoot, footerRoot }, PROFILE_DATA);

  const nav = buildHeaderControls(navRoot, state, {
    onSelectPreset: (presetId) => switchPreset(presetId),
    onTogglePause: () => togglePause(),
    onToggleZen: () => setZenMode(!state.zen),
  });

  function computeScrollProgress() {
    const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    return clamp(window.scrollY / scrollable, 0, 1);
  }

  function renderFrameNow() {
    renderer.render({
      presetId: state.presetId,
      camera: state.camera,
      timeSec: state.simTimeSec,
      scrollProgress: computeScrollProgress(),
    });
  }

  function switchPreset(presetId) {
    if (!Object.hasOwn(ART_PRESETS, presetId)) {
      return;
    }
    state.presetId = presetId;
    nav.sync(state);
    renderFrameNow();
  }

  function togglePause() {
    state.paused = !state.paused;
    nav.sync(state);
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

  // Drag / ripple directly through non-interactive surfaces or anywhere in fullscreen
  const activePointers = new Map();
  let dragMovedPx = 0;

  const isInteractiveTarget = (target) =>
    Boolean(target?.closest?.('a, button, input, [role="tab"]'));

  window.addEventListener('pointerdown', (ev) => {
    if (!state.zen && isInteractiveTarget(ev.target)) {
      return;
    }
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
    state.camera.yawRad += dx * 0.0075;
    state.camera.pitchRad = clamp(state.camera.pitchRad + dy * 0.0065, -1.25, 1.25);
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
  document.addEventListener('mouseleave', () => {
    renderer.setPointerPosition(0, 0, false);
  });

  window.addEventListener('dblclick', (ev) => {
    if (!isInteractiveTarget(ev.target)) {
      resetCamera();
    }
  });

  window.addEventListener('scroll', () => {
    if (state.paused) {
      renderFrameNow();
    }
  }, { passive: true });

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

  window.addEventListener('resize', () => {
    renderer.resize();
    renderFrameNow();
  });

  let lastFrameMs = performance.now();
  const tick = (nowMs) => {
    const dtSec = Math.min(0.05, Math.max(0.001, (nowMs - lastFrameMs) / 1000));
    lastFrameMs = nowMs;

    if (!state.paused) {
      state.simTimeSec += dtSec;
      if (activePointers.size === 0 && !reducedMotionQuery?.matches) {
        state.camera.yawRad += dtSec * 0.2;
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
