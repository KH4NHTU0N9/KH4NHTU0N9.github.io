import {
  LANGUAGE_COLORS,
  PROFILE_DATA,
  TOOL_APPLICATIONS,
  isSafeExternalUrl,
} from '../data/profile.js?v=gcs26';
import { generateFallbackSigilRows, sampleImagePixelsToAscii } from '../math/asciiArt.js?v=gcs26';

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

const DOMAIN_ORDER = ['security', 'embedded', 'systems'];
const DOMAIN_CODES = {
  security: 'MOD.01',
  embedded: 'MOD.02',
  systems: 'MOD.03',
};

const MODE_LABELS = {
  math: 'MATH',
  ascii: 'ASCII',
  binary: 'BIN',
};

const AVATAR_COLS = 16;
const AVATAR_ROWS = 10;

/**
 * Renders the Information Security Student portfolio console, Experience & Lab Log,
 * curated Tooling Matrix with interactive grep, pinned Source Repositories, Printable
 * Resume/CV modal, and Interactive Mini-CLI Footer.
 */
export class ProfileView {
  /**
   * @param {{ consoleRoot?: HTMLElement, heroRoot?: HTMLElement, sectionsRoot?: HTMLElement, footerRoot?: HTMLElement, cvModalRoot?: HTMLElement }} roots
   * @param {typeof PROFILE_DATA} [profile]
   * @param {{ onCliCommand?: (rawCmd: string) => { clear?: boolean, lines?: string[] } }} [callbacks]
   */
  constructor(
    { consoleRoot, heroRoot, sectionsRoot, footerRoot, cvModalRoot } = {},
    profile = PROFILE_DATA,
    callbacks = {},
  ) {
    this.consoleRoot = consoleRoot || heroRoot || null;
    this.sectionsRoot = sectionsRoot || null;
    this.footerRoot = footerRoot || null;
    this.cvModalRoot = cvModalRoot || null;
    this.profile = profile;
    this.callbacks = callbacks;

    this.activeDomainId = 'all';
    this.searchQuery = '';
    this.glyphMode = 'math';
    this.presetId = 'mesh';
    this.repoSource = 'fallback';
    this.activeRepos = [...this.profile.fallbackRepos];
    this.repoCount = this.activeRepos.length;

    this.domainButtons = new Map();
    this.avatarCanvasEl = null;
    this.avatarCtx = null;
    this.avatarPixels = null;
    this.avatarRawPinned = false;
    this.avatarBadgeEl = null;

    this.cmdWrapEl = null;
    this.cmdInputEl = null;
    this.cmdClearBtnEl = null;
    this.indexGridEl = null;
    this.reposGridEl = null;
    this.reposStatusEl = null;

    this.cliFormEl = null;
    this.cliInputEl = null;
    this.cliOutputEl = null;
    this.cliStatusEl = null;
    this.cliHistory = [];
    this.cliHistoryIdx = -1;

    this.cvTriggerEl = null;
    this.cvOpenerEl = null;
    this.cvCloseBtnEl = null;

    this.renderConsole();
    this.renderSectionsBase();
    this.renderDomains('all');
    this.renderRepos(this.activeRepos, 'fallback');
    this.renderFooter();
    this.renderCvModal();
    this.drawAvatarCanvas(0);
  }

  getOrderedDomains() {
    const orderRank = new Map(DOMAIN_ORDER.map((id, i) => [id, i]));
    return [...(this.profile.techDomains || [])].sort(
      (a, b) => (orderRank.get(a.id) ?? 99) - (orderRank.get(b.id) ?? 99),
    );
  }

