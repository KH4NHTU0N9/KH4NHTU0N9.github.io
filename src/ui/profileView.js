import { LANGUAGE_COLORS, PROFILE_DATA, isSafeExternalUrl } from '../data/profile.js';

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

/**
 * Renders the Swiss Editorial Hero, typographic technical index,
 * and ruled repository ledger for @KH4NHTU0N9.
 */
export class ProfileView {
  /**
   * @param {{ heroRoot: HTMLElement, sectionsRoot: HTMLElement, footerRoot: HTMLElement }} roots
   * @param {typeof PROFILE_DATA} [profile]
   */
  constructor({ heroRoot, sectionsRoot, footerRoot }, profile = PROFILE_DATA) {
    this.heroRoot = heroRoot;
    this.sectionsRoot = sectionsRoot;
    this.footerRoot = footerRoot;
    this.profile = profile;
    this.activeDomainId = 'all';
    this.domainButtons = new Map();
    this.indexGridEl = null;
    this.reposGridEl = null;
    this.reposStatusEl = null;

    this.renderHero();
    this.renderSectionsBase();
    this.renderDomains('all');
    this.renderRepos(this.profile.fallbackRepos, 'fallback');
    this.renderFooter();
  }

  renderHero() {
    this.heroRoot.textContent = '';

    const identityStrip = createEl('div', 'hero-id-strip');
    if (isSafeExternalUrl(this.profile.avatarUrl)) {
      const avatar = document.createElement('img');
      avatar.src = this.profile.avatarUrl;
      avatar.alt = `${this.profile.login} avatar`;
      avatar.className = 'hero-avatar';
      avatar.width = 68;
      avatar.height = 68;
      identityStrip.appendChild(avatar);
    }

    const metaStack = createEl('div', 'hero-meta-stack');
    metaStack.appendChild(createEl('span', 'hero-handle', `@${this.profile.login} / ${this.profile.pronouns.toUpperCase()}`));
    metaStack.appendChild(createEl('span', 'hero-disciplines', this.profile.tagline.toUpperCase()));
    identityStrip.appendChild(metaStack);
    this.heroRoot.appendChild(identityStrip);

    const h1 = createEl('h1', 'hero-display-name', this.profile.displayName);
    this.heroRoot.appendChild(h1);

    const bioQuote = createEl('p', 'hero-statement', this.profile.bio);
    this.heroRoot.appendChild(bioQuote);

    const linkGrid = createEl('nav', 'hero-links');
    linkGrid.setAttribute('aria-label', 'Social profiles');
    for (const s of this.profile.socials) {
      const isPrimary = s.label === 'GitHub';
      const cls = isPrimary ? 'grid-link grid-link--primary' : 'grid-link';
      linkGrid.appendChild(
        createSafeLink(s.url, cls, `${s.label.toUpperCase()} ↗`, { allowMailto: s.allowMailto }),
      );
    }
    this.heroRoot.appendChild(linkGrid);

    const hint = createEl(
      'p',
      'hero-hint',
      'DRAG TO ORBIT · CLICK FOR DISPERSION WAVE · KEYS [1–3] · [SPACE] PAUSE · [H] SOLO CANVAS',
    );
    this.heroRoot.appendChild(hint);
  }

  renderSectionsBase() {
    this.sectionsRoot.textContent = '';

    // 01 // Technical Capability Index (Typographic Swiss Matrix)
    const indexSec = createEl('section', 'swiss-section');
    const indexBar = createEl('div', 'section-bar');
    indexBar.appendChild(createEl('span', 'section-code', '01 / TECHNICAL INDEX'));

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

    // 02 // Repository Ledger
    const worksSec = createEl('section', 'swiss-section');
    const worksBar = createEl('div', 'section-bar');
    const worksLeft = createEl('div', 'section-bar__left');
    worksLeft.appendChild(createEl('span', 'section-code', '02 / SELECTED REPOSITORIES'));
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
   * Renders clean typographic engineering columns without rounded pill clutter.
   * @param {string} domainId
   */
  renderDomains(domainId) {
    this.activeDomainId = domainId;
    for (const [id, btn] of this.domainButtons.entries()) {
      const active = id === domainId;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    }

    this.indexGridEl.textContent = '';
    const isSingle = domainId !== 'all';
    this.indexGridEl.classList.toggle('is-single', isSingle);

    const list = isSingle
      ? this.profile.techDomains.filter((d) => d.id === domainId)
      : this.profile.techDomains;

    const codes = { embedded: '01.A', security: '01.B', systems: '01.C' };

    for (const dom of list) {
      const col = createEl('article', 'index-col');

      const colHead = createEl('div', 'index-col__head');
      colHead.appendChild(createEl('span', 'index-col__code', codes[dom.id] || '01'));
      colHead.appendChild(createEl('span', 'index-col__count', `${String(dom.items.length).padStart(2, '0')} ITEMS`));
      col.appendChild(colHead);

      col.appendChild(createEl('h2', 'index-col__title', dom.label));
      col.appendChild(createEl('p', 'index-col__sub', dom.subtitle));

      const ul = createEl('ul', 'index-list');
      for (const item of dom.items) {
        ul.appendChild(createEl('li', 'index-list__item', item));
      }
      col.appendChild(ul);
      this.indexGridEl.appendChild(col);
    }
  }

  /**
   * Renders selected repositories into a clean 2-column ruled Swiss ledger.
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
      idRow.appendChild(createEl('span', 'ledger-num', String(idx + 1).padStart(2, '0')));
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
      links.appendChild(createSafeLink(repo.htmlUrl, 'ledger-link', 'SOURCE ↗'));
      if (repo.homepage) {
        links.appendChild(createSafeLink(repo.homepage, 'ledger-link ledger-link--live', 'LIVE DEMO ↗'));
      }
      foot.appendChild(links);
      cell.appendChild(foot);

      this.reposGridEl.appendChild(cell);
    });
  }

  renderFooter() {
    this.footerRoot.textContent = '';
    this.footerRoot.appendChild(
      createEl('span', 'colophon-item', `${this.profile.displayName.toUpperCase()} / @${this.profile.login}`),
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
