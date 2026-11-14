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
