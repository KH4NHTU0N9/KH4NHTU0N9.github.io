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

export const PINNED_REPO_ORDER = Object.freeze([
  'RLT8720dn-MULTI-ATTACK-TOOLS-FOR-WIFI-AND-BLUETOOTH',
  'DRONE-COMPUTER-VISION-PROJECT',
  'FU_IOT102_DroneBasedEnvironmentalMonitoring',
  'FU_OSG203_UsingAIToMonitoringSystemCTL',
  'FU_NWC202-PROJECT-HOTEL-NETWORK-SYSTEM-DESIGN',
  'ASCII-CHRISTMAS',
]);

const CURATED_REPO_OVERRIDES = Object.freeze({
  'RLT8720dn-MULTI-ATTACK-TOOLS-FOR-WIFI-AND-BLUETOOTH': Object.freeze({
    language: 'C++',
    homepage: null,
    description:
      'Dual-band (2.4GHz/5GHz) Wi-Fi & BLE security testing firmware for RTL8720DN (BW16) featuring spectrum scanning and audit workflows.',
  }),
  'DRONE-COMPUTER-VISION-PROJECT': Object.freeze({
    language: 'Python',
    homepage: null,
    description:
      'Real-time Search & Rescue vision on Raspberry Pi 5 + Hailo AI HAT+, fusing YOLOv8 NPU detection with MLX90640 thermal telemetry.',
  }),
  FU_IOT102_DroneBasedEnvironmentalMonitoring: Object.freeze({
    language: 'JavaScript',
    homepage: null,
    description:
      'UAV environmental telemetry & wireless payload platform integrating a Realtek BW16 node, MQTT messaging, and Web GCS dashboard.',
  }),
  FU_OSG203_UsingAIToMonitoringSystemCTL: Object.freeze({
    language: 'HTML',
    homepage: null,
    description:
      'Linux systemd (systemctl) service monitor on CentOS with auto-healing restarts, CPU/RAM/disk alerts, and Groq Llama 3.1 log triage.',
  }),
  'FU_NWC202-PROJECT-HOTEL-NETWORK-SYSTEM-DESIGN': Object.freeze({
    language: 'Cisco PKT',
    homepage: null,
    description:
      'Enterprise multi-floor hotel network architecture modeled in Cisco Packet Tracer (.pkt) with segmented VLANs and routing topology.',
  }),
  'ASCII-CHRISTMAS': Object.freeze({
    language: 'JavaScript',
    homepage: 'https://kh4nhtu0n9.github.io/ASCII-CHRISTMAS/',
    description:
      'Interactive 3D point-cloud ASCII projection scene built with vanilla ES Modules and Z-buffered Canvas 2D character lighting.',
  }),
});

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

  const override = CURATED_REPO_OVERRIDES[name] || null;
  let homepage = null;
  if (typeof rawRepo.homepage === 'string' && isSafeExternalUrl(rawRepo.homepage)) {
    homepage = rawRepo.homepage.trim();
  } else if (override?.homepage && isSafeExternalUrl(override.homepage)) {
    homepage = override.homepage;
  }

  const language =
    typeof rawRepo.language === 'string' && rawRepo.language.trim()
      ? rawRepo.language.trim()
      : override?.language || 'Code';
  const description =
    typeof rawRepo.description === 'string' && rawRepo.description.trim()
      ? rawRepo.description.trim()
      : override?.description || null;
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

export const LANGUAGE_COLORS = Object.freeze({
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Python: '#3572a5',
  'C++': '#f34b7d',
  'Cisco PKT': '#38bdf8',
  HTML: '#e34c26',
  Code: '#34d399',
});

export const TOOL_APPLICATIONS = Object.freeze({
  Linux: 'Host & Kernel Ops',
  'Kali Linux': 'Pentest & Audit Env',
  Wireshark: 'Packet Analysis',
  Binwalk: 'Firmware Extraction',
  'The Sleuth Kit': 'Disk Forensics',
  CyberChef: 'Encoding & Decode',
  ExifTool: 'Metadata Triage',
  Cisco: 'VLAN & Routing',
  'Embedded C': 'Bare-Metal MCU',
  C: 'Systems & Memory',
  'C++': 'Low-Level Tooling',
  RTL8720DN: '2.4/5GHz Wi-Fi & BLE',
  ESP32: 'IoT & Telemetry',
  Betaflight: 'UAV Flight Stack',
  'PX4 Autopilot': 'Autopilot Control',
  Python: 'DFIR & CV Scripts',
  TypeScript: 'Web & API Tooling',
  'GNU Bash': 'Shell Automation',
  Docker: 'Isolated Containers',
  PostgreSQL: 'Relational Data',
});

