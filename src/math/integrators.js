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
});

export function getDefaultParams(modelId) {
  const def = MATH_MODELS[modelId] || MATH_MODELS.lorenz;
  const out = {};
  for (const p of def.params) out[p.key] = p.default;
  return out;
}