  buildFocusEntries() {
    const byId = new Map((this.profile.techDomains || []).map((d) => [d.id, d]));
    const secItems = byId.get('security')?.items || [];
    const embItems = byId.get('embedded')?.items || [];
    const sysItems = byId.get('systems')?.items || [];

    const pickVerified = (pool, preferred, limit = 4) => {
      const picked = preferred.filter((item) => pool.includes(item));
      return (picked.length > 0 ? picked : pool).slice(0, limit);
    };

    const dfirTools = pickVerified(secItems, [
      'Kali Linux',
      'Wireshark',
      'Binwalk',
      'The Sleuth Kit',
    ]);
    const hwTools = pickVerified(embItems, ['RTL8720DN', 'ESP32', 'Embedded C', 'Betaflight']);
    const sysTools = pickVerified(sysItems, ['Python', 'TypeScript', 'GNU Bash', 'Docker']);

    return [
      { key: 'dfir/', value: dfirTools.join(' · ') },
      { key: 'rf_mcu/', value: hwTools.join(' · ') },
      { key: 'systems/', value: sysTools.join(' · ') },
    ];
  }

  setGlyphMode(modeId, presetId = this.presetId, timeSec = 0) {
    if (Object.prototype.hasOwnProperty.call(MODE_LABELS, modeId)) {
      this.glyphMode = modeId;
    }
    if (presetId) {
      this.presetId = presetId;
    }
    if (this.avatarBadgeEl && !this.avatarRawPinned) {
      this.avatarBadgeEl.textContent = MODE_LABELS[this.glyphMode];
    }
    this.drawAvatarCanvas(timeSec);
    this.syncCliStateBanner();
  }

  setPreset(presetId) {
    if (presetId) {
      this.presetId = presetId;
      this.syncCliStateBanner();
    }
  }

  setGrepQuery(rawQuery) {
    const normalized = String(rawQuery || '').trim().toLowerCase();
    this.searchQuery = normalized;
    if (this.cmdInputEl) {
      this.cmdInputEl.value = normalized;
    }
    this.syncGrepUi();
    this.renderDomains(this.activeDomainId);
  }

  syncGrepUi() {
    const hasText = Boolean(this.cmdInputEl?.value);
    if (this.cmdWrapEl) {
      this.cmdWrapEl.classList.toggle('has-query', hasText);
    }
    if (this.cmdClearBtnEl) {
      this.cmdClearBtnEl.hidden = !hasText;
    }
  }

  renderConsole() {
    if (!this.consoleRoot) {
      return;
    }
    this.consoleRoot.textContent = '';

    const header = createEl('div', 'pane-header');
    header.appendChild(createEl('span', 'pane-title', `~/${this.profile.login.toLowerCase()} $ whoami`));
    header.appendChild(createEl('span', 'pane-tag', 'INFOSEC // STUDENT'));
    this.consoleRoot.appendChild(header);

    const body = createEl('div', 'console-body');

    const identityStrip = createEl('div', 'hero-id-strip');
    const avatarBtn = createEl('button', 'avatar-toggle');
    avatarBtn.type = 'button';
    avatarBtn.setAttribute('aria-pressed', 'false');
    avatarBtn.setAttribute('aria-label', 'Toggle portrait between ASCII glyph art and raw photo');

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
          this.drawAvatarCanvas(0);
        } catch {
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
          this.drawAvatarCanvas(0);
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
      createEl('span', 'hero-handle', `OPERATOR // @${this.profile.login} · ${this.profile.pronouns.toUpperCase()}`),
    );
    metaStack.appendChild(createEl('span', 'hero-disciplines', this.profile.tagline.toUpperCase()));
    metaStack.appendChild(createEl('span', 'hero-ascii-note', '[HOVER/TAP PORTRAIT → ASCII/RAW]'));
    identityStrip.appendChild(metaStack);
    body.appendChild(identityStrip);

    const headingWrap = createEl('div', 'hero-name-wrap');
    headingWrap.appendChild(createEl('h1', 'hero-display-name', this.profile.displayName));
    headingWrap.appendChild(createEl('span', 'terminal-cursor', '█'));
    body.appendChild(headingWrap);
    body.appendChild(createEl('p', 'hero-statement', this.profile.bio));

    const focusTree = createEl('div', 'focus-tree');
    focusTree.setAttribute('role', 'region');
    focusTree.setAttribute('aria-label', 'Information security focus areas');

