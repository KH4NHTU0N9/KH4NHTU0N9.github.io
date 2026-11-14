# KH4NHTU0N9.github.io

Personal developer profile (`https://kh4nhtu0n9.github.io/`) built with **zero external runtime dependencies** (vanilla HTML, CSS, and ES Modules), pairing a **Hardware / CAD Instrumentation Swiss Grid** on Carbon Pitch-Black (`#050505`) with a full-bleed real-time **Optical Prism 3D Mathematics** viewport on Canvas 2D.

## Architecture & Highlights

- **CAD Spatial Grid & Optical Prism Engine (`src/math/mathArt.js`, `src/math/projection3d.js`, `src/math/renderer.js`):**
  - Switchable real-time mathematical manifolds directly from the `1px` top bar (`01 WAVE`, `02 SPIRO`, `03 4D`), plus `PAUSE`/`PLAY`, `RESET` (`R`), and distraction-free `SOLO [H]`.
  - Renders a calibrated `72px` CAD blueprint datum grid, major intersection crosshairs, right-edge vernier ticks, 3D `X/Y/Z` coordinate vectors & polar floor datum rings (`buildAxisDescriptors`), optical node targeting reticles with live screen coordinates, and an interactive hover crosshair.
  - **01 WAVE:** Fourier dispersion sheet (`26 SPLINES · 2,184 PTS`).
  - **02 SPIRO:** Coupled 3D hypotrochoid manifold (`9 RINGS · P:3 Q:7 · 1,980 PTS`).
  - **03 4D:** Tesseract ($\mathbb{R}^4 \to \mathbb{R}^3$ perspective projection under `XW`/`ZW` rotations + meridian rings, `16V / 32E · 256 PTS`).
- **Live Systems Telemetry & Capability Matrix (`src/main.js`, `src/ui/profileView.js`, `src/data/profile.js`, `styles/main.css`):**
  - Synchronized header attitude readout (`AZ · EL · T`) and Hero `MANIFOLD_KERNEL` / `GOVERNING_EQ` / `MESH / AZIMUTH` datasheet driven directly by runtime camera and generator state.
  - **01 / Capability Matrix:** Interactive `> grep` live filter + domain tabs across indexed module tables (`MOD.01` Embedded & Flight, `MOD.02` Security & Forensics, `MOD.03` Systems, Data & Cloud).
  - **02 / Source Repositories:** Ruled 2-column hardware ledger (`REPO_01`..`REPO_06`) with GitHub REST API hydration, `https:` / `mailto:` URL allowlist validation (`isSafeExternalUrl`), and verified static fallback (`PROFILE_DATA`).

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
