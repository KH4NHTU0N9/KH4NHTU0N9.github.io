import assert from 'node:assert/strict';
import test from 'node:test';
import {
  generateFallbackSigilRows,
  sampleImagePixelsToAscii,
} from '../src/math/asciiArt.js';

test('sampleImagePixelsToAscii converts RGBA portrait buffer across math, ascii, and binary modes', () => {
  const rgba = new Uint8ClampedArray(4 * 4 * 4);
  for (let i = 0; i < rgba.length; i += 4) {
    rgba[i] = 240;
    rgba[i + 1] = 120;
    rgba[i + 2] = 160;
    rgba[i + 3] = 255;
  }

  const sampledMath = sampleImagePixelsToAscii(rgba, 4, 4, 16, 10, 'math');
  assert.equal(sampledMath.length, 10);
  assert.equal(sampledMath[0].length, 16);
  assert.match(sampledMath[0][0].css, /^rgb\(\d+,\d+,\d+\)$/);

  const sampledAscii = sampleImagePixelsToAscii(rgba, 4, 4, 16, 10, 'ascii');
  assert.equal(sampledAscii.length, 10);
  assert.equal(sampledAscii[0].length, 16);

  const sampledBin = sampleImagePixelsToAscii(rgba, 4, 4, 16, 10, 'binary');
  for (const row of sampledBin) {
    for (const cell of row) {
      assert.ok(cell.ch === '0' || cell.ch === '1');
    }
  }
});

test('sampleImagePixelsToAscii falls back cleanly on empty buffer and generateFallbackSigilRows stays bounded', () => {
  const emptyFallback = sampleImagePixelsToAscii(new Uint8ClampedArray(0), 0, 0, 16, 10, 'math');
  assert.equal(emptyFallback.length, 10);
  assert.equal(emptyFallback[0].length, 16);

  for (const mode of ['math', 'ascii', 'binary']) {
    const fallback = generateFallbackSigilRows(16, 10, 0.4, mode);
    assert.equal(fallback.length, 10);
    assert.equal(fallback[0].length, 16);
    for (const row of fallback) {
      for (const cell of row) {
        assert.match(cell.css, /^rgb\(\d+,\d+,\d+\)$/);
        if (mode === 'binary') {
          assert.ok(cell.ch === '0' || cell.ch === '1');
        }
      }
    }
  }
});