export const PROFILE_DATA = Object.freeze({
  login: 'KH4NHTU0N9',
  displayName: 'trankhanhtuong',
  pronouns: 'he/him',
  tagline: 'Information Security & Embedded Systems Student',
  bio: 'Information Security & Embedded Systems student passionate about building low-level tools, network analysis utilities, and resilient software.',
  avatarUrl: 'https://avatars.githubusercontent.com/u/121629080?v=4',
  githubUrl: 'https://github.com/KH4NHTU0N9',
  stats: Object.freeze({
    publicRepos: 24,
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
      id: 'security',
      label: 'Security & DFIR',
      focusTier: 'CORE TRACK · TRIAGE',
      subtitle: 'Packet inspection, firmware analysis & forensic workflows',
      items: Object.freeze([
        'Linux',
        'Kali Linux',
        'Wireshark',
        'Binwalk',
        'The Sleuth Kit',
        'CyberChef',
        'ExifTool',
        'Cisco',
      ]),
    }),
    Object.freeze({
      id: 'embedded',
      label: 'Embedded, RF & UAV',
      focusTier: 'HARDWARE · FIRMWARE',
      subtitle: 'Dual-band wireless MCU tooling & autonomous flight control',
      items: Object.freeze([
        'Embedded C',
        'C',
        'C++',
        'RTL8720DN',
        'ESP32',
        'Betaflight',
        'PX4 Autopilot',
      ]),
    }),
    Object.freeze({
      id: 'systems',
      label: 'Systems & Automation',
      focusTier: 'RUNTIME · INFRA',
      subtitle: 'Monitoring agents, scripting & containerized deployment',
      items: Object.freeze([
        'Python',
        'TypeScript',
        'GNU Bash',
        'Docker',
        'PostgreSQL',
      ]),
    }),
  ]),
  technicalLog: Object.freeze([
    Object.freeze({
      id: 'LOG_01',
      tag: 'RF / WIRELESS',
      scope: 'C++ · RTL8720DN (BW16)',
      title: 'Dual-Band 2.4/5GHz Wi-Fi & BLE Audit Firmware',
      summary:
        'Built multi-mode scanning and wireless test routines for Realtek RTL8720DN (BW16) with dedicated SECURITY_AUDIT documentation.',
    }),
    Object.freeze({
      id: 'LOG_02',
      tag: 'LINUX / OPS',
      scope: 'CentOS · systemd · AI Triage',
      title: 'Auto-Healing Systemd Service & Log Monitor',
      summary:
        'Engineered automated recovery for httpd, sshd, crond, mariadb, and nginx with CPU/RAM telemetry and LLM root-cause diagnostics.',
    }),
    Object.freeze({
      id: 'LOG_03',
      tag: 'UAV / VISION',
      scope: 'RPi 5 · Hailo NPU · MLX90640',
      title: 'Thermal-RGB SAR Detection & MQTT UAV Payload',
      summary:
        'Fused hardware-accelerated YOLOv8 inference with thermal sensor readings and live MJPEG stream over dual BW16 IoT telemetry.',
    }),
    Object.freeze({
      id: 'LOG_04',
      tag: 'NET / TOPOLOGY',
      scope: 'Cisco Packet Tracer · NWC204',
      title: 'Segmented Enterprise Hotel Network Design',
      summary:
        'Designed multi-floor campus/hotel VLAN segmentation, routing policies, and service availability inside Cisco Packet Tracer.',
    }),
    Object.freeze({
      id: 'LOG_05',
      tag: 'CTF / CERTS',
      scope: 'Verified Slot · Open',
      title: 'CTF Competitions, Research & Certifications Log',
      summary:
        'Structured slot reserved for upcoming CTF write-ups, student research milestones, and formal cybersecurity certifications.',
    }),
  ]),
  fallbackRepos: Object.freeze([
    Object.freeze({
      name: 'RLT8720dn-MULTI-ATTACK-TOOLS-FOR-WIFI-AND-BLUETOOTH',
      htmlUrl: 'https://github.com/KH4NHTU0N9/RLT8720dn-MULTI-ATTACK-TOOLS-FOR-WIFI-AND-BLUETOOTH',
      homepage: null,
      language: 'C++',
      description:
        CURATED_REPO_OVERRIDES['RLT8720dn-MULTI-ATTACK-TOOLS-FOR-WIFI-AND-BLUETOOTH'].description,
      stars: 1,
      updatedAt: '2026-07-27T08:25:10Z',
    }),
    Object.freeze({
      name: 'DRONE-COMPUTER-VISION-PROJECT',
      htmlUrl: 'https://github.com/KH4NHTU0N9/DRONE-COMPUTER-VISION-PROJECT',
      homepage: null,
      language: 'Python',
      description: CURATED_REPO_OVERRIDES['DRONE-COMPUTER-VISION-PROJECT'].description,
      stars: 1,
      updatedAt: '2026-10-31T01:59:22Z',
    }),
    Object.freeze({
      name: 'FU_IOT102_DroneBasedEnvironmentalMonitoring',
      htmlUrl: 'https://github.com/KH4NHTU0N9/FU_IOT102_DroneBasedEnvironmentalMonitoring',
      homepage: null,
      language: 'JavaScript',
      description:
        CURATED_REPO_OVERRIDES.FU_IOT102_DroneBasedEnvironmentalMonitoring.description,
      stars: 1,
      updatedAt: '2026-09-12T00:00:00Z',
    }),
    Object.freeze({
      name: 'FU_OSG203_UsingAIToMonitoringSystemCTL',
      htmlUrl: 'https://github.com/KH4NHTU0N9/FU_OSG203_UsingAIToMonitoringSystemCTL',
      homepage: null,
      language: 'HTML',
      description: CURATED_REPO_OVERRIDES.FU_OSG203_UsingAIToMonitoringSystemCTL.description,
      stars: 1,
      updatedAt: '2026-09-01T00:00:00Z',
    }),
    Object.freeze({
      name: 'FU_NWC202-PROJECT-HOTEL-NETWORK-SYSTEM-DESIGN',
      htmlUrl: 'https://github.com/KH4NHTU0N9/FU_NWC202-PROJECT-HOTEL-NETWORK-SYSTEM-DESIGN',
      homepage: null,
      language: 'Cisco PKT',
      description:
        CURATED_REPO_OVERRIDES['FU_NWC202-PROJECT-HOTEL-NETWORK-SYSTEM-DESIGN'].description,
      stars: 1,
      updatedAt: '2026-08-15T00:00:00Z',
    }),
    Object.freeze({
      name: 'ASCII-CHRISTMAS',
      htmlUrl: 'https://github.com/KH4NHTU0N9/ASCII-CHRISTMAS',
      homepage: 'https://kh4nhtu0n9.github.io/ASCII-CHRISTMAS/',
      language: 'JavaScript',
      description: CURATED_REPO_OVERRIDES['ASCII-CHRISTMAS'].description,
      stars: 1,
      updatedAt: '2026-11-14T03:18:11Z',
    }),
  ]),
});

