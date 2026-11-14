import assert from 'node:assert/strict';
import test from 'node:test';
import { ART_PRESETS, clamp, sampleMathArtScene } from '../src/math/mathArt.js';

test('clamp constrains out-of-range numbers safely', () => {
  assert.equal(clamp(-5, 0, 10), 0);
  assert.equal(clamp(42, 0, 10), 10);
  assert.equal(clamp(4.5, 0, 10), 4.5);
});

test('all generative math presets emit finite bounded 3D vertices and ribbons', () => {
  for (const presetId of Object.keys(ART_PRESETS)) {
    const scene = sampleMathArtScene(presetId, 3.25);
    assert.ok(scene.nodeCoords.length > 0);
    assert.ok(scene.ribbonPoints.length > 0);
    assert.ok(scene.ribbons.length > 0);

    for (let i = 0; i < scene.nodeCoords.length; i++) {
      assert.ok(Number.isFinite(scene.nodeCoords[i]), `${presetId} nodeCoords non-finite`);
      assert.ok(Math.abs(scene.nodeCoords[i]) < 3, `${presetId} nodeCoords out of bounds`);
    }
    for (let i = 0; i < scene.ribbonPoints.length; i++) {
      assert.ok(Number.isFinite(scene.ribbonPoints[i]), `${presetId} ribbonPoints non-finite`);
      assert.ok(Math.abs(scene.ribbonPoints[i]) < 3, `${presetId} ribbonPoints out of bounds`);
    }

    const totalVerts = scene.ribbonPoints.length / 3;
    for (const idx of scene.tracerIndices) {
      assert.ok(idx >= 0 && idx < totalVerts, `${presetId} tracer index out of range`);
    }
  }
});

test('sampleMathArtScene falls back safely on unknown preset or NaN time', () => {
  const scene = sampleMathArtScene('non-existent', Number.NaN);
  assert.equal(scene.preset, 'constellation');
  assert.ok(Number.isFinite(scene.nodeCoords[0]));
});
