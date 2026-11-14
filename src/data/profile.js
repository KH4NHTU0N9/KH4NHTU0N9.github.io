/**
 * Validates external links using an explicit protocol allowlist (`https:` and optional `mailto:`).
 * Rejects `javascript:`, `data:`, `http:`, and malformed URLs.
 *
 * @param {unknown} rawUrl
 * @param {{ allowMailto?: boolean }} [options]
 * @returns {boolean}
 */
export function isSafeExternalUrl(rawUrl, options = {}) {
  if (typeof rawUrl !== 'string') {
    return false;
  }
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return false;
  }
  if (options.allowMailto && /^mailto:[^\s@/?#]+@[^\s@/?#]+\.[^\s@/?#]+$/i.test(trimmed)) {
    return true;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

/**
 * Normalizes a GitHub REST API repository object into a UI card entry.
 * Returns null if the repo is invalid or fails URL safety checks.
 *
 * @param {any} rawRepo
 * @param {string} [username]
 * @returns {{ name: string, htmlUrl: string, homepage: string | null, language: string, description: string | null, stars: number, updatedAt: string | null } | null}
 */
export function normalizeRepoRecord(rawRepo, username = 'KH4NHTU0N9') {
  if (!rawRepo || typeof rawRepo !== 'object') {
    return null;
  }
  const name = typeof rawRepo.name === 'string' ? rawRepo.name.trim() : '';
  const htmlUrl = typeof rawRepo.html_url === 'string' ? rawRepo.html_url.trim() : '';
  if (!name || name === username || !isSafeExternalUrl(htmlUrl)) {
    return null;
  }

  let homepage = null;
  if (typeof rawRepo.homepage === 'string' && isSafeExternalUrl(rawRepo.homepage)) {
    homepage = rawRepo.homepage.trim();
  } else if (name === 'ASCII-CHRISTMAS') {
    homepage = 'https://kh4nhtu0n9.github.io/ASCII-CHRISTMAS/';
  }

  const language =
    typeof rawRepo.language === 'string' && rawRepo.language.trim()
      ? rawRepo.language.trim()
      : 'Code';
  const description =
    typeof rawRepo.description === 'string' && rawRepo.description.trim()
      ? rawRepo.description.trim()
      : null;
  const stars = Number.isFinite(rawRepo.stargazers_count)
    ? rawRepo.stargazers_count
    : Number.isFinite(rawRepo.stars)
      ? rawRepo.stars
      : 0;

  return {
    name,
    htmlUrl,
    homepage,
    language,
    description,
    stars: Math.max(0, Math.floor(stars)),
    updatedAt: typeof rawRepo.updated_at === 'string' ? rawRepo.updated_at : null,
  };
}

export const PROFILE_DATA = Object.freeze({
  login: 'KH4NHTU0N9',
  displayName: 'trankhanhtuong',
  pronouns: 'he/him',
  tagline: 'Mathematical Systems & Embedded Engineering Observatory',
  bio: "i'm fascinating in coding some tools which can help world look supercalifragilisticexpialidocious",
  avatarUrl: 'https://avatars.githubusercontent.com/u/121629080?v=4',
  githubUrl: 'https://github.com/KH4NHTU0N9',
  stats: Object.freeze({
    publicRepos: 23,
    followers: 1,
    following: 0,
  }),
  socials: Object.freeze([
    Object.freeze({
      label: 'GitHub',
      handle: '@KH4NHTU0N9',
      url: 'https://github.com/KH4NHTU0N9',
      allowMailto: false,
    }),
    Object.freeze({
      label: 'Telegram',
      handle: '@KH4NHTU0NG',
      url: 'https://t.me/KH4NHTU0NG',
      allowMailto: false,
    }),
    Object.freeze({
      label: 'Facebook',
      handle: 'khtwnq',
      url: 'https://www.facebook.com/khtwnq',
      allowMailto: false,
    }),
    Object.freeze({
      label: 'Instagram',
      handle: 'kosuykolaytien',
      url: 'https://www.instagram.com/kosuykolaytien/',
      allowMailto: false,
    }),
    Object.freeze({
      label: 'Email',
      handle: 'khanhtuong2302@gmail.com',
      url: 'mailto:khanhtuong2302@gmail.com',
      allowMailto: true,
    }),
  ]),
  techDomains: Object.freeze([
    Object.freeze({
      id: 'embedded',
      label: 'Embedded & Flight',
      items: Object.freeze([
        'C',
        'C++',
        'Embedded C',
        'Arduino IDE',
        'ESP32',
        'PlatformIO',
        'Cirkit Designer',
        'Betaflight',
        'PX4 Autopilot',
        'ROS',
      ]),
    }),
    Object.freeze({
      id: 'security',
      label: 'Security & Forensics',
      items: Object.freeze([
        'Linux',
        'Kali Linux',
        'Cisco',
        'Wireshark',
        'The Sleuth Kit',
        'Binwalk',
        'ExifTool',
        'CyberChef',
        'Steghide',
        'Zsteg',
        'Audacity',
      ]),
    }),
    Object.freeze({
      id: 'systems',
      label: 'Systems, Data & Cloud',
      items: Object.freeze([
        'Python',
        'TypeScript',
        'Prisma',
        'PostgreSQL',
        'MySQL',
        'SQLite',
        'Docker',
        'Vercel',
        'Google Cloud',
        'Cloudflare',
        'Git',
        'GitHub',
        'FFmpeg',
        'GNU Bash',
        'Windows Terminal',
        'VS Code',
        'Notion',
        'Adobe',
      ]),
    }),
  ]),
  fallbackRepos: Object.freeze([
    Object.freeze({
      name: 'ASCII-CHRISTMAS',
      htmlUrl: 'https://github.com/KH4NHTU0N9/ASCII-CHRISTMAS',
      homepage: 'https://kh4nhtu0n9.github.io/ASCII-CHRISTMAS/',
      language: 'JavaScript',
      description: 'Interactive 3D ASCII projection scene hosted on GitHub Pages.',
      stars: 1,
      updatedAt: '2026-11-14T03:18:11Z',
    }),
    Object.freeze({
      name: 'DRONE-COMPUTER-VISION-PROJECT',
      htmlUrl: 'https://github.com/KH4NHTU0N9/DRONE-COMPUTER-VISION-PROJECT',
      homepage: null,
      language: 'Python',
      description: null,
      stars: 1,
      updatedAt: '2026-10-31T01:59:22Z',
    }),
    Object.freeze({
      name: 'RLT8720dn-MULTI-ATTACK-TOOLS-FOR-WIFI-AND-BLUETOOTH',
      htmlUrl: 'https://github.com/KH4NHTU0N9/RLT8720dn-MULTI-ATTACK-TOOLS-FOR-WIFI-AND-BLUETOOTH',
      homepage: null,
      language: 'C++',
      description: null,
      stars: 1,
      updatedAt: '2026-07-27T08:25:10Z',
    }),
    Object.freeze({
      name: 'JPD113-REVISION-PROJECT',
      htmlUrl: 'https://github.com/KH4NHTU0N9/JPD113-REVISION-PROJECT',
      homepage: 'https://jpd113-revision-project.vercel.app',
      language: 'TypeScript',
      description: null,
      stars: 1,
      updatedAt: '2026-11-13T16:18:16Z',
    }),
    Object.freeze({
      name: 'Hospital-Multi-Counter-Queue-Balancer-System',
      htmlUrl: 'https://github.com/KH4NHTU0N9/Hospital-Multi-Counter-Queue-Balancer-System',
      homepage: null,
      language: 'Python',
      description: null,
      stars: 1,
      updatedAt: '2026-10-31T02:00:09Z',
    }),
    Object.freeze({
      name: 'POS_MANAGEMENT',
      htmlUrl: 'https://github.com/KH4NHTU0N9/POS_MANAGEMENT',
      homepage: null,
      language: 'TypeScript',
      description:
        'POS_MANAGEMENT can help owner manage their restaurant which like ordering, managing transaction, exporting restaurant data,....',
      stars: 1,
      updatedAt: '2026-04-28T19:04:33Z',
    }),
  ]),
});