/**
 * Fetches live non-fork public repositories from the GitHub REST API, filters strictly
 * to the curated portfolio pin allowlist so unrelated coursework or sensitive tools are
 * excluded, and orders them cleanly with verified descriptions.
 *
 * @param {string} [username]
 * @param {{ fetchImpl?: typeof fetch, limit?: number }} [options]
 * @returns {Promise<{ repos: ReturnType<typeof normalizeRepoRecord>[], source: 'live' | 'fallback' }>}
 */
export async function fetchPublicReposWithFallback(username = PROFILE_DATA.login, options = {}) {
  const fetchFn = options.fetchImpl ?? (typeof fetch === 'function' ? fetch : null);
  const limit = Number.isInteger(options.limit) && options.limit > 0 ? options.limit : 6;
  const fallback = PROFILE_DATA.fallbackRepos.slice(0, limit);

  if (!fetchFn) {
    return { repos: fallback, source: 'fallback' };
  }

  const endpoint = `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated`;
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), 3500) : null;
  try {
    const resp = await fetchFn(endpoint, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: controller ? controller.signal : undefined,
    });
    if (!resp.ok) {
      return { repos: fallback, source: 'fallback' };
    }

    const payload = await resp.json();
    if (!Array.isArray(payload)) {
      return { repos: fallback, source: 'fallback' };
    }

    const pinRank = new Map(PINNED_REPO_ORDER.map((name, idx) => [name, idx]));
    const pagesRepoName = `${username.toLowerCase()}.github.io`;
    const matched = [];

    for (const item of payload) {
      if (item && item.fork) {
        continue;
      }
      const norm = normalizeRepoRecord(item, username);
      if (!norm || norm.name.toLowerCase() === pagesRepoName || !pinRank.has(norm.name)) {
        continue;
      }
      matched.push(norm);
    }

    matched.sort((a, b) => (pinRank.get(a.name) ?? 999) - (pinRank.get(b.name) ?? 999));

    if (matched.length === 0) {
      return { repos: fallback, source: 'fallback' };
    }
    return { repos: matched.slice(0, limit), source: 'live' };
  } catch {
    return { repos: fallback, source: 'fallback' };
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}
