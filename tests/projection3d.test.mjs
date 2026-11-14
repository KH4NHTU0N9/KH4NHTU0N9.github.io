import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildAxisDescriptors,
  createCameraState,
  projectPoint3D,
} from '../src/math/projection3d.js';

test('projectPoint3D projects origin cleanly inside viewport center', () => {
  const cam = createCameraState();
  const pt = projectPoint3D(0, 0, 0, 1200, 800, cam);
  assert.equal(pt.visible, true);
  assert.ok(Math.abs(pt.sx - 1200 * 0.52) < 1e-6);
  assert.ok(Math.abs(pt.sy - 400) < 1e-6);
  assert.ok(pt.zCam > 3);
});

test('projectPoint3D rejects points behind near clip plane', () => {
  const cam = { ...createCameraState(), yawRad: 0, pitchRad: 0 };
  const behind = projectPoint3D(0, 0, -5, 1000, 800, cam);
  assert.equal(behind.visible, false);
});
