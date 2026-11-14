import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MATH_MODELS,
  getDefaultParams,
  rk4Step,
  sampleMathScene,
} from '../src/math/integrators.js';

test('rk4Step matches exact exponential decay y\' = -y to 1e-6 accuracy', () => {
  let state = [1, 0, 0];
  const dt = 0.02;
  const deriv = (x) => [-x, 0, 0];
  for (let i = 0; i < 50; i++) {
    state = rk4Step(state, dt, deriv).next;
  }
  assert.ok(Math.abs(state[0] - Math.exp(-1)) < 1e-6);
});

test('all math models produce bounded finite coordinates without NaN', () => {
  for (const id of Object.keys(MATH_MODELS)) {
    const params = getDefaultParams(id);
    const result = sampleMathScene(id, params, 2.5, 900);
    assert.ok(result.points.length > 0);
    assert.ok(result.polylines.length > 0);
    assert.ok(result.headIndices.length > 0);
    for (let i = 0; i < result.points.length; i++) {
      assert.ok(Number.isFinite(result.points[i]), `${id} emitted non-finite point at ${i}`);
      assert.ok(Math.abs(result.points[i]) < 5, `${id} coordinate blew up: ${result.points[i]}`);
    }
    for (const s of result.speeds) {
      assert.ok(Number.isFinite(s) && s >= 0 && s <= 1);
    }
  }
});

test('extreme out-of-range ODE parameters clamp safely without diverging', () => {
  const res = sampleMathScene('lorenz', { sigma: 999, rho: 999, beta: 0.001 }, 10, 600);
  for (let i = 0; i < res.points.length; i++) {
    assert.ok(Number.isFinite(res.points[i]));
  }
});
