import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import {
  AsciiMathRenderer,
  BurstPool,
  createAsciiGrid,
  projectVolumetricToGrid,
} from '../src/math/asciiRenderer.js';
import {
  ASCII_SCENE_SPECS,
  buildAsciiScene,
  createSkyField,
} from '../src/math/asciiScene.js';
import { createCameraState } from '../src/math/projection3d.js';
import { OscilloscopeRenderer } from '../src/math/scopeRenderer.js';

function createStubCanvas(rectWidth, rectHeight) {
  return {
    width: 300,
    height: 150,
    getBoundingClientRect() {
      return { width: rectWidth, height: rectHeight, left: 0, top: 0 };
    },
    getContext() {
      return null;
    },
  };
}

test('AsciiMathRenderer updates backing store at 680x640 dpr 1 instead of keeping 300x150 default', () => {
  const canvas = createStubCanvas(680, 640);
  const renderer = new AsciiMathRenderer(canvas);
  renderer.resize();
  assert.equal(canvas.width, 680);
  assert.equal(canvas.height, 640);
  assert.equal(renderer.widthCss, 680);
  assert.equal(renderer.heightCss, 640);
  assert.ok(renderer.grid.cols >= 44 && renderer.grid.rows >= 34);
});

test('OscilloscopeRenderer updates backing store at 360x84 dpr 1 instead of keeping 300x150 default', () => {
  const canvas = createStubCanvas(360, 84);
  const scope = new OscilloscopeRenderer(canvas);
  assert.equal(canvas.width, 360);
  assert.equal(canvas.height, 84);
  assert.equal(scope.widthCss, 360);
  assert.equal(scope.heightCss, 84);
});

test('buildAsciiScene generates finite bounded 3D volumetric clouds across presets', () => {
  for (const presetId of Object.keys(ASCII_SCENE_SPECS)) {
    const scene = buildAsciiScene(presetId, 1.25, { freq: 1.3, amp: 1.1 });
    assert.ok(scene.count >= 1500, `${presetId} count should exceed 1500`);
    for (let i = 0; i < scene.count * 3; i++) {
      assert.ok(Number.isFinite(scene.positions[i]), `${presetId} position[${i}] finite`);
      assert.ok(Number.isFinite(scene.normals[i]), `${presetId} normal[${i}] finite`);
      assert.ok(Math.abs(scene.positions[i]) < 5, `${presetId} position[${i}] bounded`);
    }
  }
});

test('projectVolumetricToGrid populates math, ascii, and pure binary glyph modes', () => {
  const sky = createSkyField(2026);
  const camera = createCameraState();
  const scene = buildAsciiScene('spiro', 0.8, { freq: 1.0, amp: 1.0 });
  const bursts = new BurstPool();
  bursts.spawnUv(0.5, 0.5, 0.25);
  bursts.step(0.05);

  const gridMath = createAsciiGrid(96, 48);
  const resMath = projectVolumetricToGrid(gridMath, scene, camera, sky, {
    widthCss: 580,
    heightCss: 450,
    timeSec: 0.8,
    glyphMode: 'math',
    cursorUv: { u: 0.45, v: 0.5, active: true },
    bursts,
  });
  assert.ok(resMath.activeGlyphs > 200, 'math mode renders substantial glyphs');

  const gridAscii = createAsciiGrid(96, 48);
  const resAscii = projectVolumetricToGrid(gridAscii, scene, camera, sky, {
    widthCss: 580,
    heightCss: 450,
    timeSec: 0.8,
    glyphMode: 'ascii',
  });
  assert.ok(resAscii.activeGlyphs > 200, 'ascii mode renders substantial glyphs');

  const gridBin = createAsciiGrid(96, 48);
  const resBin = projectVolumetricToGrid(gridBin, scene, camera, sky, {
    widthCss: 580,
    heightCss: 450,
    timeSec: 0.8,
    glyphMode: 'binary',
    bursts,
  });
  assert.ok(resBin.activeGlyphs > 200, 'binary mode renders substantial glyphs');
  for (const ch of gridBin.chars) {
    assert.ok(ch === ' ' || ch === '0' || ch === '1', `unexpected char in binary mode: "${ch}"`);
  }
});

test('HTML and ESM module graph share matching cache-bust version tokens', async () => {
  const html = await fs.readFile(new URL('../index.html', import.meta.url), 'utf8');
  const cssMatch = html.match(/href="\.\/styles\/main\.css\?v=([^"]+)"/);
  const jsMatch = html.match(/src="\.\/src\/main\.js\?v=([^"]+)"/);
  assert.ok(cssMatch, 'index.html must version styles/main.css');
  assert.ok(jsMatch, 'index.html must version src/main.js');
  assert.equal(cssMatch[1], jsMatch[1]);

  const token = jsMatch[1];
  const modulesToCheck = [
    '../src/main.js',
    '../src/math/asciiRenderer.js',
    '../src/math/asciiScene.js',
    '../src/math/scopeRenderer.js',
    '../src/ui/profileView.js',
  ];
  for (const relPath of modulesToCheck) {
    const src = await fs.readFile(new URL(relPath, import.meta.url), 'utf8');
    const localImports = [...src.matchAll(/from\s+['"](\.[^'"]+)['"]/g)].map((m) => m[1]);
    assert.ok(localImports.length > 0, `${relPath} must have relative imports`);
    for (const spec of localImports) {
      assert.ok(
        spec.endsWith(`?v=${token}`),
        `${relPath} import "${spec}" must end with ?v=${token}`,
      );
    }
  }
});