    const focusHead = createEl('div', 'focus-tree__head');
    focusHead.appendChild(createEl('span', 'focus-root', 'focus/'));
    focusHead.appendChild(createEl('span', 'focus-meta', `${this.profile.stats.publicRepos} PUBLIC REPOS`));
    focusTree.appendChild(focusHead);

    const focusEntries = this.buildFocusEntries();
    focusEntries.forEach((entry, idx) => {
      const row = createEl('div', 'focus-row');
      const branch = idx === focusEntries.length - 1 ? '└─' : '├─';
      row.append(
        createEl('span', 'focus-branch', branch),
        createEl('span', 'focus-key', entry.key),
        createEl('span', 'focus-val', entry.value),
      );
      focusTree.appendChild(row);
    });
    body.appendChild(focusTree);

    const linkGrid = createEl('nav', 'hero-links');
    linkGrid.setAttribute('aria-label', 'Resume and external contact links');

    const cvBtn = createEl('button', 'grid-link grid-link--primary', '[↓ RESUME / CV]');
    cvBtn.id = 'open-cv-btn';
    cvBtn.type = 'button';
    cvBtn.addEventListener('click', () => this.openCvModal(cvBtn));
    this.cvTriggerEl = cvBtn;
    linkGrid.appendChild(cvBtn);

    for (const s of this.profile.socials) {
      const cls = s.label === 'GitHub' ? 'grid-link grid-link--accent' : 'grid-link';
      linkGrid.appendChild(
        createSafeLink(s.url, cls, `[↗ ${s.label.toUpperCase()}]`, { allowMailto: s.allowMailto }),
      );
    }
    body.appendChild(linkGrid);

