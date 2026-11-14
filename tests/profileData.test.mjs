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
