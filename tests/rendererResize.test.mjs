import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import { MathCanvasRenderer } from '../src/math/renderer.js';
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

test('MathCanvasRenderer updates backing store at 680x640 dpr 1 instead of keeping 300x150 default', () => {
  const canvas = createStubCanvas(680, 640);
  const renderer = new MathCanvasRenderer(canvas);
  assert.equal(canvas.width, 680);
  assert.equal(canvas.height, 640);
  assert.equal(renderer.widthCss, 680);
  assert.equal(renderer.heightCss, 640);
});

test('OscilloscopeRenderer updates backing store at 360x84 dpr 1 instead of keeping 300x150 default', () => {
  const canvas = createStubCanvas(360, 84);
  const scope = new OscilloscopeRenderer(canvas);
  assert.equal(canvas.width, 360);
  assert.equal(canvas.height, 84);
  assert.equal(scope.widthCss, 360);
  assert.equal(scope.heightCss, 84);
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
    '../src/math/renderer.js',
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
