import { PROFILE_DATA, isSafeExternalUrl } from '../data/profile.js';

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
    const span = createEl('span', className, text);
    return span;
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
 * Renders verified KH4NHTU0N9 developer identity, filterable tech domains,
 * public repository cards, and cited mathematical implementation notes.
 */
export class ProfileView {
  /**
   * @param {HTMLElement} container
   * @param {typeof PROFILE_DATA} [profile]
   */
  constructor(container, profile = PROFILE_DATA) {
    this.container = container;
    this.profile = profile;
    this.activeDomainId = 'all';
    this.domainButtons = new Map();
    this.badgeGridEl = null;
    this.reposGridEl = null;
    this.reposSourceBadgeEl = null;

    this.renderBase();
    this.renderDomainBadges('all');
    this.renderRepos(this.profile.fallbackRepos, 'fallback');
  }

  renderBase() {
    this.container.textContent = '';

    // 1. Identity Hero Card
    const identityCard = createEl('section', 'glass-card profile-hero');
    identityCard.setAttribute('aria-label', 'Developer profile');

    const topRow = createEl('div', 'profile-hero__main');
    if (isSafeExternalUrl(this.profile.avatarUrl)) {
      const avatar = document.createElement('img');
      avatar.src = this.profile.avatarUrl;
      avatar.alt = `${this.profile.login} avatar`;
      avatar.className = 'profile-avatar';
      avatar.width = 88;
      avatar.height = 88;
      avatar.loading = 'lazy';
      topRow.appendChild(avatar);
    }

    const identityInfo = createEl('div', 'profile-hero__info');
    const nameRow = createEl('div', 'profile-hero__names');
    nameRow.appendChild(createEl('h1', 'profile-title', this.profile.displayName));
    nameRow.appendChild(createEl('span', 'profile-handle', `@${this.profile.login} · ${this.profile.pronouns}`));
    identityInfo.appendChild(nameRow);

    identityInfo.appendChild(createEl('p', 'profile-tagline', this.profile.tagline));
    identityInfo.appendChild(createEl('p', 'profile-bio', this.profile.bio));

    const metaRow = createEl('div', 'profile-stats-row');
    metaRow.appendChild(createEl('span', 'stat-chip', `${this.profile.stats.publicRepos} Public Repos`));
    metaRow.appendChild(createEl('span', 'stat-chip', `${this.profile.stats.followers} Follower`));

    const socialStrip = createEl('div', 'social-strip');
    for (const s of this.profile.socials) {
      socialStrip.appendChild(
        createSafeLink(s.url, 'social-pill', s.label, { allowMailto: s.allowMailto }),
      );
    }

    identityInfo.append(metaRow, socialStrip);
    topRow.appendChild(identityInfo);
    identityCard.appendChild(topRow);
    this.container.appendChild(identityCard);

    // 2. Tech Domains Section
    const stackSection = createEl('section', 'glass-card profile-section');
    const stackHead = createEl('div', 'section-header');
    stackHead.appendChild(createEl('span', 'eyebrow-tag', '01 // TECH DOMAINS'));

    const totalItems = this.profile.techDomains.reduce((sum, dom) => sum + dom.items.length, 0);
    const filterBar = createEl('div', 'domain-filter-bar');
    filterBar.setAttribute('role', 'tablist');
    filterBar.setAttribute('aria-label', 'Technology domains');

    const allBtn = createEl('button', 'filter-pill is-active', `All (${totalItems})`);
    allBtn.type = 'button';
    allBtn.addEventListener('click', () => this.renderDomainBadges('all'));
    this.domainButtons.set('all', allBtn);
    filterBar.appendChild(allBtn);

    for (const dom of this.profile.techDomains) {
      const btn = createEl('button', 'filter-pill', `${dom.label} (${dom.items.length})`);
      btn.type = 'button';
      btn.addEventListener('click', () => this.renderDomainBadges(dom.id));
      this.domainButtons.set(dom.id, btn);
      filterBar.appendChild(btn);
    }

    stackHead.appendChild(filterBar);
    stackSection.appendChild(stackHead);

    this.badgeGridEl = createEl('div', 'tech-badge-grid');
    stackSection.appendChild(this.badgeGridEl);
    this.container.appendChild(stackSection);

    // 3. Selected Repositories Section
    const reposSection = createEl('section', 'glass-card profile-section');
    const reposHead = createEl('div', 'section-header');
    const reposTitleWrap = createEl('div', 'section-title-inline');
    reposTitleWrap.appendChild(createEl('span', 'eyebrow-tag', '02 // SELECTED REPOSITORIES'));
    this.reposSourceBadgeEl = createEl('span', 'source-badge', 'Snapshot');
    reposTitleWrap.appendChild(this.reposSourceBadgeEl);
    reposHead.appendChild(reposTitleWrap);
    reposHead.appendChild(
      createSafeLink(this.profile.githubUrl, 'link-action link-action--inline', 'View all on GitHub ↗'),
    );
    reposSection.appendChild(reposHead);

    this.reposGridEl = createEl('div', 'repos-grid');
    reposSection.appendChild(this.reposGridEl);
    this.container.appendChild(reposSection);

    // 4. Mathematical Engine & Citations Section
    const notesSection = createEl('section', 'glass-card profile-section');
    const notesHead = createEl('div', 'section-header');
    notesHead.appendChild(createEl('span', 'eyebrow-tag', '03 // NUMERICAL METHODS & REFERENCES'));
    notesSection.appendChild(notesHead);

    const notesGrid = createEl('div', 'notes-grid');
    this.profile.mathNotes.forEach((note, idx) => {
      const card = createEl('article', 'note-card');
      card.appendChild(createEl('h3', 'note-card__title', `[${idx + 1}] ${note.title}`));
      card.appendChild(createEl('p', 'note-card__body', note.summary));
      card.appendChild(createSafeLink(note.url, 'note-card__ref', `${note.reference} ↗`));
      notesGrid.appendChild(card);
    });
    notesSection.appendChild(notesGrid);
    this.container.appendChild(notesSection);
  }

