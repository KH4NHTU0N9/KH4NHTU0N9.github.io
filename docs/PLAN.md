# Project Execution Plan — KH4NHTU0N9.github.io

## Phase 1: Initiation (Khởi tạo)
- **Mục tiêu (Objective):** Xây dựng trang giới thiệu cá nhân (`https://kh4nhtu0n9.github.io/`) theo chuẩn **Editorial Swiss Grid + Carbon Pitch-Black (`#050505`)** kết hợp **Full-Bleed Optical Prism 3D Mathematics Canvas** chạy mượt trên GitHub Pages với zero dependencies.
- **Phạm vi (In-scope):**
  - Canvas 2D hiệu năng cao (`src/math/mathArt.js`, `src/math/projection3d.js`, `src/math/renderer.js`) gồm 3 cấu trúc toán học (`01 WAVE`, `02 SPIRO`, `03 4D` Tesseract $\mathbb{R}^4 \to \mathbb{R}^3$).
  - Bố cục Swiss Grid thuần nét `1px` hairline, `border-radius: 0`, bảng chỉ mục kỹ thuật 3 cột (`01 / TECHNICAL INDEX`) và sổ cái repository 2 cột (`02 / SELECTED REPOSITORIES`).
  - Hỗ trợ chế độ toàn màn hình tập trung `SOLO [H]` (Zen Mode), tương tác xoay/ripple toàn vùng trống viewport, và làm mới danh sách repo từ GitHub API có fallback an toàn (`src/data/profile.js`).
- **Ngoài phạm vi (Out-scope):**
  - Framework nặng (React/Three.js), card kính mờ glassmorphism, pill badges rải rác, hoặc hiệu ứng gradient tím/cyan kiểu AI template.
