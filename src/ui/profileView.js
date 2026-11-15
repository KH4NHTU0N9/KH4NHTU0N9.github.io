import { LANGUAGE_COLORS, PROFILE_DATA, isSafeExternalUrl } from '../data/profile.js?v=gcs24';
import {
  formatSkillMeter,
  generateDomainBanner,
  generateFallbackSigilRows,
  generateHorizonBanner,
  generateRepoAsciiPreview,
  sampleImagePixelsToAscii,
} from '../math/asciiArt.js?v=gcs24';

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

function createSafeLink(href, className, text, { allowMailto = false } = {}) {
  if (!isSafeExternalUrl(href, { allowMailto })) {
    return createEl('span', className, text);
  }
  const a = createEl('a', className, text);
  a.href = href;
  if (!href.toLowerCase().startsWith('mailto:')) {
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
  }
  return a;
}

const SLIDER_SPECS = [
  { key: 'freq', code: 'HARMONIC / K', min: 0.4, max: 2.4, step: 0.05, def: 1.0, unit: '×' },
  { key: 'amp', code: 'AMPLITUDE / A', min: 0.35, max: 1.65, step: 0.05, def: 1.0, unit: '×' },
  { key: 'speed', code: 'PHASE_RATE', min: 0, max: 2.5, step: 0.05, def: 1.0, unit: '×' },
  { key: 'zoom', code: 'CAM_OPTIC_ZM', min: 0.65, max: 1.65, step: 0.05, def: 1.0, unit: '×' },
];

const MODE_LABELS = {
  math: 'MATH',
  ascii: 'ASCII',
  binary: 'BIN',
};

const AVATAR_COLS = 16;
const AVATAR_ROWS = 10;

/**
 * Renders the unified ASCII/Math portfolio interface across UNIT_01 Operator Console,
 * Live Pixel-Sampled ASCII Portrait, Horizon Wave Divider, Domain Visualizers,
 * Procedural Repository ASCII Blueprints, and CLI Status Colophon.
 */
export class ProfileView {
  /**
   * @param {{ consoleRoot: HTMLElement, sectionsRoot: HTMLElement, footerRoot: HTMLElement }} roots
   * @param {typeof PROFILE_DATA} [profile]
   * @param {{ onParamChange?: (key: string, val: number) => void, onSelectGlyphMode?: (modeId: string) => void }} [callbacks]
   */
  constructor({ consoleRoot, heroRoot, sectionsRoot, footerRoot } = {}, profile = PROFILE_DATA, callbacks = {}) {
    this.consoleRoot = consoleRoot || heroRoot || null;
    this.sectionsRoot = sectionsRoot || null;
    this.footerRoot = footerRoot || null;
    this.profile = profile;
    this.callbacks = callbacks;

    this.activeDomainId = 'all';
    this.searchQuery = '';
    this.glyphMode = 'math';
    this.presetId = 'wave';
    this.repoSource = 'fallback';
    this.repoCount = this.profile.fallbackRepos.length;

    this.domainButtons = new Map();
    this.sliderControls = new Map();
    this.inlineGlyphButtons = [];

    this.scopeCanvasEl = null;
    this.scopeStatsEl = null;
    this.avatarCanvasEl = null;
    this.avatarCtx = null;
    this.avatarPixels = null;
    this.avatarRawPinned = false;
    this.avatarBadgeEl = null;
    this.avatarDirty = true;

    this.horizonStreamEl = null;
    this.horizonModeTagEl = null;
    this.domainWidgets = [];
    this.skillMeters = [];
    this.repoWidgets = [];
    this.footerCliEl = null;

    this.indexGridEl = null;
    this.reposGridEl = null;
    this.reposStatusEl = null;
    this.lastScopeStatsText = '';
    this.lastAsciiUiMs = 0;

    this.renderConsole();
    this.renderSectionsBase();
    this.renderDomains('all');
    this.renderRepos(this.profile.fallbackRepos, 'fallback');
    this.renderFooter();
    this.updateAsciiUi(0, this.presetId, true);
  }

  getScopeCanvas() {
    return this.scopeCanvasEl;
  }

