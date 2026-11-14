import { LANGUAGE_COLORS, PROFILE_DATA, isSafeExternalUrl } from '../data/profile.js?v=gcs22';

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

/**
 * Renders the Hardware Cockpit Operator Console (ID, real-time oscilloscope canvas,
 * live geometry sliders), searchable Capability Matrix, and Source Repository Ledger.
 */
export class ProfileView {
  /**
   * @param {{ consoleRoot: HTMLElement, sectionsRoot: HTMLElement, footerRoot: HTMLElement }} roots
   * @param {typeof PROFILE_DATA} [profile]
   * @param {{ onParamChange?: (key: string, val: number) => void }} [callbacks]
   */
  constructor({ consoleRoot, heroRoot, sectionsRoot, footerRoot } = {}, profile = PROFILE_DATA, callbacks = {}) {
    this.consoleRoot = consoleRoot || heroRoot || null;
    this.sectionsRoot = sectionsRoot || null;
    this.footerRoot = footerRoot || null;
    this.profile = profile;
    this.callbacks = callbacks;

    this.activeDomainId = 'all';
    this.searchQuery = '';
    this.domainButtons = new Map();
    this.sliderControls = new Map();
    this.scopeCanvasEl = null;
    this.scopeStatsEl = null;
    this.indexGridEl = null;
    this.reposGridEl = null;
    this.reposStatusEl = null;
    this.lastScopeStatsText = '';

    this.renderConsole();
    this.renderSectionsBase();
    this.renderDomains('all');
    this.renderRepos(this.profile.fallbackRepos, 'fallback');
    this.renderFooter();
  }

  getScopeCanvas() {
    return this.scopeCanvasEl;
  }

