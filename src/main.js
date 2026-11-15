import { clamp } from './math/mathArt.js?v=gcs26';
import {
  ASCII_SCENE_SPECS,
  GLYPH_MODES,
  buildAsciiScene,
  createSkyField,
} from './math/asciiScene.js?v=gcs26';
import { AsciiMathRenderer } from './math/asciiRenderer.js?v=gcs26';
import { createCameraState } from './math/projection3d.js?v=gcs26';
import { PROFILE_DATA, fetchPublicReposWithFallback } from './data/profile.js?v=gcs26';
import { ProfileView } from './ui/profileView.js?v=gcs26';

const PRESET_ORDER = Object.keys(ASCII_SCENE_SPECS);
const GLYPH_ORDER = Object.keys(GLYPH_MODES);

const DECODE_POOL = {
  math: '∑π∫±÷×∞·',
  ascii: '.:-=+*#%@',
  binary: '01011001',
};

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
  resetBtn.title = 'Reset camera angle (R)';
  resetBtn.addEventListener('click', () => callbacks.onResetAll());
  navRoot.appendChild(resetBtn);

  const soloBtn = document.createElement('button');
  soloBtn.type = 'button';
  soloBtn.className = 'nav-cell nav-cell--accent';
  soloBtn.textContent = 'SOLO [H]';
  soloBtn.title = 'Fullscreen 3D ASCII visualizer (H)';
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

function bindJumpNavigation(jumpsRoot) {
  if (!jumpsRoot) {
    return { setActiveByHref: () => {} };
  }
  const links = Array.from(jumpsRoot.querySelectorAll('a.jump-link'));

  const setActiveByHref = (href) => {
    for (const link of links) {
      link.classList.toggle('is-active', link.getAttribute('href') === href);
    }
  };

  for (const link of links) {
    link.addEventListener('click', () => {
      const href = link.getAttribute('href');
      if (href) {
        setActiveByHref(href);
      }
    });
  }

  if (typeof IntersectionObserver === 'function') {
    const sections = links
      .map((l) => {
        const id = l.getAttribute('href')?.slice(1);
        return id ? document.getElementById(id) : null;
      })
      .filter(Boolean);

    if (sections.length > 0) {
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              setActiveByHref(`#${entry.target.id}`);
              break;
            }
          }
        },
        { rootMargin: '-25% 0px -60% 0px', threshold: 0.05 },
      );
      for (const sec of sections) {
        observer.observe(sec);
      }
    }
  }

  return { setActiveByHref };
}

