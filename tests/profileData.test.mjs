import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PROFILE_DATA,
  fetchPublicReposWithFallback,
  isSafeExternalUrl,
  normalizeRepoRecord,
} from '../src/data/profile.js';

test('isSafeExternalUrl strictly enforces https and optional mailto allowlist', () => {
  assert.equal(isSafeExternalUrl('https://github.com/KH4NHTU0N9'), true);
  assert.equal(isSafeExternalUrl('http://github.com/KH4NHTU0N9'), false);
  assert.equal(isSafeExternalUrl('javascript:alert(1)'), false);
  assert.equal(isSafeExternalUrl('data:text/html,<script>alert(1)</script>'), false);
  assert.equal(isSafeExternalUrl('mailto:khanhtuong2302@gmail.com'), false);
  assert.equal(isSafeExternalUrl('mailto:khanhtuong2302@gmail.com', { allowMailto: true }), true);
  assert.equal(isSafeExternalUrl('mailto:invalid-email', { allowMailto: true }), false);
});

test('all embedded PROFILE_DATA links pass strict URL safety validation', () => {
  assert.equal(isSafeExternalUrl(PROFILE_DATA.avatarUrl), true);
  assert.equal(isSafeExternalUrl(PROFILE_DATA.githubUrl), true);

  for (const s of PROFILE_DATA.socials) {
    assert.equal(isSafeExternalUrl(s.url, { allowMailto: s.allowMailto }), true, s.label);
  }
  for (const repo of PROFILE_DATA.fallbackRepos) {
    assert.equal(isSafeExternalUrl(repo.htmlUrl), true, repo.name);
    if (repo.homepage !== null) {
      assert.equal(isSafeExternalUrl(repo.homepage), true, `${repo.name} homepage`);
    }
  }
  for (const note of PROFILE_DATA.mathNotes) {
    assert.equal(isSafeExternalUrl(note.url), true, note.title);
  }
});

test('normalizeRepoRecord filters profile README repo and rejects unsafe URLs', () => {
  assert.equal(
    normalizeRepoRecord({ name: 'KH4NHTU0N9', html_url: 'https://github.com/KH4NHTU0N9/KH4NHTU0N9' }),
    null,
  );
  assert.equal(
    normalizeRepoRecord({ name: 'XSS', html_url: 'javascript:alert(1)' }),
    null,
  );

  const normalized = normalizeRepoRecord({
    name: 'DEMO-REPO',
    html_url: 'https://github.com/KH4NHTU0N9/DEMO-REPO',
    homepage: 'http://insecure.example.com',
    language: 'Rust',
    description: null,
    stargazers_count: 3,
  });
  assert.deepEqual(normalized, {
    name: 'DEMO-REPO',
    htmlUrl: 'https://github.com/KH4NHTU0N9/DEMO-REPO',
    homepage: null,
    language: 'Rust',
    description: null,
    stars: 3,
    updatedAt: null,
  });
});

test('fetchPublicReposWithFallback returns verified fallback when network fails and filters forks live', async () => {
  const failingResult = await fetchPublicReposWithFallback('KH4NHTU0N9', {
    fetchImpl: async () => {
      throw new Error('offline');
    },
  });
  assert.equal(failingResult.source, 'fallback');
  assert.equal(failingResult.repos.length, 6);

  const liveResult = await fetchPublicReposWithFallback('KH4NHTU0N9', {
    limit: 2,
    fetchImpl: async () => ({
      ok: true,
      json: async () => [
        { name: 'FORKED', fork: true, html_url: 'https://github.com/KH4NHTU0N9/FORKED' },
        { name: 'KH4NHTU0N9', fork: false, html_url: 'https://github.com/KH4NHTU0N9/KH4NHTU0N9' },
        {
          name: 'ASCII-CHRISTMAS',
          fork: false,
          html_url: 'https://github.com/KH4NHTU0N9/ASCII-CHRISTMAS',
          language: 'JavaScript',
          stargazers_count: 1,
        },
        {
          name: 'DRONE-COMPUTER-VISION-PROJECT',
          fork: false,
          html_url: 'https://github.com/KH4NHTU0N9/DRONE-COMPUTER-VISION-PROJECT',
          language: 'Python',
          stargazers_count: 1,
        },
      ],
    }),
  });
  assert.equal(liveResult.source, 'live');
  assert.equal(liveResult.repos.length, 2);
  assert.equal(liveResult.repos[0].name, 'ASCII-CHRISTMAS');
  assert.equal(liveResult.repos[1].name, 'DRONE-COMPUTER-VISION-PROJECT');
});
