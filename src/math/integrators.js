/**
 * Pure numerical differential equation integrators (RK4) and parametric
 * 3D mathematical curve/surface generators for KH4NHTU0N9.github.io.
 */

const TAU = Math.PI * 2;

export function clamp(val, min, max) {
  return val < min ? min : val > max ? max : val;
}
