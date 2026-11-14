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

/**
 * Projects a single 3D world-space coordinate onto 2D screen pixels.
 */
export function projectPoint3D(x, y, z, widthPx, heightPx, camera) {
  const cy = Math.cos(camera.yawRad);
  const sy = Math.sin(camera.yawRad);
  const cp = Math.cos(camera.pitchRad);
  const sp = Math.sin(camera.pitchRad);

  const rx = x * cy + z * sy;
  const rz = -x * sy + z * cy;
  const py = y * cp + rz * sp;
  const pz = -y * sp + rz * cp;

  const zCam = camera.cameraDist + pz;
  if (zCam <= 0.4) {
    return { sx: 0, sy: 0, zCam, depthNorm: 0, visible: false };
  }

  const scalePx = Math.min(widthPx, heightPx) * 0.35 * camera.zoom;
  const proj = camera.focalScale / zCam;

  return {
    sx: widthPx * 0.52 + rx * proj * scalePx,
    sy: heightPx * 0.5 - py * proj * scalePx,
    zCam,
    depthNorm: Math.max(0.15, Math.min(1, 1.35 - (zCam - 2.3) / 3.2)),
    visible: true,
  };
}
