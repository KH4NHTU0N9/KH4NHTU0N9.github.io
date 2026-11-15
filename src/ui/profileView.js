import { LANGUAGE_COLORS, PROFILE_DATA, isSafeExternalUrl } from '../data/profile.js?v=gcs25';
import { generateFallbackSigilRows, sampleImagePixelsToAscii } from '../math/asciiArt.js?v=gcs25';

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
 * Renders the Information Security student portfolio console, live pixel-sampled
 * ASCII portrait, verified `focus/` ASCII tree, tooling matrix, and repositories.
 */
export class ProfileView {
  /**
   * @param {{ consoleRoot?: HTMLElement, heroRoot?: HTMLElement, sectionsRoot?: HTMLElement, footerRoot?: HTMLElement }} roots
   * @param {typeof PROFILE_DATA} [profile]
   */
  constructor({ consoleRoot, heroRoot, sectionsRoot, footerRoot } = {}, profile = PROFILE_DATA) {
    this.consoleRoot = consoleRoot || heroRoot || null;
    this.sectionsRoot = sectionsRoot || null;
    this.footerRoot = footerRoot || null;
    this.profile = profile;

    this.activeDomainId = 'all';
    this.searchQuery = '';
    this.glyphMode = 'math';
    this.presetId = 'mesh';
    this.repoSource = 'fallback';
    this.repoCount = this.profile.fallbackRepos.length;

    this.domainButtons = new Map();
    this.avatarCanvasEl = null;
    this.avatarCtx = null;
    this.avatarPixels = null;
    this.avatarRawPinned = false;
    this.avatarBadgeEl = null;
    this.footerCliEl = null;

    this.indexGridEl = null;
    this.reposGridEl = null;
    this.reposStatusEl = null;

    this.renderConsole();
    this.renderSectionsBase();
    this.renderDomains('all');
    this.renderRepos(this.profile.fallbackRepos, 'fallback');
    this.renderFooter();
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
      'Steghide',
    ]);
    const hwTools = pickVerified(embItems, ['ESP32', 'Embedded C', 'Betaflight', 'PX4 Autopilot'], 3);
    const hasRtl8720 = (this.profile.fallbackRepos || []).some((r) =>
      String(r.name || '').toUpperCase().includes('RLT8720DN'),
    );
    const wirelessList = hasRtl8720 ? ['RLT8720dn (WiFi/BLE)', ...hwTools] : hwTools;
    const sysTools = pickVerified(sysItems, ['Linux', 'Python', 'TypeScript', 'Docker']);

    return [
      { key: 'dfir/', value: dfirTools.join(' · ') },
      { key: 'wireless/', value: wirelessList.join(' · ') },
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
    this.syncFooterCli();
  }

  setPreset(presetId) {
    if (presetId) {
      this.presetId = presetId;
      this.syncFooterCli();
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
    metaStack.appendChild(
      createEl('span', 'hero-disciplines', 'INFORMATION SECURITY STUDENT · EMBEDDED & SYSTEMS'),
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

    // Clean verified InfoSec focus ASCII tree
    const focusTree = createEl('div', 'focus-tree');
    focusTree.setAttribute('role', 'region');
    focusTree.setAttribute('aria-label', 'Information security focus areas');

    const focusHead = createEl('div', 'focus-tree__head');
    focusHead.appendChild(createEl('span', 'focus-root', 'focus/'));
    focusHead.appendChild(
      createEl('span', 'focus-meta', `${this.profile.stats.publicRepos} PUBLIC REPOS`),
    );
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
    linkGrid.setAttribute('aria-label', 'External profiles and direct contact');
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

    // 01 // Tooling & Capabilities Matrix (Security-first ordered)
    const indexSec = createEl('section', 'swiss-section');
    const indexBar = createEl('div', 'section-bar');
    const indexLeft = createEl('div', 'section-bar__left');
    indexLeft.appendChild(createEl('span', 'section-code', '┌─ 01 // TOOLING & CAPABILITIES'));

    const cmdWrap = createEl('div', 'cmd-filter-wrap');
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
    filterRow.setAttribute('aria-label', 'Filter tooling domains');

    const orderedDomains = this.getOrderedDomains();
    const totalCount = orderedDomains.reduce((sum, d) => sum + d.items.length, 0);
    const allTab = createEl('button', 'text-tab is-active', `ALL (${totalCount})`);
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
   * Renders calm, scannable capability modules formatted as an ASCII directory tree.
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

    for (const dom of list) {
      const col = createEl('article', 'index-col');

      const colHead = createEl('div', 'index-col__head');
      colHead.appendChild(createEl('span', 'index-col__code', `┌─ ${DOMAIN_CODES[dom.id] || 'MOD.00'}`));
      colHead.appendChild(
        createEl('span', 'index-col__count', `${String(dom.filteredItems.length).padStart(2, '0')} UNITS`),
      );
      col.appendChild(colHead);

      col.appendChild(createEl('h2', 'index-col__title', dom.label));
      col.appendChild(createEl('p', 'index-col__sub', dom.subtitle));

      const ul = createEl('ul', 'index-list');
      const totalItems = dom.filteredItems.length;
      dom.filteredItems.forEach((item, idx) => {
        const li = createEl('li', 'index-list__item');
        const treePrefix = idx === totalItems - 1 ? '└─' : '├─';
        li.append(
          createEl('span', 'index-list__tree', treePrefix),
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
   * Renders clean public repository cards ordered as a structured terminal ledger.
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

    this.syncFooterCli();
  }

  syncFooterCli() {
    if (!this.footerCliEl) {
      return;
    }
    const mode = MODE_LABELS[this.glyphMode] || 'MATH';
    const nextCli = `${this.profile.login.toLowerCase()}@sec:~$ ./portfolio --scene=${this.presetId} --glyph=${mode.toLowerCase()} --repos=${this.repoCount}`;
    if (this.footerCliEl.textContent !== nextCli) {
      this.footerCliEl.textContent = nextCli;
    }
  }

  renderFooter() {
    if (!this.footerRoot) {
      return;
    }
    this.footerRoot.textContent = '';
    this.footerCliEl = createEl('span', 'colophon-item colophon-cli', '');
    this.syncFooterCli();
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