  renderConsole() {
    if (!this.consoleRoot) {
      return;
    }
    this.consoleRoot.textContent = '';

    const bar = createEl('div', 'pane-header');
    bar.appendChild(createEl('span', 'pane-title', 'UNIT_01 // OPERATOR & SIGNAL_SCOPE'));
    bar.appendChild(createEl('span', 'pane-tag pane-tag--live', 'NOMINAL'));
    this.consoleRoot.appendChild(bar);

    const body = createEl('div', 'console-body');

    const identityStrip = createEl('div', 'hero-id-strip');
    if (isSafeExternalUrl(this.profile.avatarUrl)) {
      const avatarFrame = createEl('div', 'hero-avatar-frame');
      const avatar = document.createElement('img');
      avatar.src = this.profile.avatarUrl;
      avatar.alt = `${this.profile.login} avatar`;
      avatar.className = 'hero-avatar';
      avatar.width = 58;
      avatar.height = 58;
      avatar.addEventListener(
        'error',
        () => {
          avatarFrame.remove();
        },
        { once: true },
      );
      avatarFrame.appendChild(avatar);
      identityStrip.appendChild(avatarFrame);
    }

    const metaStack = createEl('div', 'hero-meta-stack');
    metaStack.appendChild(
      createEl('span', 'hero-handle', `CALLSIGN // @${this.profile.login} · ${this.profile.pronouns.toUpperCase()}`),
    );
    metaStack.appendChild(
      createEl('span', 'hero-disciplines', this.profile.tagline.toUpperCase()),
    );
    identityStrip.appendChild(metaStack);
    body.appendChild(identityStrip);

    body.appendChild(createEl('h1', 'hero-display-name', this.profile.displayName));
    body.appendChild(createEl('p', 'hero-statement', this.profile.bio));

    // Real-time Oscilloscope Waveform + Spectral Energy Panel
    const scopePanel = createEl('div', 'scope-panel');
    const scopeBar = createEl('div', 'scope-bar');
    scopeBar.appendChild(createEl('span', 'scope-label', 'CH1 · Y(x,t) WAVEFORM & SPECTRUM'));
    this.scopeStatsEl = createEl('span', 'scope-stats', 'PK 0.00 · RMS 0.00');
    scopeBar.appendChild(this.scopeStatsEl);
    scopePanel.appendChild(scopeBar);

    this.scopeCanvasEl = document.createElement('canvas');
    this.scopeCanvasEl.id = 'scope-canvas';
    this.scopeCanvasEl.className = 'scope-canvas';
    this.scopeCanvasEl.setAttribute('aria-label', 'Live mathematical waveform oscilloscope');
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
        createSafeLink(s.url, cls, `${s.label.toUpperCase()} ↗`, { allowMailto: s.allowMailto }),
      );
    }
    body.appendChild(linkGrid);

    this.consoleRoot.appendChild(body);
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

    // 01 // Capability Matrix
    const indexSec = createEl('section', 'swiss-section');
    const indexBar = createEl('div', 'section-bar section-bar--matrix');
    const indexLeft = createEl('div', 'section-bar__left');
    indexLeft.appendChild(createEl('span', 'section-code', '01 // CAPABILITY MATRIX'));

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
    });
    cmdInput.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape' && cmdInput.value) {
        cmdInput.value = '';
        this.searchQuery = '';
        this.renderDomains(this.activeDomainId);
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
    allTab.addEventListener('click', () => this.renderDomains('all'));
    this.domainButtons.set('all', allTab);
    filterRow.appendChild(allTab);

    const letters = ['A', 'B', 'C'];
    this.profile.techDomains.forEach((dom, i) => {
      const btn = createEl('button', 'text-tab', `${letters[i] || i + 1}. ${dom.label.toUpperCase()}`);
      btn.type = 'button';
      btn.addEventListener('click', () => this.renderDomains(dom.id));
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
    worksLeft.appendChild(createEl('span', 'section-code', '02 // SOURCE REPOSITORIES'));
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
   * Renders clean numbered hardware-spec capability columns, supporting live grep filtering.
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
      colHead.appendChild(createEl('span', 'index-col__code', codes[dom.id] || 'MOD.00'));
      colHead.appendChild(
        createEl('span', 'index-col__count', `${String(dom.filteredItems.length).padStart(2, '0')} UNITS`),
      );
      col.appendChild(colHead);

      col.appendChild(createEl('h2', 'index-col__title', dom.label));
      col.appendChild(createEl('p', 'index-col__sub', dom.subtitle));

      const ul = createEl('ul', 'index-list');
      dom.filteredItems.forEach((item, idx) => {
        const li = createEl('li', 'index-list__item');
        li.append(
          createEl('span', 'index-list__num', String(idx + 1).padStart(2, '0')),
          createEl('span', 'index-list__name', item),
        );
        ul.appendChild(li);
      });
      col.appendChild(ul);
      this.indexGridEl.appendChild(col);
    }
  }

  /**
   * Renders selected repositories into a clean 2-column hardware specification ledger.
   * @param {Array<any>} repos
   * @param {'live' | 'fallback'} source
   */
  renderRepos(repos, source) {
    if (!this.reposGridEl) {
      return;
    }
    this.reposStatusEl.textContent = source === 'live' ? 'GITHUB API · LIVE' : 'SNAPSHOT';
    this.reposGridEl.textContent = '';

    repos.forEach((repo, idx) => {
      const cell = createEl('article', 'ledger-cell');

      const head = createEl('div', 'ledger-cell__head');
      const idRow = createEl('div', 'ledger-cell__id');
      idRow.appendChild(createEl('span', 'ledger-num', `REPO_${String(idx + 1).padStart(2, '0')}`));
      idRow.appendChild(createSafeLink(repo.htmlUrl, 'ledger-name', repo.name));
      head.appendChild(idRow);

      const langWrap = createEl('span', 'ledger-lang');
      const sq = createEl('span', 'lang-square');
      sq.style.backgroundColor = LANGUAGE_COLORS[repo.language] || LANGUAGE_COLORS.Code;
      langWrap.append(sq, createEl('span', '', repo.language));
      head.appendChild(langWrap);
      cell.appendChild(head);

      const summary = repo.description || `Public ${repo.language} source repository on GitHub.`;
      cell.appendChild(createEl('p', 'ledger-desc', summary));

      const foot = createEl('div', 'ledger-cell__foot');
      foot.appendChild(createEl('span', 'ledger-stars', `★ ${String(repo.stars).padStart(2, '0')}`));

      const links = createEl('div', 'ledger-links');
      links.appendChild(createSafeLink(repo.htmlUrl, 'ledger-link', '[SOURCE ↗]'));
      if (repo.homepage) {
        links.appendChild(createSafeLink(repo.homepage, 'ledger-link ledger-link--live', '[LIVE ↗]'));
      }
      foot.appendChild(links);
      cell.appendChild(foot);

      this.reposGridEl.appendChild(cell);
    });
  }

  renderFooter() {
    if (!this.footerRoot) {
      return;
    }
    this.footerRoot.textContent = '';
    this.footerRoot.appendChild(
      createEl('span', 'colophon-item', `${this.profile.login} // GCS.MK2 · VANILLA-ESM`),
    );
    this.footerRoot.appendChild(
      createEl(
        'span',
        'colophon-item colophon-item--mid',
        `${this.profile.stats.publicRepos} REPOS · ${this.profile.stats.followers} FOLLOWER`,
      ),
    );
    this.footerRoot.appendChild(
      createSafeLink(this.profile.githubUrl, 'colophon-item colophon-link', 'KH4NHTU0N9.GITHUB.IO ↗'),
    );
  }
}
