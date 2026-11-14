import assert from 'node:assert/strict';
import test from 'node:test';
import { ART_PRESETS, clamp, sampleMathArtScene, spectralRgba } from '../src/math/mathArt.js';

test('clamp constrains out-of-range numbers safely', () => {
  assert.equal(clamp(-5, 0, 10), 0);
  assert.equal(clamp(42, 0, 10), 10);
  assert.equal(clamp(4.5, 0, 10), 4.5);
});

test('spectralRgba formats valid rgba wavelength strings across gamut', () => {
  assert.match(spectralRgba(0, 0.9), /^rgba\(\d+,\d+,\d+,0\.9\)$/);
  assert.match(spectralRgba(0.5, 1), /^rgba\(\d+,\d+,\d+,1\)$/);
  assert.match(spectralRgba(-0.25, 0.5), /^rgba\(\d+,\d+,\d+,0\.5\)$/);
});

test('all spectral math art presets emit bounded finite coordinates and polylines', () => {
  for (const presetId of Object.keys(ART_PRESETS)) {
    const scene = sampleMathArtScene(presetId, 2.4);
    assert.ok(scene.points.length > 0);
    assert.ok(scene.polylines.length > 0);

    for (let i = 0; i < scene.points.length; i++) {
      assert.ok(Number.isFinite(scene.points[i]), `${presetId} non-finite coordinate at ${i}`);
      assert.ok(Math.abs(scene.points[i]) < 4, `${presetId} coordinate exceeded bounds: ${scene.points[i]}`);
    }

    const vertexCount = scene.points.length / 3;
    for (const idx of scene.nodeIndices) {
      assert.ok(idx >= 0 && idx < vertexCount, `${presetId} node index out of range`);
    }
  }
});

test('sampleMathArtScene defaults cleanly on invalid preset or NaN time', () => {
  const scene = sampleMathArtScene('invalid-mode', Number.NaN);
  assert.equal(scene.preset, 'wave');
  assert.ok(Number.isFinite(scene.points[0]));
});
