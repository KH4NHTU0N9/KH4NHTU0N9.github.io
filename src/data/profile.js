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
