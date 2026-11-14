/**
 * Pure numerical differential equation integrators (RK4) and parametric
 * 3D mathematical curve/surface generators for KH4NHTU0N9.github.io.
 */

const TAU = Math.PI * 2;

export function clamp(val, min, max) {
  return val < min ? min : val > max ? max : val;
}

/**
 * Advances a 3D autonomous ODE state vector [x, y, z] by dt using
 * classical 4th-order Runge-Kutta (RK4) numerical integration.
 */
export function rk4Step(state, dt, derivativeFn) {
  const [x, y, z] = state;
  const k1 = derivativeFn(x, y, z);
  const k2 = derivativeFn(
    x + 0.5 * dt * k1[0],
    y + 0.5 * dt * k1[1],
    z + 0.5 * dt * k1[2]
  );
  const k3 = derivativeFn(
    x + 0.5 * dt * k2[0],
    y + 0.5 * dt * k2[1],
    z + 0.5 * dt * k2[2]
  );
  const k4 = derivativeFn(
    x + dt * k3[0],
    y + dt * k3[1],
    z + dt * k3[2]
  );

  const nx = x + (dt / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
  const ny = y + (dt / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
  const nz = z + (dt / 6) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]);
  const speed = Math.hypot(k1[0], k1[1], k1[2]);

  return { next: [nx, ny, nz], derivative: k1, speed };
}

function lorenzDerivative(sigma, rho, beta) {
  return (x, y, z) => [sigma * (y - x), x * (rho - z) - y, x * y - beta * z];
}

function halvorsenDerivative(a) {
  return (x, y, z) => [
    -a * x - 4 * y - 4 * z - y * y,
    -a * y - 4 * z - 4 * x - z * z,
    -a * z - 4 * x - 4 * y - x * x,
  ];
}

/**
 * Catalog of interactive mathematical systems exposed to the UI & Canvas renderer.
 */
export const MATH_MODELS = Object.freeze({
  lorenz: {
    id: 'lorenz',
    name: 'Lorenz Attractor',
    subtitle: 'Deterministic Chaotic Flow (1963)',
    kind: 'ode',
    equations: [
      'dx/dt = σ(y − x)',
      'dy/dt = x(ρ − z) − y',
      'dz/dt = xy − βz',
    ],
    params: [
      { key: 'sigma', label: 'σ', min: 4, max: 18, step: 0.2, default: 10 },
      { key: 'rho', label: 'ρ', min: 14, max: 42, step: 0.5, default: 28 },
      { key: 'beta', label: 'β', min: 1.0, max: 4.5, step: 0.05, default: 2.67 },
    ],
  },
  halvorsen: {
    id: 'halvorsen',
    name: 'Halvorsen Attractor',
    subtitle: 'Cyclic 3-Fold Chaotic Symmetry',
    kind: 'ode',
    equations: [
      'dx/dt = −ax − 4y − 4z − y²',
      'dy/dt = −ay − 4z − 4x − z²',
      'dz/dt = −az − 4x − 4y − x²',
    ],
    params: [{ key: 'a', label: 'a', min: 1.25, max: 1.95, step: 0.02, default: 1.4 }],
  },
  torusKnot: {
    id: 'torusKnot',
    name: 'Harmonic Torus Knot',
    subtitle: 'Parametric (p, q) Topological Braid',
    kind: 'parametric',
    equations: [
      'r(t) = R + r₀cos(qt)',
      'x(t) = r(t)cos(pt)',
      'y(t) = r₀sin(qt) + 0.12sin(3t + φ),  z(t) = r(t)sin(pt)',
    ],
    params: [
      { key: 'p', label: 'p', min: 2, max: 7, step: 1, default: 3 },
      { key: 'q', label: 'q', min: 2, max: 9, step: 1, default: 5 },
      { key: 'minor', label: 'r₀', min: 0.16, max: 0.44, step: 0.02, default: 0.3 },
    ],
  },
  mobius: {
    id: 'mobius',
    name: 'Möbius Phase Surface',
    subtitle: 'Non-Orientable Geodesic Manifold',
    kind: 'parametric',
    equations: [
      'x(u,v) = (R + v·cos(u/2))cos(u)',
      'y(u,v) = v·sin(u/2) + 0.10·sin(2u + φ)',
      'z(u,v) = (R + v·cos(u/2))sin(u)',
    ],
    params: [
      { key: 'twists', label: 'k', min: 1, max: 5, step: 1, default: 1 },
      { key: 'width', label: 'v', min: 0.18, max: 0.48, step: 0.02, default: 0.34 },
    ],
  },
});

