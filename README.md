# KH4NHTU0N9.github.io

Personal developer profile (`https://kh4nhtu0n9.github.io/`) built with **zero external runtime dependencies** (vanilla HTML, CSS, and ES Modules), pairing an **Editorial Swiss Grid** typographic layout on Carbon Pitch-Black (`#050505`) with a full-bleed real-time **Optical Prism 3D Mathematics** canvas on Canvas 2D.

## Architecture & Highlights

- **Full-Bleed Optical Prism Engine (`src/math/mathArt.js`, `src/math/renderer.js`, `src/math/projection3d.js`):**
  - Switchable real-time mathematical manifolds directly from the `1px` Swiss top navigation bar (`01 WAVE`, `02 SPIRO`, `03 4D`), plus `PAUSE`/`PLAY` and distraction-free `SOLO [H]` (`Space`, `R`, `H`, `1–3` hotkeys).
  - **01 WAVE:** Coupled Fourier ribbon sheet with continuous spectral dispersion (`PRISM_CORE_LUT` / `PRISM_HALO_LUT` via `spectralRgba`).
  - **02 SPIRO:** Coupled 3D hypotrochoid rings with orbital harmonic phase modulation.
  - **03 4D:** Tesseract ($\mathbb{R}^4 \to \mathbb{R}^3$ perspective projection under `XW` / `ZW` rotations) enclosed in concentric reference rings.
  - Interactive pointer orbit across non-interactive viewport regions, click spectral pulse rings, magnetic cursor deflection, and scroll parallax.
- **Editorial Swiss Grid Portfolio (`src/ui/profileView.js`, `src/data/profile.js`, `styles/main.css`):**
  - Strict `0px` architectural corners, `1px` structural hairline rules, Bone White (`#f5f5f2`) typography on `#050505`, zero glassmorphism or pill walls.
  - **01 / Technical Index:** Ruled 3-column typographic index filterable via clean text tabs across `Embedded & Flight`, `Security & Forensics`, and `Systems, Data & Cloud`.
  - **02 / Selected Repositories:** Ruled 2-column repository ledger with GitHub REST API hydration, `https:` / `mailto:` URL sanitization (`isSafeExternalUrl`), and verified static fallback (`PROFILE_DATA`).

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
3. [MDN Web Docs — Web APIs: Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events)
