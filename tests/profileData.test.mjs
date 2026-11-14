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
