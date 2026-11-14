# KH4NHTU0N9.github.io · Mathematical Observatory

Interactive GitHub Pages user site (`https://kh4nhtu0n9.github.io/`) built with **zero dependencies** (pure HTML, CSS, and ES Modules) pairing a real-time **3D Mathematical Canvas 2D Engine** with the verified developer profile of `@KH4NHTU0N9`.

## Features

- **4 Real-Time 3D Mathematical Models:**
  - `Lorenz Attractor` (4th-order Runge-Kutta numerical integration with live $\sigma, \rho, \beta$ sliders)
  - `Halvorsen Attractor` (symmetric chaotic attractor with tunable cyclic coupling parameter $a$)
  - `Harmonic Torus Knot` (parametric $(p, q)$ closed manifold with dynamic radius modulation)
  - `Möbius Phase Surface` (ruled wire-grid non-orientable surface with adjustable half-twists)
- **Interactive Canvas 2D Oscilloscope:**
  - Drag to orbit (`yaw`, `pitch`), scroll or pinch to zoom, hover to deflect local vertices, click to emit harmonic wave rings, double-click (`R`) to reset camera, press `H` for Fullscreen Zen mode, or `1`–`4` to switch models.
  - 3 high-contrast observatory themes (`Quantum Cyan`, `Solar Plasma`, `CRT Phosphor`) with quantized color lookup tables and Retina DPR scaling (`<= 2x`).
- **Safe Profile & GitHub Hydration:**
  - Domain-filtered engineering stack (`Embedded & Flight`, `Security & Forensics`, `Systems, Data & Cloud`), verified repository showcase, and safe `https:`/`mailto:` URL allowlist checks.

## Local Development & Verification

```bash
# Run unit tests (Node.js built-in test runner)
node --test tests/*.test.mjs

# Preview statically with Python HTTP server
python3 -m http.server 4173
```

Open `http://127.0.0.1:4173/` in any modern browser.

## References

1. [GitHub Docs — What is GitHub Pages?](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
2. [MDN Web Docs — CanvasRenderingContext2D](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D)
3. [Edward N. Lorenz (1963) — Deterministic Nonperiodic Flow](https://journals.ametsoc.org/view/journals/atsc/20/2/1520-0469_1963_020_0130_dnf_2_0_co_2.xml)
4. [Press et al., Numerical Recipes — Runge-Kutta Method](https://en.wikipedia.org/wiki/Runge%E2%80%93Kutta_methods)
