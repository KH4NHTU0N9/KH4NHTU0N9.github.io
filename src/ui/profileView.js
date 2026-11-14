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

  }
}
