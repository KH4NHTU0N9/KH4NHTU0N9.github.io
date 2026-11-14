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
export function projectPoint3D(
  x,
  y,
  z,
  widthPx,
  heightPx,
  camera,
  centerXRatio = 0.52,
  centerYRatio = 0.5,
) {
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
    sx: widthPx * centerXRatio + rx * proj * scalePx,
    sy: heightPx * centerYRatio - py * proj * scalePx,
    zCam,
    depthNorm: Math.max(0.15, Math.min(1, 1.35 - (zCam - 2.3) / 3.2)),
    visible: true,
  };
}

/**
 * Generates analytical X/Y/Z axis vectors and XZ polar grid rings
 * for visual grounding in phase space.
 */
export function buildAxisDescriptors(extent = 1.25) {
  const axes = [
    { label: 'x', color: 'rgba(56, 189, 248, 0.35)', a: [-extent, 0, 0], b: [extent, 0, 0] },
    { label: 'y', color: 'rgba(167, 139, 250, 0.35)', a: [0, -extent, 0], b: [0, extent, 0] },
    { label: 'z', color: 'rgba(52, 211, 153, 0.35)', a: [0, 0, -extent], b: [0, 0, extent] },
  ];

  const rings = [];
  const floorY = -1.08;
  for (const radius of [0.55, 1.05]) {
    const pts = [];
    const steps = 48;
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      pts.push([Math.cos(a) * radius, floorY, Math.sin(a) * radius]);
    }
    rings.push(pts);
  }

  return { axes, rings };
}
