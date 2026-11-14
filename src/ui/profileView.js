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

function attachCursorSpotlight(el) {
  el.addEventListener('pointermove', (ev) => {
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${ev.clientX - rect.left}px`);
    el.style.setProperty('--my', `${ev.clientY - rect.top}px`);
  });
}

/**
 * Renders the radiant hero intro card, domain bento stack cards,
 * and interactive repository showcase for @KH4NHTU0N9.
 */
export class ProfileView {
  /**
   * @param {{ heroRoot: HTMLElement, sectionsRoot: HTMLElement }} roots
   * @param {typeof PROFILE_DATA} [profile]
   */
  constructor({ heroRoot, sectionsRoot }, profile = PROFILE_DATA) {
    this.heroRoot = heroRoot;
    this.sectionsRoot = sectionsRoot;
    this.profile = profile;
    this.activeDomainId = 'all';
    this.domainButtons = new Map();
    this.domainGridEl = null;
    this.reposGridEl = null;
    this.reposSourceBadgeEl = null;

    this.renderHero();
    this.renderSectionsBase();
    this.renderDomains('all');
    this.renderRepos(this.profile.fallbackRepos, 'fallback');
  }

  renderHero() {
    this.heroRoot.textContent = '';

    const badge = createEl('div', 'hero-eyebrow');
    badge.appendChild(createEl('span', 'hero-eyebrow__dot', ''));
    badge.appendChild(createEl('span', '', `@${this.profile.login} · INTERACTIVE PROFILE`));
    this.heroRoot.appendChild(badge);

    const identityRow = createEl('div', 'hero-identity');
    if (isSafeExternalUrl(this.profile.avatarUrl)) {
      const ring = createEl('div', 'hero-avatar-ring');
      const avatar = document.createElement('img');
      avatar.src = this.profile.avatarUrl;
      avatar.alt = `${this.profile.login} avatar`;
      avatar.className = 'hero-avatar';
      avatar.width = 92;
      avatar.height = 92;
      ring.appendChild(avatar);
      identityRow.appendChild(ring);
    }

    const titleBlock = createEl('div', 'hero-title-block');
    const nameEl = createEl('h1', 'hero-name', this.profile.displayName);
    titleBlock.appendChild(nameEl);

    const roleLine = createEl('p', 'hero-role');
    roleLine.appendChild(createEl('span', 'hero-role__handle', `@${this.profile.login}`));
    roleLine.appendChild(createEl('span', 'hero-role__sep', '·'));
    roleLine.appendChild(createEl('span', 'hero-role__tag', this.profile.tagline));
    titleBlock.appendChild(roleLine);

    identityRow.appendChild(titleBlock);
    this.heroRoot.appendChild(identityRow);

    const bioCard = createEl('p', 'hero-bio', this.profile.bio);
    this.heroRoot.appendChild(bioCard);

    const totalTools = this.profile.techDomains.reduce((sum, dom) => sum + dom.items.length, 0);
    const statsRow = createEl('div', 'hero-metrics');
    statsRow.appendChild(createEl('span', 'metric-pill', `${this.profile.stats.publicRepos} Public Repos`));
    statsRow.appendChild(createEl('span', 'metric-pill', `${totalTools} Core Tools`));
    statsRow.appendChild(createEl('span', 'metric-pill', `${this.profile.techDomains.length} Engineering Domains`));
    this.heroRoot.appendChild(statsRow);

    const actions = createEl('div', 'hero-socials');
    for (const s of this.profile.socials) {
      const cls = s.label === 'GitHub' ? 'social-btn social-btn--primary' : 'social-btn';
      const label = s.label === 'GitHub' ? 'GitHub Profile ↗' : s.label;
      actions.appendChild(createSafeLink(s.url, cls, label, { allowMailto: s.allowMailto }));
    }
    this.heroRoot.appendChild(actions);
  }

  renderSectionsBase() {
    this.sectionsRoot.textContent = '';

    // 01 // Tech Domains Bento Grid
    const stackSection = createEl('section', 'portfolio-section');
    const stackHead = createEl('div', 'section-header');
    const titleWrap = createEl('div', 'section-heading-group');
    titleWrap.appendChild(createEl('span', 'section-eyebrow', '01 // TECH STACK'));
    titleWrap.appendChild(createEl('h2', 'section-title', 'Hardware, Security & Systems'));
    stackHead.appendChild(titleWrap);

    const totalItems = this.profile.techDomains.reduce((sum, dom) => sum + dom.items.length, 0);
    const filterBar = createEl('div', 'filter-bar');
    filterBar.setAttribute('role', 'tablist');
    filterBar.setAttribute('aria-label', 'Technology domains');

    const allBtn = createEl('button', 'filter-pill is-active', `All (${totalItems})`);
    allBtn.type = 'button';
    allBtn.addEventListener('click', () => this.renderDomains('all'));
    this.domainButtons.set('all', allBtn);
    filterBar.appendChild(allBtn);

    for (const dom of this.profile.techDomains) {
      const btn = createEl('button', 'filter-pill', dom.label);
      btn.type = 'button';
      btn.addEventListener('click', () => this.renderDomains(dom.id));
      this.domainButtons.set(dom.id, btn);
      filterBar.appendChild(btn);
    }

    stackHead.appendChild(filterBar);
    stackSection.appendChild(stackHead);

    this.domainGridEl = createEl('div', 'bento-domains');
    stackSection.appendChild(this.domainGridEl);
    this.sectionsRoot.appendChild(stackSection);

    // 02 // Selected Repositories Showcase
    const reposSection = createEl('section', 'portfolio-section');
    const reposHead = createEl('div', 'section-header');
    const reposTitleGroup = createEl('div', 'section-heading-group');
    const reposEyebrowRow = createEl('div', 'eyebrow-inline');
    reposEyebrowRow.appendChild(createEl('span', 'section-eyebrow', '02 // SELECTED WORKS'));
    this.reposSourceBadgeEl = createEl('span', 'live-badge', 'Verified Snapshot');
    reposEyebrowRow.appendChild(this.reposSourceBadgeEl);
    reposTitleGroup.appendChild(reposEyebrowRow);
    reposTitleGroup.appendChild(createEl('h2', 'section-title', 'Public Repositories'));
    reposHead.appendChild(reposTitleGroup);

    reposHead.appendChild(
      createSafeLink(this.profile.githubUrl, 'section-cta', 'Explore all repositories ↗'),
    );
    reposSection.appendChild(reposHead);

    this.reposGridEl = createEl('div', 'repos-grid');
    reposSection.appendChild(this.reposGridEl);
    this.sectionsRoot.appendChild(reposSection);
  }

  /**
   * Renders domain bento cards (3-column overview or focused single-domain layout).
   * @param {string} domainId
   */
  renderDomains(domainId) {
    this.activeDomainId = domainId;
    for (const [id, btn] of this.domainButtons.entries()) {
      const active = id === domainId;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    }

    this.domainGridEl.textContent = '';
    const isFiltered = domainId !== 'all';
    this.domainGridEl.classList.toggle('is-single', isFiltered);

    const selected = isFiltered
      ? this.profile.techDomains.filter((d) => d.id === domainId)
      : this.profile.techDomains;

    for (const dom of selected) {
      const card = createEl('article', `bento-card bento-card--${dom.id}`);
      attachCursorSpotlight(card);

      const head = createEl('div', 'bento-card__head');
      const titleCol = createEl('div', 'bento-card__title-col');
      titleCol.appendChild(createEl('h3', 'bento-card__title', dom.label));
      titleCol.appendChild(createEl('p', 'bento-card__sub', dom.subtitle));
      head.appendChild(titleCol);
      head.appendChild(createEl('span', 'bento-card__count', `${dom.items.length} tools`));
      card.appendChild(head);

      const chips = createEl('div', 'bento-chips');
      for (const item of dom.items) {
        chips.appendChild(createEl('span', `tech-chip tech-chip--${dom.id}`, item));
      }
      card.appendChild(chips);
      this.domainGridEl.appendChild(card);
    }
  }

  /**
   * Updates repository showcase cards cleanly from snapshot or live GitHub API.
   * @param {Array<any>} repos
   * @param {'live' | 'fallback'} source
   */
  renderRepos(repos, source) {
    if (!this.reposGridEl) {
      return;
    }
    this.reposSourceBadgeEl.textContent = source === 'live' ? 'GitHub API · Live' : 'Verified Snapshot';
    this.reposGridEl.textContent = '';

    for (const repo of repos) {
      const card = createEl('article', 'repo-card');
      attachCursorSpotlight(card);

      const top = createEl('div', 'repo-card__top');
      top.appendChild(createSafeLink(repo.htmlUrl, 'repo-card__name', repo.name));

      const langPill = createEl('span', 'repo-card__lang');
      const dot = createEl('span', 'lang-dot');
      dot.style.backgroundColor = LANGUAGE_COLORS[repo.language] || LANGUAGE_COLORS.Code;
      langPill.appendChild(dot);
      langPill.appendChild(createEl('span', '', repo.language));
      top.appendChild(langPill);
      card.appendChild(top);

      const summary = repo.description || `Public ${repo.language} source repository on GitHub.`;
      card.appendChild(createEl('p', 'repo-card__desc', summary));

      const footer = createEl('div', 'repo-card__footer');
      footer.appendChild(createEl('span', 'repo-card__stars', `★ ${repo.stars}`));

      const links = createEl('div', 'repo-card__links');
      links.appendChild(createSafeLink(repo.htmlUrl, 'repo-link', 'Source ↗'));
      if (repo.homepage) {
        links.appendChild(createSafeLink(repo.homepage, 'repo-link repo-link--demo', 'Live Demo ↗'));
      }
      footer.appendChild(links);
      card.appendChild(footer);

      this.reposGridEl.appendChild(card);
    }
  }
}