function initApp() {
  const appShell = document.getElementById('app-shell');
  const canvas = document.getElementById('math-canvas');
  const canvasStage = document.getElementById('canvas-stage');
  const navRoot = document.getElementById('nav-controls');
  const jumpsRoot = document.getElementById('nav-jumps');
  const glyphRoot = document.getElementById('glyph-controls');
  const viewportBadgeEl = document.getElementById('viewport-badge');
  const viewportAttitudeEl = document.getElementById('viewport-attitude');
  const consoleRoot = document.getElementById('hero-content');
  const sectionsRoot = document.getElementById('profile-sections');
  const footerRoot = document.getElementById('site-footer');
  const cvModalRoot = document.getElementById('cv-modal');
  const zenExitBtn = document.getElementById('zen-exit-btn');

  if (!appShell || !navRoot || !consoleRoot || !sectionsRoot || !footerRoot) {
    renderBootRecovery('Portfolio mount nodes missing due to stale cached HTML.');
    return;
  }
  const interactionStage = canvasStage || canvas;
  if (!canvas || !interactionStage) {
    renderBootRecovery('Canvas element missing from cached document.');
    return;
  }

  const reducedMotionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const state = {
    presetId: 'mesh',
    glyphMode: 'math',
    paused: Boolean(reducedMotionQuery?.matches),
    zen: false,
    camera: createCameraState(),
    simTimeSec: 0,
  };

  document.documentElement.dataset.glyphMode = state.glyphMode;

  const skyField = createSkyField(2026);
  const renderer = new AsciiMathRenderer(canvas);
  renderer.setGlyphMode(state.glyphMode);

  let badgeDecodeRaf = null;
  let badgeDecoding = false;

  const formatBadgeText = (presetId = state.presetId) => {
    const spec = ASCII_SCENE_SPECS[presetId] || ASCII_SCENE_SPECS.mesh;
    return `${spec.code} · ${spec.label.toUpperCase()} · ${spec.equation}`;
  };

  function runBadgeDecodeTransition(modeId) {
    if (!viewportBadgeEl) {
      return;
    }
    if (badgeDecodeRaf !== null) {
      cancelAnimationFrame(badgeDecodeRaf);
      badgeDecodeRaf = null;
    }

    const modeLabel = GLYPH_MODES[modeId]?.label || 'MATH';
    const settled = `${formatBadgeText(state.presetId)} · [${modeLabel}]`;
    if (reducedMotionQuery?.matches) {
      badgeDecoding = false;
      viewportBadgeEl.textContent = formatBadgeText(state.presetId);
      return;
    }

    const pool = DECODE_POOL[modeId] || DECODE_POOL.math;
    const durationMs = 200;
    const startMs = performance.now();
    badgeDecoding = true;

    const step = (nowMs) => {
      const progress = clamp((nowMs - startMs) / durationMs, 0, 1);
      if (progress >= 1) {
        badgeDecoding = false;
        badgeDecodeRaf = null;
        viewportBadgeEl.textContent = formatBadgeText(state.presetId);
        return;
      }

      const revealCount = Math.floor(progress * settled.length);
      let out = '';
      for (let i = 0; i < settled.length; i++) {
        const ch = settled[i];
        if (i < revealCount || ch === ' ' || ch === '·') {
          out += ch;
        } else {
          out += pool[(i + Math.floor(nowMs * 0.08)) % pool.length];
        }
      }
      viewportBadgeEl.textContent = out;
      badgeDecodeRaf = requestAnimationFrame(step);
    };

    badgeDecodeRaf = requestAnimationFrame(step);
  }

  const jumpNav = bindJumpNavigation(jumpsRoot);

  const navigateToSection = (sectionId) => {
    const target = document.getElementById(sectionId);
    if (!target) return false;
    target.scrollIntoView({ behavior: reducedMotionQuery?.matches ? 'auto' : 'smooth', block: 'start' });
    jumpNav.setActiveByHref(`#${sectionId}`);
    return true;
  };

  const executeCliCommand = (rawInput) => {
    const trimmed = String(rawInput || '').trim();
    const clean = trimmed.replace(/^\.\//, '');
    const tokens = clean.split(/\s+/).filter(Boolean);
    const cmd = (tokens[0] || '').toLowerCase();
    const arg = tokens.slice(1).join(' ');

    if (cmd === 'help' || cmd === '?') {
      return {
        lines: [
          'COMMANDS: whoami · scene <mesh|cipher|rf> · glyph <math|ascii|bin> · grep <tool> · goto <about|log|tooling|repos> · cv · reset · clear',
        ],
      };
    }
    if (cmd === 'whoami') {
      return {
        lines: [
          `${PROFILE_DATA.displayName} (@${PROFILE_DATA.login}) — ${PROFILE_DATA.tagline}`,
          'TRACKS: DFIR (Wireshark, Binwalk, TSK) · RF/MCU (RTL8720DN, ESP32, C) · Systems (Linux, Python, Docker)',
        ],
      };
    }
    if (cmd === 'ls') {
      return {
        lines: ['sections/: 00-about/  01-log/  02-tooling/  03-repos/'],
      };
    }
    if (cmd === 'clear') {
      return { clear: true, lines: [] };
    }
    if (cmd === 'cv' || cmd === 'resume') {
      profileView.openCvModal();
      return { lines: ['Opened Printable Resume / CV preview dialog (press Esc to close).'] };
    }
    if (cmd === 'reset') {
      resetAll();
      profileView.setGrepQuery('');
      return { lines: ['Camera reset & tooling grep filter cleared.'] };
    }
    if (cmd === 'scene' || hasOwnPreset(cmd)) {
      const targetPreset = hasOwnPreset(cmd) ? cmd : arg.toLowerCase();
      if (hasOwnPreset(targetPreset)) {
        switchPreset(targetPreset);
        const spec = ASCII_SCENE_SPECS[targetPreset];
        return { lines: [`3D scene -> ${spec.code} ${spec.label.toUpperCase()} (${spec.equation})`] };
      }
      return { lines: [`Usage: scene <${PRESET_ORDER.join('|')}>`] };
    }
    if (cmd === 'glyph' || cmd === 'math' || cmd === 'ascii' || cmd === 'bin' || cmd === 'binary') {
      const rawMode = cmd === 'glyph' ? arg.toLowerCase() : cmd;
      const modeId = rawMode === 'bin' ? 'binary' : rawMode;
      if (Object.prototype.hasOwnProperty.call(GLYPH_MODES, modeId)) {
        setGlyphMode(modeId);
        return { lines: [`Glyph mode decoded -> ${GLYPH_MODES[modeId].label}`] };
      }
      return { lines: ['Usage: glyph <math|ascii|bin>'] };
    }
    if (cmd === 'grep' || cmd === 'find') {
      profileView.setGrepQuery(arg);
      navigateToSection('tooling-matrix');
      return {
        lines: [arg ? `Filtered Tooling & Capabilities by "${arg}".` : 'Cleared tooling filter.'],
      };
    }
    if (cmd === 'goto' || cmd === 'cd') {
      const targetKey = arg.toLowerCase().replace(/^0\d[-_\s]*/, '');
      const map = {
        about: 'about-section',
        log: 'experience-log',
        experience: 'experience-log',
        tooling: 'tooling-matrix',
        skills: 'tooling-matrix',
        repos: 'source-repos',
        projects: 'source-repos',
      };
      const domId = map[targetKey];
      if (domId && navigateToSection(domId)) {
        return { lines: [`Jumped to #${domId}.`] };
      }
      return { lines: ['Usage: goto <about|log|tooling|repos>'] };
    }

    return {
      lines: [`sh: ${cmd}: command not found (try "help", "whoami", "scene rf", "glyph bin", "cv")`],
    };
  };

  const profileView = new ProfileView(
    { consoleRoot, sectionsRoot, footerRoot, cvModalRoot },
    PROFILE_DATA,
    { onCliCommand: executeCliCommand },
  );
  profileView.setGlyphMode(state.glyphMode, state.presetId, 0);

  const nav = buildHeaderControls(navRoot, state, {
    onSelectPreset: (presetId) => switchPreset(presetId),
    onTogglePause: () => togglePause(),
    onResetAll: () => resetAll(),
    onToggleZen: () => setZenMode(!state.zen),
  });

  const glyphUi = bindGlyphControls(glyphRoot, state.glyphMode, (modeId) => setGlyphMode(modeId));

  let lastHudSyncMs = 0;
  let lastGridStats = { cols: 0, rows: 0, activeGlyphs: 0 };

  function syncTelemetry(force = false) {
    const now = performance.now();
    if (!force && now - lastHudSyncMs < 90) {
      return;
    }
    lastHudSyncMs = now;

    const yawText = formatWrappedDeg(state.camera.yawRad);
    const pitchText = formatWrappedDeg(state.camera.pitchRad);
    const zoomText = `${state.camera.zoom.toFixed(2)}×`;
    const gridText = `${lastGridStats.cols}×${lastGridStats.rows}`;

    if (viewportBadgeEl && !badgeDecoding) {
      viewportBadgeEl.textContent = formatBadgeText(state.presetId);
    }
    if (viewportAttitudeEl) {
      viewportAttitudeEl.textContent = `AZ ${yawText} · EL ${pitchText} · ZM ${zoomText} · ${gridText}`;
    }
  }

  function renderFrameNow(forceTelemetry = false) {
    const scene = buildAsciiScene(state.presetId, state.simTimeSec);
    const frameResult = renderer.render(scene, state.camera, skyField, state.simTimeSec);
    if (frameResult) {
      lastGridStats = {
        cols: frameResult.cols || 0,
        rows: frameResult.rows || 0,
        activeGlyphs: frameResult.activeGlyphs || 0,
      };
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
      state.simTimeSec += dtSec;
      if (activePointers.size === 0 && !reducedMotionQuery?.matches) {
        state.camera.yawRad += dtSec * 0.18;
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
    badgeDecoding = false;
    nav.sync(state);
    profileView.setPreset(state.presetId);
    renderFrameNow(true);
  }

  function setGlyphMode(modeId) {
    if (!Object.prototype.hasOwnProperty.call(GLYPH_MODES, modeId)) {
      return;
    }
    state.glyphMode = modeId;
    document.documentElement.dataset.glyphMode = modeId;
    renderer.setGlyphMode(modeId);
    profileView.setGlyphMode(modeId, state.presetId, state.simTimeSec);
    glyphUi.sync(modeId);
    renderFrameNow(true);
    runBadgeDecodeTransition(modeId);
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
    if (ev.key === 'Escape' && profileView.isCvModalOpen()) {
      ev.preventDefault();
      profileView.closeCvModal();
      return;
    }
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
    renderFrameNow();
  };

  window.addEventListener('resize', handleViewportResize);
  if (typeof ResizeObserver === 'function') {
    const ro = new ResizeObserver(handleViewportResize);
    ro.observe(interactionStage);
  }

  renderer.resize();
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