    this.consoleRoot.appendChild(body);
  }

  /**
   * Draws crisp ASCII/Math/Binary portrait matrix onto `.hero-avatar-ascii`.
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
  }

  renderSectionsBase() {
    if (!this.sectionsRoot) {
      return;
    }
    this.sectionsRoot.textContent = '';

    // 01 // Experience & Lab Log (verified builds + open CTF/Cert slot)
    const logSec = createEl('section', 'swiss-section');
    logSec.id = 'experience-log';
    const logBar = createEl('div', 'section-bar');
    const logLeft = createEl('div', 'section-bar__left');
    logLeft.appendChild(createEl('span', 'section-code', '┌─ 01 // EXPERIENCE & LAB LOG'));
    logLeft.appendChild(createEl('span', 'status-tag', 'VERIFIED TRACK · JOURNAL'));
    logBar.appendChild(logLeft);
    logBar.appendChild(createEl('span', 'section-meta', 'SRC: GITHUB REPO HISTORY'));
    logSec.appendChild(logBar);

    const logList = createEl('div', 'log-list');
    for (const entry of this.profile.technicalLog || []) {
      const isOpenSlot = entry.id.startsWith('SLOT');
      const row = createEl('article', isOpenSlot ? 'log-entry log-entry--slot' : 'log-entry');

      const meta = createEl('div', 'log-entry__meta');
      meta.appendChild(createEl('span', 'log-entry__id', `[${entry.id}]`));
      meta.appendChild(createEl('span', 'log-entry__tag', entry.tag));
      meta.appendChild(createEl('span', 'log-entry__scope', entry.scope));

      const detail = createEl('div', 'log-entry__body');
      detail.appendChild(createEl('h2', 'log-entry__title', entry.title));
      detail.appendChild(createEl('p', 'log-entry__summary', entry.summary));

      row.append(meta, detail);
      logList.appendChild(row);
    }
    logSec.appendChild(logList);
    this.sectionsRoot.appendChild(logSec);

    // 02 // Tooling & Capabilities Matrix (curated core tools by application)
    const indexSec = createEl('section', 'swiss-section');
    indexSec.id = 'tooling-matrix';
    const indexBar = createEl('div', 'section-bar');
    const indexLeft = createEl('div', 'section-bar__left');
    indexLeft.appendChild(createEl('span', 'section-code', '┌─ 02 // TOOLING & CAPABILITIES'));

    this.cmdWrapEl = createEl('div', 'cmd-filter-wrap');
    const cmdLabel = createEl('label', 'cmd-prompt', '> grep');
    cmdLabel.setAttribute('for', 'stack-grep-input');

    const cmdInput = document.createElement('input');
    cmdInput.id = 'stack-grep-input';
    cmdInput.type = 'search';
    cmdInput.className = 'cmd-input';
    cmdInput.placeholder = 'wireshark, binwalk, esp32...';
    cmdInput.autocomplete = 'off';
    cmdInput.spellcheck = false;
    cmdInput.setAttribute('aria-label', 'Filter engineering and security tools');
    this.cmdInputEl = cmdInput;

    const cmdCursor = createEl('span', 'cmd-cursor', '_');
    cmdCursor.setAttribute('aria-hidden', 'true');

    const cmdClearBtn = createEl('button', 'cmd-clear-btn', '[ESC / CLEAR]');
    cmdClearBtn.type = 'button';
    cmdClearBtn.hidden = true;
    cmdClearBtn.setAttribute('aria-label', 'Clear tooling filter');
    this.cmdClearBtnEl = cmdClearBtn;

    const clearQuery = () => {
      cmdInput.value = '';
      this.searchQuery = '';
      this.syncGrepUi();
      this.renderDomains(this.activeDomainId);
      cmdInput.focus();
    };

    cmdClearBtn.addEventListener('click', clearQuery);
    cmdInput.addEventListener('input', () => {
      this.searchQuery = cmdInput.value.trim().toLowerCase();
      this.syncGrepUi();
      this.renderDomains(this.activeDomainId);
    });
    cmdInput.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape' && cmdInput.value) {
        ev.preventDefault();
        clearQuery();
      }
    });

    this.cmdWrapEl.append(cmdLabel, cmdCursor, cmdInput, cmdClearBtn);
    indexLeft.appendChild(this.cmdWrapEl);
    indexBar.appendChild(indexLeft);

    const filterRow = createEl('div', 'text-tabs');
    filterRow.setAttribute('role', 'tablist');
    filterRow.setAttribute('aria-label', 'Filter tooling domains');

    const orderedDomains = this.getOrderedDomains();
    const totalCount = orderedDomains.reduce((sum, d) => sum + d.items.length, 0);
    const allTab = createEl('button', 'text-tab is-active', `CORE STACK (${totalCount})`);
    allTab.type = 'button';
    allTab.addEventListener('click', () => {
      this.renderDomains('all');
    });
    this.domainButtons.set('all', allTab);
    filterRow.appendChild(allTab);

    orderedDomains.forEach((dom) => {
      const btn = createEl('button', 'text-tab', dom.label.toUpperCase());
      btn.type = 'button';
      btn.addEventListener('click', () => {
        this.renderDomains(dom.id);
      });
      this.domainButtons.set(dom.id, btn);
      filterRow.appendChild(btn);
    });

    indexBar.appendChild(filterRow);
    indexSec.appendChild(indexBar);

    this.indexGridEl = createEl('div', 'index-grid');
    indexSec.appendChild(this.indexGridEl);
    this.sectionsRoot.appendChild(indexSec);

    // 03 // Pinned Source Repositories Ledger
    const worksSec = createEl('section', 'swiss-section');
    worksSec.id = 'source-repos';
    const worksBar = createEl('div', 'section-bar');
    const worksLeft = createEl('div', 'section-bar__left');
    worksLeft.appendChild(createEl('span', 'section-code', '┌─ 03 // SOURCE REPOSITORIES'));
    this.reposStatusEl = createEl('span', 'status-tag', 'PINNED · SNAPSHOT');
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
   * Renders curated tooling columns labeled by practical domain focus & role.
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
    const ordered = this.getOrderedDomains();

    const list = (isSingle ? ordered.filter((d) => d.id === domainId) : ordered)
      .map((dom) => ({
        ...dom,
        filteredItems: q
          ? dom.items.filter((item) => {
              const role = TOOL_APPLICATIONS[item] || '';
              return item.toLowerCase().includes(q) || role.toLowerCase().includes(q);
            })
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
          `NO TOOLS MATCHING "${this.searchQuery.toUpperCase()}" · CLICK [ESC / CLEAR]`,
        ),
      );
      return;
    }

    for (const dom of list) {
      const col = createEl('article', 'index-col');

      const colHead = createEl('div', 'index-col__head');
      colHead.appendChild(createEl('span', 'index-col__code', `┌─ ${DOMAIN_CODES[dom.id] || 'MOD.00'}`));
      colHead.appendChild(createEl('span', 'index-col__count', dom.focusTier || 'FOCUS TRACK'));
      col.appendChild(colHead);

      col.appendChild(createEl('h2', 'index-col__title', dom.label));
      col.appendChild(createEl('p', 'index-col__sub', dom.subtitle));

      const ul = createEl('ul', 'index-list');
      const totalItems = dom.filteredItems.length;
      dom.filteredItems.forEach((item, idx) => {
        const li = createEl('li', 'index-list__item');
        const treePrefix = idx === totalItems - 1 ? '└─' : '├─';
        const role = TOOL_APPLICATIONS[item] || 'Core Tooling';
        li.append(
          createEl('span', 'index-list__tree', treePrefix),
          createEl('span', 'index-list__name', item),
          createEl('span', 'index-list__role', role),
        );
        ul.appendChild(li);
      });
      col.appendChild(ul);
      this.indexGridEl.appendChild(col);
    }
  }

  /**
   * Renders curated, pinned repositories with verified technical summaries.
   * @param {Array<any>} repos
   * @param {'live' | 'fallback'} source
   */
  renderRepos(repos, source) {
    if (!this.reposGridEl) {
      return;
    }
    this.repoSource = source;
    this.activeRepos = [...repos];
    this.repoCount = repos.length;
    this.reposStatusEl.textContent = source === 'live' ? 'PINNED · GITHUB LIVE' : 'PINNED · SNAPSHOT';
    this.reposGridEl.textContent = '';

    repos.forEach((repo, idx) => {
      const cell = createEl('article', 'ledger-cell');

      const head = createEl('div', 'ledger-cell__head');
      const idRow = createEl('div', 'ledger-cell__id');
      idRow.appendChild(createEl('span', 'ledger-num', `┌─ PIN_${String(idx + 1).padStart(2, '0')}`));
      idRow.appendChild(createSafeLink(repo.htmlUrl, 'ledger-name', repo.name));
      head.appendChild(idRow);

      const langWrap = createEl('span', 'ledger-lang');
      const sq = createEl('span', 'lang-square');
      sq.style.backgroundColor = LANGUAGE_COLORS[repo.language] || LANGUAGE_COLORS.Code;
      langWrap.append(sq, createEl('span', '', repo.language));
      head.appendChild(langWrap);
      cell.appendChild(head);

      const summary = repo.description || `Public ${repo.language} engineering repository on GitHub.`;
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

    this.syncCliStateBanner();
    this.renderCvModal();
  }

  /**
   * Builds and updates the accessible Printable Resume / CV Preview modal strictly
   * from verified profile & repository data.
   */
  renderCvModal() {
    if (!this.cvModalRoot) {
      return;
    }
    const wasOpen = !this.cvModalRoot.hidden;
    this.cvModalRoot.textContent = '';

    const backdrop = createEl('div', 'cv-modal__backdrop');
    backdrop.addEventListener('click', () => this.closeCvModal());

    const panel = createEl('div', 'cv-modal__panel');
    const toolbar = createEl('div', 'cv-modal__toolbar');
    toolbar.appendChild(createEl('span', 'cv-modal__label', 'RESUME // PRINTABLE DOSSIER (PDF READY)'));

    const actions = createEl('div', 'cv-modal__actions');
    const printBtn = createEl('button', 'cv-btn cv-btn--primary', '[↓ PRINT / SAVE PDF]');
    printBtn.type = 'button';
    printBtn.addEventListener('click', () => {
      if (typeof window !== 'undefined' && typeof window.print === 'function') {
        window.print();
      }
    });
    const closeBtn = createEl('button', 'cv-btn', '[✕ CLOSE]');
    closeBtn.type = 'button';
    closeBtn.addEventListener('click', () => this.closeCvModal());
    this.cvCloseBtnEl = closeBtn;
    actions.append(printBtn, closeBtn);
    toolbar.appendChild(actions);

    const sheet = createEl('article', 'cv-sheet');
    const sheetHead = createEl('header', 'cv-sheet__head');
    const title = createEl('h2', 'cv-sheet__name', `${this.profile.displayName} (@${this.profile.login})`);
    title.id = 'cv-modal-title';
    sheetHead.appendChild(title);
    sheetHead.appendChild(createEl('p', 'cv-sheet__role', this.profile.tagline));
    sheetHead.appendChild(
      createEl(
        'p',
        'cv-sheet__contact',
        'GitHub: github.com/KH4NHTU0N9  ·  Telegram: @KH4NHTU0NG  ·  Email: khanhtuong2302@gmail.com',
      ),
    );
    sheet.appendChild(sheetHead);

    const sumSec = createEl('section', 'cv-sheet__section');
    sumSec.appendChild(createEl('h3', 'cv-sheet__heading', 'SUMMARY'));
    sumSec.appendChild(createEl('p', 'cv-sheet__text', this.profile.bio));
    sheet.appendChild(sumSec);

    const skillsSec = createEl('section', 'cv-sheet__section');
    skillsSec.appendChild(createEl('h3', 'cv-sheet__heading', 'TECHNICAL CAPABILITIES'));
    const skillList = createEl('ul', 'cv-sheet__list');
    for (const dom of this.getOrderedDomains()) {
      const li = createEl('li', 'cv-sheet__item');
      const strong = createEl('strong', '', `${dom.label}: `);
      li.append(strong, document.createTextNode(dom.items.join(', ')));
      skillList.appendChild(li);
    }
    skillsSec.appendChild(skillList);
    sheet.appendChild(skillsSec);

    const projSec = createEl('section', 'cv-sheet__section');
    projSec.appendChild(createEl('h3', 'cv-sheet__heading', 'SELECTED SECURITY & ENGINEERING PROJECTS'));
    const projList = createEl('ul', 'cv-sheet__list');
    for (const repo of this.activeRepos.slice(0, 5)) {
      const li = createEl('li', 'cv-sheet__item');
      const strong = createEl('strong', '', `${repo.name} (${repo.language}): `);
      li.append(strong, document.createTextNode(repo.description || 'Public source repository.'));
      projList.appendChild(li);
    }
    projSec.appendChild(projList);
    sheet.appendChild(projSec);

    panel.append(toolbar, sheet);
    this.cvModalRoot.append(backdrop, panel);
    this.cvModalRoot.hidden = !wasOpen;
  }

  openCvModal(openerEl = null) {
    if (!this.cvModalRoot) {
      return;
    }
    this.cvOpenerEl = openerEl || this.cvTriggerEl;
    this.cvModalRoot.hidden = false;
    document.body.classList.add('is-modal-open');
    this.cvCloseBtnEl?.focus();
  }

  closeCvModal() {
    if (!this.cvModalRoot || this.cvModalRoot.hidden) {
      return;
    }
    this.cvModalRoot.hidden = true;
    document.body.classList.remove('is-modal-open');
    this.cvOpenerEl?.focus?.();
  }

  isCvModalOpen() {
    return Boolean(this.cvModalRoot && !this.cvModalRoot.hidden);
  }

  setCliOutput(lines = [], { clear = false } = {}) {
    if (!this.cliOutputEl) {
      return;
    }
    this.cliOutputEl.textContent = '';
    if (clear || !Array.isArray(lines) || lines.length === 0) {
      this.cliOutputEl.hidden = true;
      return;
    }
    for (const line of lines.slice(0, 6)) {
      this.cliOutputEl.appendChild(createEl('div', 'cli-output__line', String(line)));
    }
    this.cliOutputEl.hidden = false;
  }

  syncCliStateBanner() {
    if (!this.cliStatusEl) {
      return;
    }
    const mode = MODE_LABELS[this.glyphMode] || 'MATH';
    this.cliStatusEl.textContent = `--scene=${this.presetId} --glyph=${mode.toLowerCase()} --pinned=${this.repoCount}`;
  }

  renderFooter() {
    if (!this.footerRoot) {
      return;
    }
    this.footerRoot.textContent = '';

    const shell = createEl('div', 'cli-shell');
    this.cliOutputEl = createEl('div', 'cli-output');
    this.cliOutputEl.setAttribute('role', 'status');
    this.cliOutputEl.setAttribute('aria-live', 'polite');
    this.cliOutputEl.hidden = true;
    shell.appendChild(this.cliOutputEl);

    const row = createEl('div', 'cli-bar');
    const form = createEl('form', 'cli-form');
    form.setAttribute('role', 'search');
    form.setAttribute('aria-label', 'Interactive portfolio mini-CLI');

    const promptLabel = createEl('label', 'cli-prompt', `${this.profile.login.toLowerCase()}@sec:~$`);
    promptLabel.setAttribute('for', 'cli-cmd-input');

    const input = document.createElement('input');
    input.id = 'cli-cmd-input';
    input.type = 'text';
    input.className = 'cli-input';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.placeholder = "help | whoami | scene rf | glyph bin | grep wireshark | cv | clear";
    input.setAttribute('aria-label', 'Terminal command input');
    this.cliInputEl = input;
    this.cliFormEl = form;

    const runBtn = createEl('button', 'cli-exec-btn', 'RUN ↵');
    runBtn.type = 'submit';
    form.append(promptLabel, input, runBtn);

    const runCommandString = (raw) => {
      const cmd = String(raw || '').trim();
      if (!cmd) return;
      if (this.cliHistory[0] !== cmd) {
        this.cliHistory.unshift(cmd);
        if (this.cliHistory.length > 20) this.cliHistory.pop();
      }
      this.cliHistoryIdx = -1;
      const res = this.callbacks.onCliCommand?.(cmd);
      if (res) {
        this.setCliOutput(res.lines || [], { clear: Boolean(res.clear) });
      }
      input.value = '';
    };

    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      runCommandString(input.value);
    });

    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'ArrowUp' && this.cliHistory.length > 0) {
        ev.preventDefault();
        this.cliHistoryIdx = Math.min(this.cliHistory.length - 1, this.cliHistoryIdx + 1);
        input.value = this.cliHistory[this.cliHistoryIdx];
      } else if (ev.key === 'ArrowDown') {
        ev.preventDefault();
        if (this.cliHistoryIdx > 0) {
          this.cliHistoryIdx--;
          input.value = this.cliHistory[this.cliHistoryIdx];
        } else {
          this.cliHistoryIdx = -1;
          input.value = '';
        }
      }
    });

    const quick = createEl('div', 'cli-quick');
    for (const quickCmd of ['help', 'whoami', 'cv', 'clear']) {
      const btn = createEl('button', 'cli-chip', quickCmd);
      btn.type = 'button';
      btn.addEventListener('click', () => runCommandString(quickCmd));
      quick.appendChild(btn);
    }

    const meta = createEl('div', 'colophon-meta');
    this.cliStatusEl = createEl('span', 'colophon-state', '');
    this.syncCliStateBanner();
    meta.append(
      this.cliStatusEl,
      createSafeLink(this.profile.githubUrl, 'colophon-item colophon-link', '[GITHUB ↗]'),
    );

    row.append(form, quick, meta);
    shell.appendChild(row);
    this.footerRoot.appendChild(shell);
  }
}
