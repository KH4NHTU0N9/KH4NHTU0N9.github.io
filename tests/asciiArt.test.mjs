import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatSkillMeter,
  generateDomainBanner,
  generateFallbackSigilRows,
  generateHorizonBanner,
  generateRepoAsciiPreview,
  sampleImagePixelsToAscii,
} from '../src/math/asciiArt.js';

test('generateHorizonBanner produces bounded single-line wave banners for all glyph modes', () => {
  for (const mode of ['math', 'ascii', 'binary']) {
    const line = generateHorizonBanner(72, 1.5, mode);
    assert.equal(line.length, 72);
    assert.ok(!line.includes('\n'), 'horizon banner must be single-line');
    if (mode === 'binary') {
      assert.ok(/^[01|-]+$/.test(line), `binary horizon invalid chars: ${line}`);
    }
  }
});

test('generateDomainBanner produces compact 3x36 telemetry widgets across all domains and modes', () => {
  for (const domainId of ['embedded', 'security', 'systems']) {
    for (const mode of ['math', 'ascii', 'binary']) {
      const lines = generateDomainBanner(domainId, 2.2, mode);
      assert.equal(lines.length, 3, `${domainId} should have 3 lines`);
      for (const line of lines) {
        assert.equal(line.length, 36, `${domainId} line length must be 36`);
      }
    }
  }
});

test('generateRepoAsciiPreview produces deterministic unique 3x34 blueprints per repo', () => {
  const a = generateRepoAsciiPreview('ASCII-CHRISTMAS', 'JavaScript', 1, 0.5, 'math');
  const b = generateRepoAsciiPreview('DRONE-COMPUTER-VISION-PROJECT', 'Python', 1, 0.5, 'math');
  const bin = generateRepoAsciiPreview('ASCII-CHRISTMAS', 'JavaScript', 1, 0.5, 'binary');

  assert.equal(a.lines.length, 3);
  assert.equal(a.lines[0].length, 34);
  assert.notEqual(a.lines.join('\n'), b.lines.join('\n'));
  assert.match(a.accentCss, /^rgb\(\d+,\s*\d+,\s*\d+\)$/);

  for (const line of bin.lines) {
    assert.ok(/^[01]{34}$/.test(line), `binary repo blueprint must be pure 0/1: ${line}`);
  }
});

test('formatSkillMeter returns consistent 4-glyph indicators for each mode', () => {
  const m = formatSkillMeter(2, 10, 1.0, 'math');
  const a = formatSkillMeter(2, 10, 1.0, 'ascii');
  const b = formatSkillMeter(2, 10, 1.0, 'binary');
  assert.equal(m.length, 4);
  assert.equal(a.length, 4);
  assert.equal(b.length, 4);
  assert.ok(/^[01]{4}$/.test(b));
});

test('sampleImagePixelsToAscii converts RGBA portrait buffer and falls back cleanly on empty input', () => {
  const rgba = new Uint8ClampedArray(4 * 4 * 4);
  for (let i = 0; i < rgba.length; i += 4) {
    rgba[i] = 240;
    rgba[i + 1] = 120;
    rgba[i + 2] = 160;
    rgba[i + 3] = 255;
  }

  const sampled = sampleImagePixelsToAscii(rgba, 4, 4, 16, 10, 'math');
  assert.equal(sampled.length, 10);
  assert.equal(sampled[0].length, 16);
  assert.match(sampled[0][0].css, /^rgb\(\d+,\d+,\d+\)$/);

  const sampledBin = sampleImagePixelsToAscii(rgba, 4, 4, 16, 10, 'binary');
  for (const row of sampledBin) {
    for (const cell of row) {
      assert.ok(cell.ch === '0' || cell.ch === '1');
    }
  }

  const fallback = generateFallbackSigilRows(16, 10, 0.4, 'ascii');
  assert.equal(fallback.length, 10);
  assert.equal(fallback[0].length, 16);
});