  setGlyphMode(modeId, presetId = this.presetId, timeSec = 0) {
    if (Object.prototype.hasOwnProperty.call(MODE_LABELS, modeId)) {
      this.glyphMode = modeId;
      this.avatarDirty = true;
    }
    this.presetId = presetId || this.presetId;

    for (const btn of this.inlineGlyphButtons) {
      const active = btn.dataset.inlineGlyph === this.glyphMode;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    }
    if (this.avatarBadgeEl) {
      this.avatarBadgeEl.textContent = this.avatarRawPinned ? 'RAW' : MODE_LABELS[this.glyphMode];
    }
    if (this.horizonModeTagEl) {
      this.horizonModeTagEl.textContent = `GLYPH:${MODE_LABELS[this.glyphMode]}`;
    }

    this.updateAsciiUi(timeSec, this.presetId, true);
  }

  renderConsole() {
    if (!this.consoleRoot) {
      return;
    }
    this.consoleRoot.textContent = '';

    const bar = createEl('div', 'pane-header');
    bar.appendChild(createEl('span', 'pane-title', '┌─ UNIT_01 // OPERATOR & ASCII_SCOPE'));
    bar.appendChild(createEl('span', 'pane-tag pane-tag--live', 'ONLINE'));
    this.consoleRoot.appendChild(bar);

    const body = createEl('div', 'console-body');

    const identityStrip = createEl('div', 'hero-id-strip');
    const avatarBtn = createEl('button', 'hero-avatar-frame');
    avatarBtn.type = 'button';
    avatarBtn.title = 'Click or hover to toggle raw avatar vs live ASCII portrait';
    avatarBtn.setAttribute('aria-pressed', 'false');

    this.avatarCanvasEl = document.createElement('canvas');
    this.avatarCanvasEl.className = 'hero-avatar-ascii';
    this.avatarCanvasEl.width = 160;
    this.avatarCanvasEl.height = 160;
    this.avatarCanvasEl.setAttribute('aria-hidden', 'true');
    this.avatarCtx = this.avatarCanvasEl.getContext('2d', { alpha: false });
    avatarBtn.appendChild(this.avatarCanvasEl);

    this.avatarBadgeEl = createEl('span', 'avatar-mode-tag', MODE_LABELS[this.glyphMode]);
    avatarBtn.appendChild(this.avatarBadgeEl);

    if (isSafeExternalUrl(this.profile.avatarUrl)) {
      const rawImg = document.createElement('img');
      rawImg.crossOrigin = 'anonymous';
      rawImg.src = this.profile.avatarUrl;
      rawImg.alt = `${this.profile.login} avatar`;
      rawImg.className = 'hero-avatar hero-avatar-raw';
      rawImg.width = 80;
      rawImg.height = 80;

      const sampleFromImg = () => {
        try {
          const scratch = document.createElement('canvas');
          scratch.width = AVATAR_COLS;
          scratch.height = AVATAR_ROWS;
          const sctx = scratch.getContext('2d');
          if (!sctx) return;
          sctx.drawImage(rawImg, 0, 0, AVATAR_COLS, AVATAR_ROWS);
          const imgData = sctx.getImageData(0, 0, AVATAR_COLS, AVATAR_ROWS);
          this.avatarPixels = {
            data: imgData.data,
            w: AVATAR_COLS,
            h: AVATAR_ROWS,
          };
          this.avatarDirty = true;
          this.drawAvatarCanvas(0);
        } catch {
          // Graceful fallback to procedural animated ASCII sigil if canvas sampling is restricted
          this.avatarPixels = null;
        }
      };

      if (rawImg.complete && rawImg.naturalWidth > 0) {
        sampleFromImg();
      } else {
        rawImg.addEventListener('load', sampleFromImg, { once: true });
      }
      rawImg.addEventListener(
        'error',
        () => {
          rawImg.remove();
          this.avatarPixels = null;
          this.avatarDirty = true;
        },
        { once: true },
      );
      avatarBtn.appendChild(rawImg);
    }

    avatarBtn.addEventListener('click', () => {
      this.avatarRawPinned = !this.avatarRawPinned;
      avatarBtn.classList.toggle('is-raw', this.avatarRawPinned);
      avatarBtn.setAttribute('aria-pressed', String(this.avatarRawPinned));
      if (this.avatarBadgeEl) {
        this.avatarBadgeEl.textContent = this.avatarRawPinned ? 'RAW' : MODE_LABELS[this.glyphMode];
      }
    });

    identityStrip.appendChild(avatarBtn);

    const metaStack = createEl('div', 'hero-meta-stack');
    metaStack.appendChild(
      createEl('span', 'hero-handle', `CALLSIGN // @${this.profile.login} · ${this.profile.pronouns.toUpperCase()}`),
    );
    metaStack.appendChild(
      createEl('span', 'hero-disciplines', this.profile.tagline.toUpperCase()),
    );
    metaStack.appendChild(
      createEl('span', 'hero-ascii-note', '[HOVER/TAP PORTRAIT → ASCII/RAW]'),
    );
    identityStrip.appendChild(metaStack);
    body.appendChild(identityStrip);

    const headingWrap = createEl('div', 'hero-name-wrap');
    headingWrap.appendChild(createEl('h1', 'hero-display-name', this.profile.displayName));
    headingWrap.appendChild(createEl('span', 'terminal-cursor', '█'));
    body.appendChild(headingWrap);
    body.appendChild(createEl('p', 'hero-statement', this.profile.bio));

    // Real-time ASCII/Math Oscilloscope Waveform + Spectral Energy Panel
    const scopePanel = createEl('div', 'scope-panel');
    const scopeBar = createEl('div', 'scope-bar');
    scopeBar.appendChild(createEl('span', 'scope-label', 'CH1 · ASCII WAVEFORM & FFT'));
    this.scopeStatsEl = createEl('span', 'scope-stats', 'PK 0.00 · RMS 0.00');
    scopeBar.appendChild(this.scopeStatsEl);
    scopePanel.appendChild(scopeBar);

    this.scopeCanvasEl = document.createElement('canvas');
    this.scopeCanvasEl.id = 'scope-canvas';
    this.scopeCanvasEl.className = 'scope-canvas';
    this.scopeCanvasEl.setAttribute('aria-label', 'Live ASCII mathematical waveform oscilloscope');
    scopePanel.appendChild(this.scopeCanvasEl);
    body.appendChild(scopePanel);

    // 2x2 Hardware Geometry Control Rack
    const rack = createEl('div', 'param-rack');
    for (const spec of SLIDER_SPECS) {
      const cell = createEl('div', 'param-cell');
      const head = createEl('div', 'param-cell__head');
      const labelEl = createEl('label', 'param-cell__name', spec.code);
      const inputId = `ctrl-${spec.key}`;
      labelEl.setAttribute('for', inputId);
      const valEl = createEl('span', 'param-cell__val', `${spec.def.toFixed(2)}${spec.unit}`);
      head.append(labelEl, valEl);

      const input = document.createElement('input');
      input.id = inputId;
      input.type = 'range';
      input.className = 'hw-slider';
      input.min = String(spec.min);
      input.max = String(spec.max);
      input.step = String(spec.step);
      input.value = String(spec.def);
      input.addEventListener('input', () => {
        const val = Number(input.value);
        valEl.textContent = `${val.toFixed(2)}${spec.unit}`;
        this.callbacks.onParamChange?.(spec.key, val);
      });

      this.sliderControls.set(spec.key, { input, valEl, unit: spec.unit });
      cell.append(head, input);
      rack.appendChild(cell);
    }
    body.appendChild(rack);

    // Action Comms Strip
    const linkGrid = createEl('nav', 'hero-links');
    linkGrid.setAttribute('aria-label', 'Social profiles');
    for (const s of this.profile.socials) {
      const isPrimary = s.label === 'GitHub';
      const cls = isPrimary ? 'grid-link grid-link--primary' : 'grid-link';
      linkGrid.appendChild(
        createSafeLink(s.url, cls, `[↗ ${s.label.toUpperCase()}]`, { allowMailto: s.allowMailto }),
      );
    }
    body.appendChild(linkGrid);

    this.consoleRoot.appendChild(body);
  }