- **Tài liệu tham khảo:**
  1. [GitHub Docs — What is GitHub Pages?](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
  2. [MDN Web Docs — CanvasRenderingContext2D](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D)
  3. [Node.js Documentation — Test runner (`node:test`)](https://nodejs.org/api/test.html)

## Phase 2: Planning (Lập kế hoạch)
- **Kiến trúc hệ thống:**
  - `index.html`: `<canvas id="math-canvas">` fixed full-bleed nền `#050505`, phủ phía trên là `<div id="app-shell">` (`header.top-bar`, `main.editorial-main` chứa `#hero-content` + `#profile-sections`, `footer#site-footer`).
  - `src/math/mathArt.js`: Tạo geometry & bảng màu tán sắc quang học `spectralRgba(t, alpha)` cho `wave`, `spiro`, `tesseract`.
  - `src/math/projection3d.js` & `src/math/renderer.js`: Chiếu phối cảnh 3D, LUT 48 bậc (`PRISM_CORE_LUT` / `PRISM_HALO_LUT`), reticle nodes, pointer magnetic deflection và scroll parallax.
  - `src/ui/profileView.js` & `styles/main.css`: Bố cục Swiss hairline grid (`index-grid`, `ledger-grid`, `text-tabs`), scrim đọc chữ cho Hero, tối ưu responsive không tràn ngang (`overflow-x: clip`, `overflow-wrap: anywhere`).
- **Quản trị rủi ro (Risk Management):**
  - *Rủi ro chữ khó đọc trên nền đồ họa:* Khắc phục bằng gradient scrim hướng trái cho `.hero-section::before` và nền tối bán trong suốt có kiểm soát cho `.sections-stack`.
  - *Rủi ro tràn ngang trên mobile (`390px`) với handle dài `trankhanhtuong`:* Sử dụng `clamp()` kích thước hiển thị và `overflow-wrap: anywhere`.
  - *Rủi ro URL không hợp lệ khi hydrate GitHub API:* Kiểm tra allowlist qua `isSafeExternalUrl` (`https:` / `mailto:`).
- **Milestones:**
  - M1: Thay lõi toán học sang 3 preset Optical Prism + unit tests (`src/math/mathArt.js`, `tests/mathArt.test.mjs`).
  - M2: Chuyển UI/CSS sang Swiss Editorial Carbon `#050505` (`index.html`, `src/main.js`, `src/ui/profileView.js`, `styles/main.css`).
  - M3: Kiểm thử `node --test` và Headless Chrome E2E trên Desktop (`1440×900`) & Mobile (`390×844`).
  - M4: Commit atomic sạch và đẩy lên `origin/main`.

## Phase 3: Execution (Thực thi)
- **Task Tracker:**
  - [x] Viết lại `src/math/mathArt.js` và `tests/mathArt.test.mjs` cho `wave`, `spiro`, `tesseract` & `spectralRgba`.
  - [x] Cập nhật `src/math/renderer.js` với nền `#050505`, `PRISM_CORE_LUT`/`PRISM_HALO_LUT`, reticle nodes, scroll parallax.
  - [x] Viết lại `index.html`, `src/main.js`, `src/ui/profileView.js` theo bố cục Swiss Editorial Grid.
  - [x] Triển khai `styles/main.css` chuẩn `0px` radius, `1px` structural hairlines, responsive `<= 760px`.
  - [x] Chạy `node --test tests/*.test.mjs` (11/11 pass) và kiểm thử trực quan Headless Chrome (Desktop `1440×900` + Mobile `390×844` + Zen `SOLO [H]`).
  - [ ] Commit atomic và push `origin/main`.
- **DevLog:**
  - Chuyển đổi toàn bộ giao diện từ Bento glassmorphism sang **Editorial Swiss Grid** theo lựa chọn thiết kế `A1 / A2 / A3`: Carbon `#050505`, Bone White `#f5f5f2`, đường kẻ cấu trúc `1px`, bỏ hoàn toàn capsule chips và card gradient.
  - Sửa bố cục mobile từ kiểm thử ảnh chụp thực tế: đặt `.top-bar` nền đặc `#050505` + `scroll-margin-top` theo breakpoint và căn lại `cyRatio` trên màn hình dọc.
  - Nâng cấp thẩm mỹ kỹ thuật (Tech / CAD Instrumentation): bổ sung lưới chuẩn `72px`, vạch chia thước cạnh phải, trục tọa độ `X/Y/Z` & vòng tham chiếu `buildAxisDescriptors`, khung ngắm node tọa độ thực, thanh telemetry `AZ · EL · T`, bảng thông số `MANIFOLD_KERNEL` / `GOVERNING_EQ` đồng bộ thời gian thực, và bộ lọc lệnh `> grep` cho bảng mô-đun kỹ thuật (`MOD.01`..`MOD.03`).

## Phase 4: Monitoring (Giám sát)
- **Kiểm thử đơn vị (`node --test tests/*.test.mjs`):** `tests 11`, `pass 11`, `fail 0`, `skipped 0`, `SYNTAX_OK` qua `node --check` trên toàn bộ module trong `src/` (gồm kiểm chứng số lượng đỉnh chính xác `wave: 2184`, `spiro: 1980`, `tesseract: 256` và `equation` / `topology`).
- **Kiểm thử trình duyệt Headless Chrome CDP:**
  - Zero runtime faults: `consoleErrors: []`, `exceptions: []`, `logErrors: []`.
  - Desktop (`1440×900`, `2x`): `overflow: false`, `#top-telemetry` (`AZ · EL · T`) và `.hero-spec-grid` đồng bộ tức thì theo preset (`wave` / `tesseract`), bộ lọc `> grep` (`wire` → `Wireshark`, empty state chuẩn khi không khớp), `unitCount: 39`, `repoCount: 6`.
  - Mobile (`390×844`, `3x`): `mobileHeroOverflow: false`, `mobileSectionsOverflow: false`, mô hình 3D định vị thoáng ở vùng khung trên không che khối nhận diện & thông số Hero.

## Phase 5: Closure (Đóng dự án)
- Hoàn tất dọn tệp tạm xác minh, commit atomic sạch theo từng module, push `origin/main`, và kiểm tra `HTTP/2 200` trên `https://kh4nhtu0n9.github.io/`.
