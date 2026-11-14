# KH4NHTU0N9.github.io

Personal developer profile (`https://kh4nhtu0n9.github.io/`) built with **zero dependencies** (pure HTML, CSS, and ES Modules), combining a curated engineering portfolio with interactive real-time **3D generative mathematics** on Canvas 2D.

## Highlights

- **Generative Hero Backdrop (`src/math/mathArt.js`, `src/math/renderer.js`):**
  - Switchable live 3D visual presets directly from the hero bar: **Fibonacci Orbit** (golden-angle spherical lattice + gyroscopic orbital rings), **Fourier Aurora** (multi-harmonic interference ribbons), and **Harmonic Torus** (coupled `(p, q)` toroidal braids).
  - Three synchronized spectral palettes (`Aurora Prism`, `Cyber Neon`, `Solar Flare`), drag-to-orbit, click harmonic ripples, cursor magnetic deflection, and `H` for fullscreen art focus.
- **Tech-First Bento Showcase (`src/ui/profileView.js`, `src/data/profile.js`):**
  - Spotlight-reactive domain bento cards (`Embedded & Flight`, `Security & Forensics`, `Systems, Data & Cloud`) across 39 tools.
  - Non-blocking GitHub REST API repository hydration with safe `https:` / `mailto:` URL allowlist checks and verified offline fallback.

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
