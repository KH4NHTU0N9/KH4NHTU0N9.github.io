# Project Execution Plan — KH4NHTU0N9.github.io

## Phase 1: Initiation (Khởi tạo)
- **Mục tiêu (Objective):** Tái cấu trúc giao diện thành **Information Security Student Portfolio (`https://kh4nhtu0n9.github.io/`)** gọn gàng, điềm tĩnh chuẩn SecOps terminal, sử dụng 3D Cybersecurity ASCII/Math làm điểm nhấn chính thay vì các bảng điều khiển hiệu ứng rườm rà.
- **Phạm vi (In-scope):**
  - **Loại bỏ nhiễu thị giác (Visual De-clutter):** Gỡ bỏ nền hạt sao cuộn toàn trang (`#ambient-sky-canvas`), Oscilloscope hero (`#scope-canvas`), 4 thanh trượt synth, dải sóng Horizon động, `<pre>` nhấp nháy trong card và thanh đo nhị phân `1001` cạnh từng kỹ năng.
  - **Bộ đôi bảng màu SecOps điềm tĩnh:** Nền `#020308` / `#060911`, điểm nhấn Phosphor Emerald (`#34d399`) + Cold Cyan (`#38bdf8`).
  - **3 mô hình 3D An toàn thông tin (`src/math/asciiScene.js`):** `01 MESH` (Packet/Defense Mesh), `02 CIPHER` (Modular Cipher Torus `(2,5)`), `03 RF` (Dipole & WiFi/BLE Field) giữ công tắc `MATH | ASCII | BIN` và chế độ `SOLO [H]`.
  - **Dossier Sinh viên An toàn Thông tin (`src/ui/profileView.js`):** Hiển thị đúng dữ liệu đã xác thực trong `PROFILE_DATA` (DFIR, WiFi/BLE `RLT8720dn`, `ESP32`/Embedded, Linux/Systems) qua cây thư mục `focus/` tĩnh gọn gàng, cùng ảnh đại diện `ASCII/RAW` 16×10.
  - **Sắp xếp ma trận kỹ năng theo thứ tự An toàn thông tin:** Đưa `MOD.01` (`Security & Forensics`) lên đầu bảng kỹ năng (`MOD.02 Embedded & Flight`, `MOD.03 Systems, Data & Cloud`) dưới dạng cây ASCII tĩnh (`├─` / `└─`).
- **Tài liệu tham khảo:**
  1. [GitHub Docs — About GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages)
  2. [MDN Web Docs — CanvasRenderingContext2D](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D)
  3. [MDN Web Docs — CORS settings attributes (`crossorigin`)](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/crossorigin)
  4. [Node.js Documentation — Test runner (`node:test`)](https://nodejs.org/api/test.html)
  5. [W3C WAI — ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)

## Phase 2: Planning (Lập kế hoạch)
- **Kiến trúc tối giản & độ tin cậy:**
  - Giữ duy nhất vòng lặp 3D `#math-canvas` ở khung bên phải Hero, tự dừng `rAF` khi bật `PAUSE` hoặc `prefers-reduced-motion`, không còn `rAF` nền toàn trang hay timer chớp DOM `9Hz`.
  - Kiểm soát chặt tràn ngang `0px` (`scrollWidth <= innerWidth`) trên cả Desktop (`1440×900`) và Mobile (`390×844`), và đảm bảo vùng `RETURN [H]` ở `SOLO [H]` tách bạch với công tắc `[MATH | ASCII | BIN]`.
  - Đồng bộ token chống cache `?v=gcs25` xuyên suốt HTML, CSS và mọi ESM module.

## Phase 3: Execution (Thực thi)
- **Task Tracker:**
  - [x] Gỡ bỏ `src/math/ambientSkyRenderer.js` và `src/math/scopeRenderer.js`.
  - [x] Viết lại `src/math/asciiScene.js` với 3 mô hình 3D InfoSec (`mesh`, `cipher`, `rf`) và bảng màu Emerald/Cyan.
  - [x] Tinh gọn `src/math/asciiArt.js` chỉ còn trình lấy mẫu pixel ảnh chân dung và fallback sigil.
  - [x] Tinh chỉnh `src/math/asciiRenderer.js` (`?v=gcs25`) theo tông radar Emerald/Cyan dịu mắt.
  - [x] Thiết kế lại `src/ui/profileView.js`, `src/main.js`, `index.html`, `styles/main.css` theo bố cục Dossier & Tree sạch sẽ.
  - [x] Cập nhật `tests/asciiArt.test.mjs` và `tests/rendererResize.test.mjs` cho `?v=gcs25`.

## Phase 4: Monitoring (Giám sát)
- Thực thi `node --test tests/*.test.mjs`, `node --check`, kiểm thử trình duyệt cục bộ (Desktop `1440×900` + scroll toàn trang + Mobile `390×844`) và kiểm tra trực tiếp trên `https://kh4nhtu0n9.github.io/` sau deploy.

## Phase 5: Closure (Đóng dự án)
- Dọn server tạm, commit atomic theo từng lớp, đẩy lên `origin/main`, xác nhận GitHub Actions Pages & kiểm chứng trang live lần cuối.
