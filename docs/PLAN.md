# Project Execution Plan — KH4NHTU0N9.github.io

## Phase 1: Initiation (Khởi tạo)
- **Mục tiêu (Objective):** Tích hợp xuyên suốt thẩm mỹ & engine **3D/2D Volumetric ASCII, Math & Binary (`MATH | ASCII | BIN`)** trên toàn bộ portfolio (`https://kh4nhtu0n9.github.io/`) — đồng bộ từ nền vũ trụ toàn trang, ảnh đại diện lấy mẫu pixel thực, Oscilloscope & Spectrum, thanh sóng Horizon cho đến từng mô-đun kỹ năng (`01 // CAPABILITY MATRIX`), thẻ repository (`02 // SOURCE REPOSITORIES`) và terminal footer.
- **Phạm vi (In-scope):**
  - **Nền sao vũ trụ toàn trang (`AmbientSkyRenderer`):** Canvas cố định `#ambient-sky-canvas` (`#020308`) đồng bộ chế độ ký tự phía sau các lớp kính mờ toàn trang.
  - **Khung viewport 3D chính (`AsciiMathRenderer` + `asciiScene.js`):** 3D Z-buffer Blinn-Phong (`01 WAVE`, `02 KNOT`, `03 CORE`) với hover scatter, click burst, pre-baked glow sprites 60fps.
  - **ASCII Portrait & Fallback Sigil (`ProfileView`):** Lấy mẫu màu thực từ avatar GitHub (`crossOrigin="anonymous"`) thành ma trận ký tự màu 16×10 + nút hover/tap chuyển `RAW` <-> `ASCII`.
  - **ASCII Oscilloscope & Spectrum (`OscilloscopeRenderer`):** Vẽ trực tiếp dao động `Y(x,t)` và phổ 16 dải bằng glyph `MATH | ASCII | BIN`.
  - **ASCII Portfolio Modules & Blueprints (`asciiArt.js`):** Divider Horizon động + công tắc `[MATH] [ASCII] [BIN]` giữa trang; 3 mô-đun telemetry động (`MOD.01`..`MOD.03`) với cấu trúc cây `├─`/`└─` và signal meter mỗi kỹ năng; 6 thẻ repo kèm hình sóng toán học/nhị phân riêng biệt tính tất định theo tên & ngôn ngữ; terminal CLI status bar ở footer.
- **Tài liệu tham khảo:**
  1. [GitHub Docs — About GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages)
  2. [MDN Web Docs — CanvasRenderingContext2D](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D)
  3. [MDN Web Docs — CORS settings attributes (`crossorigin`)](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/crossorigin)
  4. [MDN Web Docs — CSS Containment (`contain`)](https://developer.mozilla.org/en-US/docs/Web/CSS/contain)
  5. [Node.js Documentation — Test runner (`node:test`)](https://nodejs.org/api/test.html)

## Phase 2: Planning (Lập kế hoạch)
- **Kiến trúc tối ưu hiệu năng:**
  - Bộ máy 3D (`#math-canvas`) chạy 60fps; nền sao (`#ambient-sky-canvas`) cập nhật nửa tần số khi hoạt động; các `<pre>`/DOM ASCII widgets tiết lưu ở ~9Hz (`115ms`), chỉ ghi DOM khi chuỗi thay đổi và gắn CSS `contain: layout style; overflow: hidden; white-space: pre;` để triệt tiêu reflow.
  - Dừng toàn bộ `rAF` khi bật `PAUSE` (trừ spark nổ tức thời), và kiểm tra chặt độ rộng `<= 36` ký tự ở card để đảm bảo `0px` tràn ngang trên Mobile `390×844`.
  - Đồng bộ cache-bust token `?v=gcs24` trên mọi file HTML/CSS/ESM.

## Phase 3: Execution (Thực thi)
- **Task Tracker:**
  - [x] Mở rộng `src/math/asciiArt.js` cho toàn bộ trình sinh ASCII toàn trang (Horizon, Domain telemetry, Repo blueprint, Skill meter, RGBA pixel-to-ASCII sampler).
  - [x] Tạo `src/math/ambientSkyRenderer.js` + `#ambient-sky-canvas` phủ toàn bộ nền trang web.
  - [x] Chuyển đổi `src/math/scopeRenderer.js` sang vẽ ASCII/Math/Binary waveform + spectrum.
  - [x] Tích hợp toàn diện vào `src/ui/profileView.js`, `src/main.js`, `index.html`, `styles/main.css`.
  - [x] Bổ sung `tests/asciiArt.test.mjs` và cập nhật `tests/rendererResize.test.mjs` (`?v=gcs24`).

## Phase 4: Monitoring (Giám sát)
- Đang chạy `node --test tests/*.test.mjs`, `node --check`, kiểm thử trình duyệt thực tế toàn trang Desktop (`1440×900`, cuộn xuống xem Matrix/Repos/Footer) & Mobile (`390×844`) trên local và live `https://kh4nhtu0n9.github.io/`.

## Phase 5: Closure (Đóng dự án)
- Hoàn tất kiểm thử, dọn file tạm, commit atomic theo từng phần, push `origin/main` và xác thực live URL `https://kh4nhtu0n9.github.io/`.
