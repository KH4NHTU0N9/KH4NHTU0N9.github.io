import { clamp, sampleMathArtScene, spectralRgba } from './mathArt.js';
import { buildAxisDescriptors, projectPoint3D } from './projection3d.js';

const LUT_SIZE = 48;
const TAU = Math.PI * 2;
const POINTER_DEFLECT_RADIUS_PX = 132;
const POINTER_DEFLECT_STRENGTH_PX = 20;
const PULSE_LIFETIME_SEC = 1.1;
const MAX_ACTIVE_PULSES = 6;
const MICRO_STARS = 44;
const DATUM_STEP_PX = 72;

const PRISM_CORE_LUT = Array.from({ length: LUT_SIZE }, (_, i) =>
  spectralRgba(i / LUT_SIZE, 0.92),
);
const PRISM_HALO_LUT = Array.from({ length: LUT_SIZE }, (_, i) =>
  spectralRgba(i / LUT_SIZE, 0.17),
);

function buildMicroField() {
  const field = new Array(MICRO_STARS);
  for (let i = 0; i < MICRO_STARS; i++) {
    field[i] = {
      nx: ((i * 79 + 13) % 997) / 997,
      ny: ((i * 157 + 37) % 991) / 991,
      phase: i * 0.71,
    };
  }
  return field;
}

/**
 * Full-bleed Canvas 2D renderer on pitch-black #050505 with optical prism spectral lines.
 */
export class MathCanvasRenderer {
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.widthCss = 1280;
    this.heightCss = 800;
    this.dpr = 1;

    this.zen = false;
    this.pointer = { x: 0, y: 0, active: false };
    this.pulses = [];
    this.microField = buildMicroField();
    this.axisDescriptors = buildAxisDescriptors(1.38);

    this.cap = 0;
    this.projX = new Float32Array(0);
    this.projY = new Float32Array(0);
    this.projDepth = new Float32Array(0);
    this.projVis = new Uint8Array(0);