  /**
   * Filters and displays verified tech domain badges.
   * @param {string} domainId
   */
  renderDomainBadges(domainId) {
    this.activeDomainId = domainId;
    for (const [id, btn] of this.domainButtons.entries()) {
      const active = id === domainId;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    }

    this.badgeGridEl.textContent = '';
    const selectedDomains =
      domainId === 'all'
        ? this.profile.techDomains
        : this.profile.techDomains.filter((d) => d.id === domainId);

    for (const dom of selectedDomains) {
      for (const item of dom.items) {
        const chip = createEl('span', `tech-chip tech-chip--${dom.id}`, item);
        chip.title = dom.label;
        this.badgeGridEl.appendChild(chip);
      }
    }
  }

  /**
   * Updates repository cards from verified snapshot or live GitHub REST API data.
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

      const top = createEl('div', 'repo-card__top');
      top.appendChild(createSafeLink(repo.htmlUrl, 'repo-card__name', repo.name));
      top.appendChild(createEl('span', 'repo-card__lang', repo.language));
      card.appendChild(top);

      const summary = repo.description || `Public ${repo.language} source repository on GitHub.`;
      card.appendChild(createEl('p', 'repo-card__desc', summary));

      const footer = createEl('div', 'repo-card__footer');
      footer.appendChild(createEl('span', 'repo-card__stars', `★ ${repo.stars}`));

      const links = createEl('div', 'repo-card__links');
      links.appendChild(createSafeLink(repo.htmlUrl, 'repo-link', 'Code ↗'));
      if (repo.homepage) {
        links.appendChild(createSafeLink(repo.homepage, 'repo-link repo-link--demo', 'Live Demo ↗'));
      }
      footer.appendChild(links);
      card.appendChild(footer);

      this.reposGridEl.appendChild(card);
    }
  }
}
