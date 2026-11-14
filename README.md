# KH4NHTU0N9.github.io

Personal developer profile (`https://kh4nhtu0n9.github.io/`) built with **zero external runtime dependencies** (vanilla HTML, CSS, and ES Modules), structured as a **Hardware Cockpit / GCS Instrumentation Workstation** (`GCS.MK2`) pairing a live CAD mathematical viewport with a real-time oscilloscope signal monitor and parametric geometry controls.

## Architecture & Highlights

- **CAD Spatial Viewport (`src/math/mathArt.js`, `src/math/projection3d.js`, `src/math/renderer.js`):**
  - Switchable real-time mathematical manifolds directly from the cockpit bar (`01 WAVE`, `02 SPIRO`, `03 4D`), plus `PAUSE`/`PLAY`, `RESET` (`R`), and fullscreen `SOLO [H]`.
  - Calibrated `48px` / `192px` CAD blueprint datum grid, perimeter ruler ticks, optical corner registration brackets, analytical `X/Y/Z` coordinate vectors & polar floor rings (`buildAxisDescriptors`), node tracking reticles (`N0 [x,y]`), and live hover crosshair.
  - **01 WAVE:** Fourier dispersion sheet (`26 SPLINES · 2,184 PTS`).
  - **02 SPIRO:** Coupled 3D hypotrochoid manifold (`9 RINGS · P:3 Q:7 · 1,980 PTS`).
  - **03 4D:** Tesseract ($\mathbb{R}^4 \to \mathbb{R}^3$ perspective projection under `XW`/`ZW` rotations + meridian rings, `16V / 32E · 256 PTS`).
- **Real-Time Oscilloscope & Control Deck (`src/math/scopeRenderer.js`, `src/ui/profileView.js`, `src/main.js`):**
  - **`CH1 · Y(x,t)` Oscilloscope & Spectrum:** Canvas 2D waveform monitor sampling live displacement values and 18-band spectral energy directly from the active manifold's `scene.points`, reporting true `PK` and `RMS` amplitudes.
  - **2×2 Geometry Parameter Rack:** Interactive sliders modulating real-time `HARMONIC / K` (`0.40×–2.40×`), `AMPLITUDE / A` (`0.35×–1.65×`), `PHASE_RATE` (`0.00×–2.50×`), and `CAM_OPTIC_ZM` (`0.65×–1.65×`).
- **Capability Matrix & Repository Ledger (`src/ui/profileView.js`, `src/data/profile.js`, `styles/main.css`):**
  - **01 // Capability Matrix:** Interactive `> grep` live filter + domain tabs across numbered module tables (`MOD.01` Embedded & Flight, `MOD.02` Security & Forensics, `MOD.03` Systems, Data & Cloud).
  - **02 // Source Repositories:** Ruled 2-column hardware ledger (`REPO_01`..`REPO_06`) with GitHub REST API hydration, `https:` / `mailto:` URL allowlist validation (`isSafeExternalUrl`), and verified static fallback (`PROFILE_DATA`).

## Local Development & Verification

```bash
# Run unit tests (Node.js built-in test runner)
node --test tests/*.test.mjs

# Preview statically with Python HTTP server
python3 -m http.server 4173 --bind 127.0.0.1
```

## References

1. [GitHub Docs — What is GitHub Pages?](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
2. [MDN Web Docs — CanvasRenderingContext2D](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D)
3. [Chrome DevTools Protocol — Runtime & Page Domains](https://chromedevtools.github.io/devtools-protocol/)
4. [Node.js Documentation — Test runner (`node:test`)](https://nodejs.org/api/test.html)
