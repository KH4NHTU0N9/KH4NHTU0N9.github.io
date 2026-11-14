# Project Execution Plan — KH4NHTU0N9.github.io

## Phase 1: Initiation (Khởi tạo)
- **Mục tiêu (Objective):** Xây dựng trang giới thiệu cá nhân (`https://kh4nhtu0n9.github.io/`) kết hợp **Operator Console & Real-Time Signal Scope (`UNIT_01`)** bên trái và **3D Volumetric ASCII & Math Renderer** lấy cảm hứng trực tiếp từ repo `ASCII-CHRISTMAS` ở khung phải (gỡ bỏ hoàn toàn khung `CAM_01 // MANIFOLD` và reticle/trục CAD rườm rà).
- **Phạm vi (In-scope):**
  - Cockpit 2 cột desktop (`UNIT_01` Console + Volumetric ASCII/Math Canvas) và xếp dọc mobile (Viewport trên, `UNIT_01` dưới).
  - Bộ kết xuất 3D ASCII/Math Z-buffer (`src/math/asciiScene.js`, `src/math/asciiRenderer.js`) với nền đêm `#020308`, cực quang shimmering, sao lấp lánh, sao băng định kỳ, hạt trôi tiền/hậu cảnh, chiếu sáng Blinn-Phong + rim + ambient light bounce, scatter khi hover chuột, nổ tia sáng khi click, pre-baked glow sprites 60fps không cấp phát gradient lặp trong vòng vẽ, và 3 chế độ ký tự chuyển đổi trực tiếp: **`MATH`** (` ·+-±×÷π∑∫∞`), **`ASCII`** (` .:-=+*#%@`), **`BIN`** (` 00010111`).
  - 3 hình học 3D thể tích thực: **`01 WAVE`** (harmonic interference lattice + ripples), **`02 KNOT`** (`(3,5)` Frenet-framed torus knot tube), **`03 CORE`** (Fibonacci geodesic sphere + 3 gyroscope gimbal rings).
  - Oscilloscope thời gian thực (`src/math/scopeRenderer.js`) và 4 thanh trượt phần cứng (`freq`, `amp`, `speed`, `zoom`) tác động đồng thời lên đám mây ký tự 3D và sóng phổ.
  - Bảng kỹ thuật `01 // CAPABILITY MATRIX` (`> grep`) và `02 // SOURCE REPOSITORIES`.
- **Tài liệu tham khảo:**
  1. [GitHub Docs — What is GitHub Pages?](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
  2. [MDN Web Docs — CanvasRenderingContext2D](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D)
  3. [MDN Web Docs — Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events)
  4. [Node.js Documentation — Test runner (`node:test`)](https://nodejs.org/api/test.html)

## Phase 2: Planning (Lập kế hoạch)
- **Kiến trúc hệ thống:**
  - `src/math/mathArt.js`: Giữ nguyên API `ART_PRESETS`, `sampleMathArtScene`, `normalizeArtParams` và xuất `spectralRgbUnit(t)` để dùng chung bảng phổ.
  - `src/math/asciiScene.js`: Buffer tái sử dụng `Float32Array`/`Uint8Array` (tối đa 6000 điểm, 0 GC churn), sinh `positions`, `normals`, `colors`, `kinds`, `phase`, `shine` cho `wave`, `spiro`, `tesseract` cùng trường sao & hạt trôi `createSkyField()`.
  - `src/math/asciiRenderer.js`: Tách biệt `createAsciiGrid()`, `projectVolumetricToGrid()`, `BurstPool` (test thuần trong Node) và `AsciiMathRenderer` (quản lý DPR backing store, pre-baked 32×32 glow sprites tối ưu 60fps, render 2 pass).
  - `index.html`, `styles/main.css`, `src/main.js`, `src/math/scopeRenderer.js`, `src/ui/profileView.js`: Gỡ `CAM_01`, thêm pill kính mờ kiểu `ASCII-CHRISTMAS` + công tắc `MATH | ASCII | BIN`, khóa cache `?v=gcs23`.

## Phase 3: Execution (Thực thi)
- **Task Tracker:**
  - [x] Export `spectralRgbUnit()` trong `src/math/mathArt.js` mà không phá tương thích ngược.
  - [x] Xây dựng `src/math/asciiScene.js` & `src/math/asciiRenderer.js` chuẩn Z-buffer, Blinn-Phong lighting, hover scatter, click burst, pre-baked glow sprites.
  - [x] Gỡ bỏ `CAM_01 // MANIFOLD`, đường trục/thước CAD, và tệp thừa `src/math/renderer.js`; cập nhật UI tối giản phủ kính `#020308` + nút `MATH | ASCII | BIN`.
  - [x] Đồng bộ `scopeRenderer.js`, `main.js`, `profileView.js`, `index.html`, `styles/main.css` lên token `?v=gcs23`.
  - [x] Mở rộng bộ test `tests/rendererResize.test.mjs` kiểm chứng cả Z-buffer math/ascii/binary projection.

## Phase 4: Monitoring (Giám sát)
- Đang chạy `node --test tests/*.test.mjs`, `node --check src/**/*.js`, kiểm thử trình duyệt thực tế Desktop (`1440×900`) & Mobile (`390×844`) trên local server và live `https://kh4nhtu0n9.github.io/`.

## Phase 5: Closure (Đóng dự án)
- Hoàn tất kiểm thử, dọn file tạm, commit atomic theo từng phần, push `origin/main` và xác thực live URL `https://kh4nhtu0n9.github.io/`.