  /**
   * Draws current colorized ASCII/Math/Binary portrait matrix onto `.hero-avatar-ascii`.
   * @param {number} [timeSec]
   */
  drawAvatarCanvas(timeSec = 0) {
    if (!this.avatarCtx || !this.avatarCanvasEl) {
      return;
    }
    const ctx = this.avatarCtx;
    const size = 160;
    if (this.avatarCanvasEl.width !== size || this.avatarCanvasEl.height !== size) {
      this.avatarCanvasEl.width = size;
      this.avatarCanvasEl.height = size;
    }

    const rows = this.avatarPixels
      ? sampleImagePixelsToAscii(
          this.avatarPixels.data,
          this.avatarPixels.w,
          this.avatarPixels.h,
          AVATAR_COLS,
          AVATAR_ROWS,
          this.glyphMode,
        )
      : generateFallbackSigilRows(AVATAR_COLS, AVATAR_ROWS, timeSec, this.glyphMode);

    ctx.fillStyle = '#020308';
    ctx.fillRect(0, 0, size, size);

    const cellW = size / AVATAR_COLS;
    const cellH = size / AVATAR_ROWS;
    ctx.font = "700 12px 'JetBrains Mono', ui-monospace, monospace";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let lastFill = '';
    for (let r = 0; r < rows.length; r++) {
      const cy = (r + 0.5) * cellH;
      const rowCells = rows[r];
      for (let c = 0; c < rowCells.length; c++) {
        const cell = rowCells[c];
        if (cell.css !== lastFill) {
          ctx.fillStyle = cell.css;
          lastFill = cell.css;
        }
        ctx.fillText(cell.ch, (c + 0.5) * cellW, cy);
      }
    }
    this.avatarDirty = false;
  }