    this.resize();
  }

  setZenMode(zen) {
    this.zen = Boolean(zen);
  }

  setPointerPosition(xPx, yPx, active) {
    this.pointer.x = xPx;
    this.pointer.y = yPx;
    this.pointer.active = Boolean(active);
  }

  triggerWavePulse(xPx, yPx, timeSec) {
    if (this.pulses.length >= MAX_ACTIVE_PULSES) {
      this.pulses.shift();
    }
    this.pulses.push({
      x: xPx,
      y: yPx,
      birthSec: timeSec,
      maxRadius: Math.min(this.widthCss, this.heightCss) * 0.34,
    });
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(240, Math.floor(rect.width || window.innerWidth || 1280));
    const h = Math.max(240, Math.floor(rect.height || window.innerHeight || 800));
    const rawDpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const dpr = clamp(rawDpr, 1, 2);

    if (w === this.widthCss && h === this.heightCss && dpr === this.dpr) {
      return;
    }
    this.widthCss = w;
    this.heightCss = h;
    this.dpr = dpr;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
  }

  ensureCapacity(count) {
    if (count <= this.cap) {
      return;
    }
    this.cap = count;
    this.projX = new Float32Array(count);
    this.projY = new Float32Array(count);
    this.projDepth = new Float32Array(count);
    this.projVis = new Uint8Array(count);
  }

  render({ presetId, camera, timeSec, scrollProgress = 0 }) {
    const ctx = this.ctx;
    if (!ctx) {
      return;
    }

    const w = this.widthCss;
    const h = this.heightCss;

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, w, h);

    this.drawEngineeringDatum(ctx, w, h);
    this.drawMicroField(ctx, w, h, timeSec);

    const activePulses = this.pulses.filter((p) => timeSec - p.birthSec < PULSE_LIFETIME_SEC);
    this.pulses = activePulses;

    const scene = sampleMathArtScene(presetId, timeSec);
    const vertCount = scene.points.length / 3;
    this.ensureCapacity(vertCount);

    // Subtle spatial composition: right half on desktop hero, upper stage on mobile hero
    const wideDesktop = w >= 920 && !this.zen;
    const portraitHero = !wideDesktop && !this.zen;
    const cxRatio = wideDesktop ? 0.72 - scrollProgress * 0.16 : 0.5;
    const cyRatio = wideDesktop
      ? 0.5 - scrollProgress * 0.06
      : portraitHero
        ? 0.22 + scrollProgress * 0.16
        : 0.5;

    this.projectPoints(
      scene.points,
      vertCount,
      w,
      h,
      camera,
      cxRatio,
      cyRatio,
      activePulses,
      timeSec,
    );

    const ambientFade = this.zen ? 1 : clamp(1 - scrollProgress * 0.42, 0.45, 1);
    ctx.save();
    ctx.globalAlpha = ambientFade;

    this.drawSpatialAxes(ctx, w, h, camera, cxRatio, cyRatio);
    this.drawPolylines(ctx, scene, PRISM_HALO_LUT, 3.2);
    this.drawPolylines(ctx, scene, PRISM_CORE_LUT, 1.32);
    this.drawNodes(ctx, scene.nodeIndices);
    this.drawWavePulses(ctx, timeSec);
    this.drawPointerCrosshair(ctx, w, h);

    ctx.restore();
  }

  drawEngineeringDatum(ctx, w, h) {
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(245, 245, 242, 0.032)';
    ctx.beginPath();
    for (let x = DATUM_STEP_PX; x < w; x += DATUM_STEP_PX) {
      const gx = x + 0.5;
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, h);
    }
    for (let y = DATUM_STEP_PX; y < h; y += DATUM_STEP_PX) {
      const gy = y + 0.5;
      ctx.moveTo(0, gy);
      ctx.lineTo(w, gy);
    }
    ctx.stroke();

    // Fiducial + intersections every 3 cells
    const major = DATUM_STEP_PX * 3;
    ctx.strokeStyle = 'rgba(245, 245, 242, 0.1)';
    ctx.beginPath();
    for (let x = major; x < w; x += major) {
      for (let y = major; y < h; y += major) {
        const cx = x + 0.5;
        const cy = y + 0.5;
        ctx.moveTo(cx - 4, cy);
        ctx.lineTo(cx + 4, cy);
        ctx.moveTo(cx, cy - 4);
        ctx.lineTo(cx, cy + 4);
      }
    }
    // Right-edge calibration vernier ticks
    const rightX = w - 0.5;
    for (let y = 72, idx = 0; y < h - 24; y += 18, idx++) {
      const len = idx % 4 === 0 ? 9 : 4;
      const ty = y + 0.5;
      ctx.moveTo(rightX - len, ty);
      ctx.lineTo(rightX, ty);
    }
    ctx.stroke();
    ctx.restore();
  }

  drawSpatialAxes(ctx, w, h, camera, cxRatio, cyRatio) {
    const { axes, rings } = this.axisDescriptors;
    ctx.save();
    ctx.lineWidth = 1;

    // Polar floor datum rings
    ctx.strokeStyle = 'rgba(245, 245, 242, 0.07)';
    for (const ring of rings) {
      let open = false;
      ctx.beginPath();
      for (const pt of ring) {
        const p = projectPoint3D(pt[0], pt[1], pt[2], w, h, camera, cxRatio, cyRatio);
        if (!p.visible) {
          open = false;
          continue;
        }
        if (!open) {
          ctx.moveTo(p.sx, p.sy);
          open = true;
        } else {
          ctx.lineTo(p.sx, p.sy);
        }
      }
      ctx.stroke();
    }

    // Orthogonal X/Y/Z axis vectors
    ctx.font = '9px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textBaseline = 'middle';
    for (const axis of axes) {
      const pa = projectPoint3D(axis.a[0], axis.a[1], axis.a[2], w, h, camera, cxRatio, cyRatio);
      const pb = projectPoint3D(axis.b[0], axis.b[1], axis.b[2], w, h, camera, cxRatio, cyRatio);
      if (pa.visible && pb.visible) {
        ctx.strokeStyle = 'rgba(245, 245, 242, 0.13)';
        ctx.beginPath();
        ctx.moveTo(pa.sx, pa.sy);
        ctx.lineTo(pb.sx, pb.sy);
        ctx.stroke();

        ctx.fillStyle = 'rgba(245, 245, 242, 0.36)';
        ctx.fillText(`+${axis.label.toUpperCase()}`, pb.sx + 4, pb.sy);
      }
    }

    ctx.restore();
  }

  drawMicroField(ctx, w, h, timeSec) {
    ctx.save();
    for (const s of this.microField) {
      const alpha = 0.14 + 0.22 * (0.5 + 0.5 * Math.sin(timeSec * 1.1 + s.phase));
      ctx.fillStyle = `rgba(244, 244, 242, ${alpha.toFixed(3)})`;
      ctx.fillRect(Math.round(s.nx * w), Math.round(s.ny * h), 1.2, 1.2);
    }
    ctx.restore();
  }

  projectPoints(points, count, w, h, camera, cxRatio, cyRatio, pulses, timeSec) {
    const pActive = this.pointer.active;
    const px = this.pointer.x;
    const py = this.pointer.y;
    const deflectSq = POINTER_DEFLECT_RADIUS_PX * POINTER_DEFLECT_RADIUS_PX;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const p = projectPoint3D(
        points[i3],
        points[i3 + 1],
        points[i3 + 2],
        w,
        h,
        camera,
        cxRatio,
        cyRatio,
      );
      if (!p.visible) {
        this.projVis[i] = 0;
        continue;
      }

      let sx = p.sx;
      let sy = p.sy;

      if (pActive) {
        const dx = sx - px;
        const dy = sy - py;
        const d2 = dx * dx + dy * dy;
        if (d2 > 0.5 && d2 < deflectSq) {
          const dist = Math.sqrt(d2);
          const falloff = 1 - dist / POINTER_DEFLECT_RADIUS_PX;
          const push = falloff * falloff * POINTER_DEFLECT_STRENGTH_PX;
          sx += (dx / dist) * push;
          sy += (dy / dist) * push;
        }
      }

      for (const pulse of pulses) {
        const ageNorm = (timeSec - pulse.birthSec) / PULSE_LIFETIME_SEC;
        const radius = ageNorm * pulse.maxRadius;
        const dx = sx - pulse.x;
        const dy = sy - pulse.y;
        const dist = Math.hypot(dx, dy);
        const band = Math.abs(dist - radius);
        if (dist > 1 && band < 30) {
          const amp = (1 - band / 30) * (1 - ageNorm) * 9;
          sx += (dx / dist) * amp;
          sy += (dy / dist) * amp;
        }
      }

      this.projX[i] = sx;
      this.projY[i] = sy;
      this.projDepth[i] = p.depthNorm;
      this.projVis[i] = 1;
    }
  }

  drawPolylines(ctx, scene, paletteLut, lineWidth) {
    ctx.save();
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';

    const lastIdx = LUT_SIZE - 1;
    const { wavelengths, polylines } = scene;

    for (const poly of polylines) {
      const end = poly.start + poly.count;
      let activeBucket = -1;
      let pathOpen = false;

      for (let i = poly.start; i < end - 1; i++) {
        if (!this.projVis[i] || !this.projVis[i + 1]) {
          if (pathOpen) {
            ctx.stroke();
            pathOpen = false;
            activeBucket = -1;
          }
          continue;
        }

        const bucket = Math.min(lastIdx, Math.floor(((wavelengths[i] % 1) + 1) % 1 * LUT_SIZE));
        if (!pathOpen || bucket !== activeBucket) {
          if (pathOpen) {
            ctx.stroke();
          }
          ctx.strokeStyle = paletteLut[bucket];
          ctx.beginPath();
          ctx.moveTo(this.projX[i], this.projY[i]);
          activeBucket = bucket;
          pathOpen = true;
        }
        ctx.lineTo(this.projX[i + 1], this.projY[i + 1]);
      }

      if (poly.closed && poly.count > 2) {
        const first = poly.start;
        const last = end - 1;
        if (this.projVis[last] && this.projVis[first]) {
          if (!pathOpen) {
            const bucket = Math.min(lastIdx, Math.floor(((wavelengths[last] % 1) + 1) % 1 * LUT_SIZE));
            ctx.strokeStyle = paletteLut[bucket];
            ctx.beginPath();
            ctx.moveTo(this.projX[last], this.projY[last]);
            pathOpen = true;
          }
          ctx.lineTo(this.projX[first], this.projY[first]);
        }
      }

      if (pathOpen) {
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  drawNodes(ctx, nodeIndices) {
    if (!nodeIndices || nodeIndices.length === 0) {
      return;
    }
    ctx.save();
    ctx.font = '9px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 1;

    let tracked = 0;
    for (const idx of nodeIndices) {
      if (idx < 0 || idx >= this.projVis.length || !this.projVis[idx]) {
        continue;
      }
      const x = this.projX[idx];
      const y = this.projY[idx];

      // Core focal point
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, TAU);
      ctx.fill();

      // Target reticle + hardware accent box
      ctx.strokeStyle = 'rgba(255, 77, 0, 0.62)';
      ctx.strokeRect(Math.round(x) - 5.5, Math.round(y) - 5.5, 11, 11);

      ctx.strokeStyle = 'rgba(245, 245, 242, 0.8)';
      ctx.beginPath();
      ctx.moveTo(x - 9, y);
      ctx.lineTo(x + 9, y);
      ctx.moveTo(x, y - 9);
      ctx.lineTo(x, y + 9);
      ctx.stroke();

      if (this.widthCss >= 640) {
        ctx.fillStyle = 'rgba(245, 245, 242, 0.56)';
        ctx.fillText(`N${tracked} ${Math.round(x)},${Math.round(y)}`, x + 10, y - 8);
      }
      tracked++;
    }
    ctx.restore();
  }

  drawWavePulses(ctx, timeSec) {
    if (this.pulses.length === 0) {
      return;
    }
    ctx.save();
    ctx.lineWidth = 1;
    for (const pulse of this.pulses) {
      const ageNorm = clamp((timeSec - pulse.birthSec) / PULSE_LIFETIME_SEC, 0, 1);
      const radius = Math.max(4, ageNorm * pulse.maxRadius);
      const alpha = (1 - ageNorm) * 0.72;
      ctx.strokeStyle = spectralRgba(ageNorm, alpha);
      ctx.beginPath();
      ctx.arc(pulse.x, pulse.y, radius, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawPointerCrosshair(ctx, w, h) {
    if (!this.pointer.active || this.pointer.x <= 0 || this.pointer.y <= 0 || w < 640) {
      return;
    }
    const px = Math.round(this.pointer.x) + 0.5;
    const py = Math.round(this.pointer.y) + 0.5;
    if (px >= w || py >= h) {
      return;
    }

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 77, 0, 0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px - 10, py);
    ctx.lineTo(px - 3, py);
    ctx.moveTo(px + 3, py);
    ctx.lineTo(px + 10, py);
    ctx.moveTo(px, py - 10);
    ctx.lineTo(px, py - 3);
    ctx.moveTo(px, py + 3);
    ctx.lineTo(px, py + 10);
    ctx.stroke();
    ctx.restore();
  }
}