export function getDefaultParams(modelId) {
  const def = MATH_MODELS[modelId] || MATH_MODELS.lorenz;
  const out = {};
  for (const p of def.params) out[p.key] = p.default;
  return out;
}

const odeTrajectoryCache = new Map();

/**
 * Integrates a complete continuous ODE trajectory with warmup settle + bounded normalization.
 */
function sampleOdeTrajectory(modelId, rawParams, timeSec, sampleCount) {
  const isHalvorsen = modelId === 'halvorsen';
  const aVal = clamp(rawParams.a ?? 1.4, 1.2, 2.05);
  const sigmaVal = clamp(rawParams.sigma ?? 10, 2, 24);
  const rhoVal = clamp(rawParams.rho ?? 28, 10, 50);
  const betaVal = clamp(rawParams.beta ?? 2.67, 0.5, 6);

  const cacheKey = isHalvorsen
    ? `halvorsen|${aVal.toFixed(3)}|${sampleCount}`
    : `lorenz|${sigmaVal.toFixed(2)}|${rhoVal.toFixed(2)}|${betaVal.toFixed(3)}|${sampleCount}`;

  let cached = odeTrajectoryCache.get(cacheKey);
  if (!cached) {
    const dt = isHalvorsen ? 0.0042 : 0.0068;
    const seed = isHalvorsen ? [-1.48, -1.51, 2.04] : [-6.8, -8.2, 24.5];
    const deriv = isHalvorsen
      ? halvorsenDerivative(aVal)
      : lorenzDerivative(sigmaVal, rhoVal, betaVal);

    let state = [...seed];
    const warmup = isHalvorsen ? 520 : 900;

    for (let i = 0; i < warmup; i++) {
      const step = rk4Step(state, dt, deriv);
      if (!Number.isFinite(step.next[0]) || Math.hypot(...step.next) > 220) {
        state = [...seed];
      } else {
        state = step.next;
      }
    }

    const points = new Float32Array(sampleCount * 3);
    const speeds = new Float32Array(sampleCount);
    const rawStates = new Float32Array(sampleCount * 3);
    const rawDerivs = new Float32Array(sampleCount * 3);
    const scale = isHalvorsen ? 1 / 8.8 : 1 / 21.0;
    const zOffset = isHalvorsen ? 0 : -24.8;
    const maxSpeedRef = isHalvorsen ? 46 : 84;

    for (let i = 0; i < sampleCount; i++) {
      const step = rk4Step(state, dt, deriv);
      if (!Number.isFinite(step.next[0]) || Math.hypot(...step.next) > 220) {
        state = [...seed];
      } else {
        state = step.next;
      }

      const i3 = i * 3;
      points[i3] = state[0] * scale;
      points[i3 + 1] = (state[2] + zOffset) * scale;
      points[i3 + 2] = state[1] * scale;
      speeds[i] = clamp(step.speed / maxSpeedRef, 0.06, 1);

      rawStates[i3] = state[0];
      rawStates[i3 + 1] = state[1];
      rawStates[i3 + 2] = state[2];
      rawDerivs[i3] = step.derivative[0];
      rawDerivs[i3 + 1] = step.derivative[1];
      rawDerivs[i3 + 2] = step.derivative[2];
    }

    cached = {
      points,
      speeds,
      rawStates,
      rawDerivs,
      polylines: [{ start: 0, count: sampleCount, closed: false }],
    };
    if (odeTrajectoryCache.size > 12) {
      odeTrajectoryCache.clear();
    }
    odeTrajectoryCache.set(cacheKey, cached);
  }

  const phaseOffset = (timeSec * 0.085) % 1;
  const h0 = Math.floor(((phaseOffset + 0.0) % 1) * sampleCount);
  const h1 = Math.floor(((phaseOffset + 0.34) % 1) * sampleCount);
  const h2 = Math.floor(((phaseOffset + 0.68) % 1) * sampleCount);
  const p3 = h0 * 3;

  return {
    points: cached.points,
    speeds: cached.speeds,
    polylines: cached.polylines,
    headIndices: [h0, h1, h2],
    stateSample: [cached.rawStates[p3], cached.rawStates[p3 + 1], cached.rawStates[p3 + 2]],
    derivativeSample: [cached.rawDerivs[p3], cached.rawDerivs[p3 + 1], cached.rawDerivs[p3 + 2]],
  };
}