  /**
   * Synchronizes hardware slider inputs (e.g. when RESET [R] restores defaults).
   * @param {Record<string, number>} values
   */
  syncSliderValues(values) {
    for (const [key, ctrl] of this.sliderControls.entries()) {
      const num = Number(values[key]);
      if (!Number.isFinite(num)) continue;
      ctrl.input.value = String(num);
      ctrl.valEl.textContent = `${num.toFixed(2)}${ctrl.unit}`;
    }
  }

  updateScopeReadout({ peak, rms }) {
    if (!this.scopeStatsEl) return;
    const text = `PK ${peak.toFixed(2)} · RMS ${rms.toFixed(2)}`;
    if (text === this.lastScopeStatsText) return;
    this.lastScopeStatsText = text;
    this.scopeStatsEl.textContent = text;
  }

  renderSectionsBase() {
    if (!this.sectionsRoot) {
      return;
    }
    this.sectionsRoot.textContent = '';
    this.inlineGlyphButtons = [];

    // Continuous ASCII Horizon Wave Divider + Inline Mode Sync Bar
    const horizonBand = createEl('div', 'ascii-horizon-band');
    this.horizonModeTagEl = createEl('span', 'horizon-tag', `GLYPH:${MODE_LABELS[this.glyphMode]}`);
    this.horizonStreamEl = createEl('pre', 'horizon-stream');
    this.horizonStreamEl.setAttribute('aria-hidden', 'true');

    const inlineSwitch = createEl('div', 'inline-glyph-switch');
    inlineSwitch.setAttribute('role', 'group');
    inlineSwitch.setAttribute('aria-label', 'Portfolio ASCII glyph mode switcher');

    for (const [modeId, label] of Object.entries(MODE_LABELS)) {
      const btn = createEl('button', 'inline-glyph-btn', `[${label}]`);
      btn.type = 'button';
      btn.dataset.inlineGlyph = modeId;
      const isActive = modeId === this.glyphMode;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-pressed', String(isActive));
      btn.addEventListener('click', () => {
        this.callbacks.onSelectGlyphMode?.(modeId);
      });
      this.inlineGlyphButtons.push(btn);
      inlineSwitch.appendChild(btn);
    }

    horizonBand.append(this.horizonModeTagEl, this.horizonStreamEl, inlineSwitch);
    this.sectionsRoot.appendChild(horizonBand);

    // 01 // Capability Matrix
    const indexSec = createEl('section', 'swiss-section');
    const indexBar = createEl('div', 'section-bar section-bar--matrix');
    const indexLeft = createEl('div', 'section-bar__left');
    indexLeft.appendChild(createEl('span', 'section-code', '┌─ 01 // CAPABILITY MATRIX'));

    const cmdWrap = createEl('div', 'cmd-filter-wrap');
    const cmdLabel = createEl('label', 'cmd-prompt', '> grep');
    cmdLabel.setAttribute('for', 'stack-grep-input');
    const cmdInput = document.createElement('input');
    cmdInput.id = 'stack-grep-input';
    cmdInput.type = 'search';
    cmdInput.className = 'cmd-input';
    cmdInput.placeholder = 'esp32, wireshark, docker...';
    cmdInput.autocomplete = 'off';
    cmdInput.spellcheck = false;
    cmdInput.setAttribute('aria-label', 'Filter engineering stack');
    cmdInput.addEventListener('input', () => {
      this.searchQuery = cmdInput.value.trim().toLowerCase();
      this.renderDomains(this.activeDomainId);
      this.updateAsciiUi(0, this.presetId, true);
    });
    cmdInput.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape' && cmdInput.value) {
        cmdInput.value = '';
        this.searchQuery = '';
        this.renderDomains(this.activeDomainId);
        this.updateAsciiUi(0, this.presetId, true);
      }
    });
    cmdWrap.append(cmdLabel, cmdInput);
    indexLeft.appendChild(cmdWrap);
    indexBar.appendChild(indexLeft);

    const filterRow = createEl('div', 'text-tabs');
    filterRow.setAttribute('role', 'tablist');
    filterRow.setAttribute('aria-label', 'Filter engineering domains');

    const totalCount = this.profile.techDomains.reduce((sum, d) => sum + d.items.length, 0);
    const allTab = createEl('button', 'text-tab is-active', `ALL (${totalCount})`);
    allTab.type = 'button';
    allTab.addEventListener('click', () => {
      this.renderDomains('all');
      this.updateAsciiUi(0, this.presetId, true);
    });
    this.domainButtons.set('all', allTab);
    filterRow.appendChild(allTab);

    const letters = ['A', 'B', 'C'];
    this.profile.techDomains.forEach((dom, i) => {
      const btn = createEl('button', 'text-tab', `${letters[i] || i + 1}. ${dom.label.toUpperCase()}`);
      btn.type = 'button';
      btn.addEventListener('click', () => {
        this.renderDomains(dom.id);
        this.updateAsciiUi(0, this.presetId, true);
      });
      this.domainButtons.set(dom.id, btn);
      filterRow.appendChild(btn);
    });

    indexBar.appendChild(filterRow);
    indexSec.appendChild(indexBar);

    this.indexGridEl = createEl('div', 'index-grid');
    indexSec.appendChild(this.indexGridEl);
    this.sectionsRoot.appendChild(indexSec);

    // 02 // Source Repositories Ledger
    const worksSec = createEl('section', 'swiss-section');
    const worksBar = createEl('div', 'section-bar');
    const worksLeft = createEl('div', 'section-bar__left');
    worksLeft.appendChild(createEl('span', 'section-code', '┌─ 02 // SOURCE REPOSITORIES'));
    this.reposStatusEl = createEl('span', 'status-tag', 'SNAPSHOT');
    worksLeft.appendChild(this.reposStatusEl);
    worksBar.appendChild(worksLeft);
    worksBar.appendChild(
      createSafeLink(
        this.profile.githubUrl,
        'text-link-upper',
        `ALL ${this.profile.stats.publicRepos} ON GITHUB ↗`,
      ),
    );
    worksSec.appendChild(worksBar);

    this.reposGridEl = createEl('div', 'ledger-grid');
    worksSec.appendChild(this.reposGridEl);
    this.sectionsRoot.appendChild(worksSec);
  }

  /**
   * Renders numbered capability columns with embedded live procedural ASCII telemetry boxes.
   * @param {string} domainId
   */
  renderDomains(domainId) {
    if (!this.indexGridEl) {
      return;
    }
    this.activeDomainId = domainId;
    for (const [id, btn] of this.domainButtons.entries()) {
      const active = id === domainId;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    }

    this.indexGridEl.textContent = '';
    this.domainWidgets = [];
    this.skillMeters = [];

    const isSingle = domainId !== 'all';
    const q = this.searchQuery;

    const list = (isSingle
      ? this.profile.techDomains.filter((d) => d.id === domainId)
      : this.profile.techDomains
    )
      .map((dom) => ({
        ...dom,
        filteredItems: q
          ? dom.items.filter((item) => item.toLowerCase().includes(q))
          : dom.items,
      }))
      .filter((dom) => !q || dom.filteredItems.length > 0);

    this.indexGridEl.classList.toggle('is-single', isSingle || list.length <= 1);

    if (list.length === 0) {
      this.indexGridEl.classList.add('is-single');
      this.indexGridEl.appendChild(
        createEl(
          'div',
          'index-empty',
          `NO MODULES MATCHING "${this.searchQuery.toUpperCase()}" · CLEAR INPUT OR PRESS ESC`,
        ),
      );
      return;
    }

    const codes = { embedded: 'MOD.01', security: 'MOD.02', systems: 'MOD.03' };

    for (const dom of list) {
      const col = createEl('article', 'index-col');

      const colHead = createEl('div', 'index-col__head');
      colHead.appendChild(createEl('span', 'index-col__code', `┌─ ${codes[dom.id] || 'MOD.00'}`));
      colHead.appendChild(
        createEl('span', 'index-col__count', `${String(dom.filteredItems.length).padStart(2, '0')} UNITS`),
      );
      col.appendChild(colHead);

      col.appendChild(createEl('h2', 'index-col__title', dom.label));
      col.appendChild(createEl('p', 'index-col__sub', dom.subtitle));

      const asciiBox = createEl('pre', `ascii-widget ascii-widget--domain ascii-widget--${dom.id}`);
      asciiBox.setAttribute('aria-hidden', 'true');
      col.appendChild(asciiBox);
      this.domainWidgets.push({ el: asciiBox, domainId: dom.id, lastText: '' });

      const ul = createEl('ul', 'index-list');
      const totalItems = dom.filteredItems.length;
      dom.filteredItems.forEach((item, idx) => {
        const li = createEl('li', 'index-list__item');
        const treePrefix = idx === totalItems - 1 ? '└─' : '├─';
        const meterEl = createEl('span', 'index-list__meter', '');
        meterEl.setAttribute('aria-hidden', 'true');
        li.append(
          createEl('span', 'index-list__tree', treePrefix),
          createEl('span', 'index-list__num', String(idx + 1).padStart(2, '0')),
          createEl('span', 'index-list__name', item),
          meterEl,
        );
        this.skillMeters.push({ el: meterEl, idx, total: totalItems, lastText: '' });
        ul.appendChild(li);
      });
      col.appendChild(ul);
      this.indexGridEl.appendChild(col);
    }
  }

  /**
   * Renders repositories with deterministic procedural ASCII wave/lattice blueprints.
   * @param {Array<any>} repos
   * @param {'live' | 'fallback'} source
   */
  renderRepos(repos, source) {
    if (!this.reposGridEl) {
      return;
    }
    this.repoSource = source;
    this.repoCount = repos.length;
    this.reposStatusEl.textContent = source === 'live' ? 'GITHUB API · LIVE' : 'SNAPSHOT';
    this.reposGridEl.textContent = '';
    this.repoWidgets = [];

    repos.forEach((repo, idx) => {
      const cell = createEl('article', 'ledger-cell');

      const head = createEl('div', 'ledger-cell__head');
      const idRow = createEl('div', 'ledger-cell__id');
      idRow.appendChild(createEl('span', 'ledger-num', `┌─ REPO_${String(idx + 1).padStart(2, '0')}`));
      idRow.appendChild(createSafeLink(repo.htmlUrl, 'ledger-name', repo.name));
      head.appendChild(idRow);

      const langWrap = createEl('span', 'ledger-lang');
      const sq = createEl('span', 'lang-square');
      sq.style.backgroundColor = LANGUAGE_COLORS[repo.language] || LANGUAGE_COLORS.Code;
      langWrap.append(sq, createEl('span', '', repo.language));
      head.appendChild(langWrap);
      cell.appendChild(head);

      const asciiArtEl = createEl('pre', 'ascii-widget ascii-widget--repo');
      asciiArtEl.setAttribute('aria-hidden', 'true');
      cell.appendChild(asciiArtEl);
      this.repoWidgets.push({
        el: asciiArtEl,
        name: repo.name,
        language: repo.language,
        stars: repo.stars,
        lastText: '',
        colorApplied: false,
      });

      const summary = repo.description || `Public ${repo.language} source repository on GitHub.`;
      cell.appendChild(createEl('p', 'ledger-desc', summary));

      const foot = createEl('div', 'ledger-cell__foot');
      foot.appendChild(createEl('span', 'ledger-stars', `└─ ★ ${String(repo.stars).padStart(2, '0')}`));

      const links = createEl('div', 'ledger-links');
      links.appendChild(createSafeLink(repo.htmlUrl, 'ledger-link', '[SOURCE ↗]'));
      if (repo.homepage) {
        links.appendChild(createSafeLink(repo.homepage, 'ledger-link ledger-link--live', '[LIVE ↗]'));
      }
      foot.appendChild(links);
      cell.appendChild(foot);

      this.reposGridEl.appendChild(cell);
    });

    this.updateAsciiUi(0, this.presetId, true);
  }

  /**
   * Throttled (~9Hz) update pass syncing every DOM ASCII banner, widget, skill meter,
   * avatar fallback sigil, and footer prompt without layout reflow.
   *
   * @param {number} timeSec
   * @param {string} [presetId]
   * @param {boolean} [force]
   */
  updateAsciiUi(timeSec = 0, presetId = this.presetId, force = false) {
    this.presetId = presetId || this.presetId;

    if (this.avatarDirty || !this.avatarPixels) {
      if (force || !this.avatarPixels) {
        this.drawAvatarCanvas(timeSec);
      }
    }

    const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (!force && nowMs - this.lastAsciiUiMs < 115) {
      return;
    }
    this.lastAsciiUiMs = nowMs;

    const mode = this.glyphMode;
    if (this.horizonStreamEl) {
      const nextHorizon = generateHorizonBanner(88, timeSec, mode);
      if (this.horizonStreamEl.textContent !== nextHorizon) {
        this.horizonStreamEl.textContent = nextHorizon;
      }
    }

    for (const widget of this.domainWidgets) {
      const nextText = generateDomainBanner(widget.domainId, timeSec, mode).join('\n');
      if (nextText !== widget.lastText) {
        widget.lastText = nextText;
        widget.el.textContent = nextText;
      }
    }

    for (const meter of this.skillMeters) {
      const nextMeter = formatSkillMeter(meter.idx, meter.total, timeSec, mode);
      if (nextMeter !== meter.lastText) {
        meter.lastText = nextMeter;
        meter.el.textContent = nextMeter;
      }
    }

    for (const rw of this.repoWidgets) {
      const preview = generateRepoAsciiPreview(rw.name, rw.language, rw.stars, timeSec, mode);
      const nextText = preview.lines.join('\n');
      if (!rw.colorApplied) {
        rw.el.style.color = preview.accentCss;
        rw.colorApplied = true;
      }
      if (nextText !== rw.lastText) {
        rw.lastText = nextText;
        rw.el.textContent = nextText;
      }
    }

    if (this.footerCliEl) {
      const nextCli = `${this.profile.login.toLowerCase()}@github.io:~$ ./ascii-portfolio --glyph=${MODE_LABELS[mode]} --scene=${this.presetId.toUpperCase()} --nodes=${this.repoCount}`;
      if (this.footerCliEl.textContent !== nextCli) {
        this.footerCliEl.textContent = nextCli;
      }
    }
  }

  renderFooter() {
    if (!this.footerRoot) {
      return;
    }
    this.footerRoot.textContent = '';
    this.footerCliEl = createEl(
      'span',
      'colophon-item colophon-cli',
      `${this.profile.login.toLowerCase()}@github.io:~$ ./ascii-portfolio --glyph=${MODE_LABELS[this.glyphMode]} --scene=${this.presetId.toUpperCase()}`,
    );
    this.footerRoot.appendChild(this.footerCliEl);
    this.footerRoot.appendChild(
      createEl(
        'span',
        'colophon-item colophon-item--mid',
        `${this.profile.stats.publicRepos} REPOS · ${this.profile.stats.followers} FOLLOWER`,
      ),
    );
    this.footerRoot.appendChild(
      createSafeLink(this.profile.githubUrl, 'colophon-item colophon-link', '[KH4NHTU0N9.GITHUB.IO ↗]'),
    );
  }
}
