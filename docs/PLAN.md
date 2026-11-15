# Project Execution Plan — KH4NHTU0N9.github.io

## Phase 1: Initiation (Khởi tạo)
- **Mục tiêu (Objective):** Nâng cấp portfolio An toàn Thông tin & Hệ thống Nhúng (`https://kh4nhtu0n9.github.io/`) chuẩn nhà tuyển dụng: sửa ngữ pháp/phong cách câu Bio, ghim 6 dự án cốt lõi với mô tả xác thực từ mã nguồn README thật trên GitHub, tinh gọn kỹ năng còn 20 công cụ chuyên môn cao, bổ sung `01 // EXPERIENCE & LAB LOG`, nút `[↓ RESUME / CV]` (Print-to-PDF), nhảy mục trên Navbar, tối ưu Mobile Dossier-first, hiệu ứng giải mã `0.2s` trên `MATH | ASCII | BIN` và thanh CLI tương tác tại footer.
- **Phạm vi (In-scope):**
  - **Bio & Dossier (`src/data/profile.js`, `src/ui/profileView.js`):** Áp dụng Bio chuẩn *"Information Security & Embedded Systems student passionate about building low-level tools, network analysis utilities, and resilient software."* cùng nút `[↓ RESUME / CV]` nổi bật cạnh `[↗ GITHUB]` mở hộp thoại Print-to-PDF tổng hợp từ dữ liệu thật (`@media print`).
  - **Experience & Lab Log (`#experience-log`):** Ghi nhận 4 nhật ký kỹ thuật/bảo mật thực tế (`RTL8720DN Wi-Fi/BLE`, `Systemd Auto-Healing`, `UAV Thermal-RGB SAR`, `Cisco NWC204 Network Design`) + 1 `SLOT_05` minh bạch sẵn sàng cho giải CTF/Chứng chỉ khi người dùng bổ sung.
  - **Curated Tooling (`20` công cụ) & Interactive `> grep`:** Loại bỏ các công cụ văn phòng/phổ thông (VS Code, Notion, Adobe, Windows Terminal, Audacity), chỉ giữ 20 công cụ chuyên môn (`Security & DFIR`, `Embedded, RF & UAV`, `Systems & Automation`) kèm vai trò thực tế, bổ sung con trỏ nháy `_` và nút `[ESC / CLEAR]`.
  - **Pinned Repositories (`6` dự án cốt lõi):** Đọc/đối chiếu nội dung thật từ GitHub API (`contents` & `README.md`) để viết mô tả chính xác và dùng `PINNED_REPO_ORDER` loại bỏ các repo bài tập đại cương hoặc tên nhạy cảm.
  - **Điều hướng, Tương phản & Terminal UX:** Đưa `00 // ABOUT`, `01 // LOG`, `02 // TOOLING`, `03 // REPOS` lên Navbar, đưa tọa độ 3D vào hẳn bên trong `#canvas-stage`, nâng độ sáng màu chữ phụ (`#cbd5e1` / `#94a3b8`), đảo Dossier lên trên 3D viewport trên Mobile (`<= 980px`), thêm decode `200ms` ở `#viewport-badge`, và kích hoạt footer thành interactive mini-CLI (`help`, `whoami`, `ls`, `scene`, `glyph`, `grep`, `goto`, `cv`, `reset`, `clear`).
- **Tài liệu tham khảo:**
  1. [GitHub Docs — About GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages)
  2. [MDN Web Docs — Window: print() method](https://developer.mozilla.org/en-US/docs/Web/API/Window/print)
  3. [MDN Web Docs — @media print](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media)
  4. [MDN Web Docs — IntersectionObserver API](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver)
  5. [W3C WAI — Dialog (Modal) Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)

## Phase 2: Planning (Lập kế hoạch)
- **Kiến trúc tối ưu & bảo mật:**
  - Bộ lọc allowlist `PINNED_REPO_ORDER` đảm bảo GitHub REST API trực tiếp chỉ hiển thị đúng 6 dự án cốt lõi đã xác thực mô tả ngay cả khi có repo mới đẩy lên GitHub.
  - Mini-CLI hoàn toàn an toàn (`textContent` 100%, không `eval`/`innerHTML`), lưu lịch sử lệnh bằng phím mũi tên, tự bỏ qua phím nóng toàn cục (`Space/H/G/R/1-3`) khi con trỏ đang nhập trong `<input>`.
  - Đồng bộ cache-bust token `?v=gcs26` xuyên suốt HTML, CSS và toàn bộ ESM modules.

## Phase 3: Execution (Thực thi)
- **Task Tracker:**
  - [x] Kiểm tra README & cấu trúc mã nguồn thực tế của 6 repo ghim trên GitHub API.
  - [x] Cập nhật `src/data/profile.js` (Bio mới, 20 công cụ chuyên môn + `TOOL_APPLICATIONS`, `technicalLog`, `PINNED_REPO_ORDER` & mô tả chuẩn).
  - [x] Nâng cấp `src/ui/profileView.js`, `src/main.js`, `index.html`, `styles/main.css` (`?v=gcs26`) cho Navbar jumps, `#experience-log`, `> grep` cursor + clear button, Printable CV Modal (`@media print`), Decode `200ms`, Mobile Dossier-first, và Interactive Mini-CLI Footer.
  - [x] Cập nhật `tests/profileData.test.mjs` và đồng bộ lockstep `?v=gcs26` trong toàn bộ `src/math/*.js`.

## Phase 4: Monitoring (Giám sát)
- Thực thi `node --test tests/*.test.mjs`, `node --check`, kiểm thử trình duyệt cục bộ & trực tiếp trên `https://kh4nhtu0n9.github.io/` cả Desktop (`1440×900`) lẫn Mobile (`390×844`) — bao gồm interactive mini-CLI, CV modal, `grep`, decode animation, Dossier-first mobile order và `0` lỗi console/network.

## Phase 5: Closure (Đóng dự án)
- Dọn sạch tiến trình tạm, commit atomic theo lớp, push `origin/main` và xác nhận build live thành công trên GitHub Pages.
