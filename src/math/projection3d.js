/**
 * 3D perspective camera projection & analytical coordinate axis geometry.
 */

export function createCameraState() {
  return {
    yawRad: 0.45,
    pitchRad: 0.28,
    zoom: 1.0,
    cameraDist: 3.85,
    focalScale: 2.35,
  };
}
