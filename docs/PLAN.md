# Project Execution Plan — KH4NHTU0N9.github.io

## Phase 1: Initiation (Khởi tạo)
- **Mục tiêu (Objective):** Xây dựng trang giới thiệu cá nhân (`https://kh4nhtu0n9.github.io/`) theo chuẩn **Hardware Cockpit / GCS.MK2 Workstation** (`A1 + A2`): phối màu Carbon Obsidian `#040507` + Signal Orange `#ff4d00`, đóng khung rõ ràng bảng điều khiển vận hành (Oscilloscope + Sliders) song song với CAD Manifold Viewport.
- **Phạm vi (In-scope):**
  - Cockpit 2 cột desktop (`UNIT_01` Console + `CAM_01` CAD Viewport) và xếp dọc mobile (`CAM_01` trên, `UNIT_01` dưới).
  - Oscilloscope thời gian thực (`src/math/scopeRenderer.js`) lấy mẫu trực tiếp từ `scene.points` kèm chỉ số `PK` & `RMS`.
  - Bộ 4 thanh trượt phần cứng điều chỉnh trực tiếp `freq`, `amp`, `speed`, `zoom` trên hình học 3D/4D.
  - Bảng mô-đun kỹ thuật `01 // CAPABILITY MATRIX` (hỗ trợ `> grep`) và sổ cái `02 // SOURCE REPOSITORIES`.
- **Tài liệu tham khảo:**
  1. [GitHub Docs — What is GitHub Pages?](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
  2. [MDN Web Docs — CanvasRenderingContext2D](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D)
  3. [Chrome DevTools Protocol — Runtime & Page Domains](https://chromedevtools.github.io/devtools-protocol/)
  4. [Node.js Documentation — Test runner (`node:test`)](https://nodejs.org/api/test.html)

## Phase 2: Planning (Lập kế hoạch)
- **Kiến trúc hệ thống:**
  - `src/math/mathArt.js`: Hỗ trợ `normalizeArtParams({ freq, amp })` trên cả 3 mô hình `wave`, `spiro`, `tesseract` giữ nguyên giới hạn tọa độ an toàn.
  - `src/math/renderer.js`: Vẽ lưới CAD `48px`/`192px` rõ nét, thước chia cạnh, tâm chữ thập cam, `buildAxisDescriptors(1.36)`, node targeting reticle và trả về `scene` mỗi frame cho oscilloscope tái sử dụng.
  - `src/math/scopeRenderer.js`: Vẽ dao động ký sóng `Y(x,t)` và biểu đồ phổ 18 dải từ `scene.points`, trả về `{ peak, rms }` thực.
  - `src/ui/profileView.js` & `src/main.js`: Kết nối slider phần cứng, nút `RESET` / phím `[R]`, `SOLO [H]` mở rộng `#viewport-pane` toàn màn hình `100vw × 100dvh`, và bộ lọc `> grep`.

## Phase 3: Execution (Thực thi)
- **Task Tracker:**
  - [x] Mở rộng `src/math/mathArt.js` và `tests/mathArt.test.mjs` cho điều biến `freq` / `amp`.
  - [x] Tạo `src/math/scopeRenderer.js` vẽ Oscilloscope & 18-band spectrum thời gian thực.
  - [x] Nâng cấp `src/math/renderer.js` sang CAD Viewport `0.5, 0.5` chuyển tọa độ chuột nội bộ `toCanvasLocal`.
  - [x] Thiết kế lại `index.html`, `src/ui/profileView.js`, `src/main.js`, `styles/main.css` thành Hardware Cockpit 2 cột + Responsive Mobile + Zen Fix.
- **DevLog:**
  - Chuyển đổi từ Swiss minimal sang **Hardware Cockpit / GCS.MK2** giải quyết dứt điểm phản hồi bố cục đơn điệu: đưa viewport 3D vào khung máy đo CAD rõ ràng cạnh bảng điều khiển có Oscilloscope thật và 4 thanh điều biến trực tiếp.
  - Vá 2 điểm từ kiểm thử ảnh chụp thực tế: ẩn `.hud-guide` trong `.is-zen` để tránh đè nút `RETURN TO GCS [H]`, và thêm `scroll-margin-top` đồng bộ cho `.sections-stack` trên mobile.

## Phase 4: Monitoring (Giám sát)
- **Kiểm thử đơn vị (`node --test tests/*.test.mjs`):** **12/12 pass**, `fail 0`, `skipped 0`, `SYNTAX_OK` qua `node --check` trên toàn bộ ES modules trong `src/`.
- **Kiểm thử trình duyệt Headless Chrome CDP:**
  - Zero lỗi runtime: `consoleErrors: []`, `exceptions: []`, `logErrors: []`.
  - Desktop (`1440×900`, `2x`): `overflow: false`, `deckHeight: 856`, tương tác slider (`1.90×`, `1.45×`, `1.20×`) cập nhật trực tiếp `scopeStats` (`PK 0.61 · RMS 0.26` → `PK 0.93 · RMS 0.39`), `RESET` khôi phục `1.00×`, `zenStage: { w: 1440, h: 900, isZen: true }`.
  - Mobile (`390×844`, `3x`): `overflow: false` ở cả Hero (`stageY: 123`, `stageH: 304`) lẫn Capability Matrix / Ledger.

## Phase 5: Closure (Đóng dự án)
- Hoàn tất dọn tệp nháp kiểm thử, commit atomic theo từng module, push `origin/main` và kiểm tra HTTP `200` trên `https://kh4nhtu0n9.github.io/`.
