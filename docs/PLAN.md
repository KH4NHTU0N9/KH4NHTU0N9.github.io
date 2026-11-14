# KH4NHTU0N9.github.io — Project Execution Plan (5 Phases)

## Phase 1: Initiation (Khởi tạo)
- **Mục tiêu:** Xây dựng trang Profile cá nhân (`https://kh4nhtu0n9.github.io/`) mang phong cách **Tech · Sáng tạo · Rực rỡ**, đặt phần giới thiệu & năng lực kỹ thuật làm trung tâm và dùng toán học đồ họa 3D thuần ES Modules làm nền động tương tác trên HTML5 Canvas 2D.
- **Phạm vi (In-scope):**
  - Hệ sinh hình học toán tương tác thời gian thực (`Fibonacci Orbit`, `Fourier Aurora`, `Harmonic Torus`) chạy mượt 60fps không dùng thư viện ngoài.
  - 3 bảng màu quang phổ (`Aurora Prism`, `Cyber Neon`, `Solar Flare`) đồng bộ trực tiếp giữa Canvas 2D và CSS accent tokens (`[data-aura]`).
  - Hero Profile Card xác thực của `@KH4NHTU0N9`, 3 Bento Cards theo lĩnh vực (`Embedded & Flight`, `Security & Forensics`, `Systems, Data & Cloud`) và 6 dự án GitHub nổi bật (hydration live + snapshot dự phòng an toàn XSS).
- **Ngoài phạm vi (Out-of-scope):** Giao diện giải phương trình vi phân kiểu bài tập (`dx/dt`, sliders $\sigma,\rho,\beta$), backend riêng, build bundler nặng.
- **Tài liệu tham khảo:**
  - [GitHub Docs — What is GitHub Pages?](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
  - [MDN Web Docs — CanvasRenderingContext2D](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D)

## Phase 2: Planning (Lập kế hoạch)
- **Kiến trúc hệ thống:**
  - `src/math/mathArt.js`: Bộ sinh tọa độ 3D (`constellation`, `aurora`, `torus`) với kiểm biên hữu hạn.
  - `src/math/projection3d.js`: Chiếu phối cảnh 3D có dịch tâm linh hoạt cho bố cục Hero Desktop (lệch phải tránh che chữ) & Mobile/Zen (căn giữa).
  - `src/math/renderer.js`: Renderer Retina Canvas 2D tối ưu LUT màu quang phổ, trường hạt sao lấp lánh, nhiễu trường con trỏ và sóng gợn.
  - `src/data/profile.js` & `src/ui/profileView.js`: Dữ liệu xác thực `@KH4NHTU0N9`, Bento spotlight cards và kiểm tra URL allowlist `https:`/`mailto:`.
  - `src/main.js`, `index.html`, `styles/main.css`: Điều khiển kéo xoay 3D, dock chọn style tối giản và chế độ Focus Art (`H`).

## Phase 3: Execution (Thực thi)
### Task Tracker
- [x] Khởi tạo & thiết kế lại theo hướng Creative Tech Profile (`mathArt.js`, `renderer.js`, `projection3d.js`)
- [x] Hero Identity + Bento Domains + Spotlight Repo Showcase (`profile.js`, `profileView.js`, `main.js`)
- [x] Bảng màu quang phổ đồng bộ `Aurora Prism` / `Cyber Neon` / `Solar Flare` (`index.html`, `styles/main.css`)
- [x] Cập nhật bộ test đơn vị (`tests/mathArt.test.mjs`, `tests/projection3d.test.mjs`, `tests/profileData.test.mjs`)

### DevLog
- **Redesign Pivot:** Loại bỏ hộp công thức Lorenz/sliders mang cảm giác thí nghiệm sách giáo khoa theo góp ý thực tế từ người dùng; đưa phần giới thiệu `@KH4NHTU0N9` lên vị trí Hero trung tâm phủ trên canvas toán đồ họa 3D rực rỡ.

## Phase 4: Monitoring (Giám sát)
- Chạy `node --test tests/*.test.mjs` và kiểm thử trực quan Headless Chrome trên cả Desktop (`1440×900`) & Mobile (`390×844`) với `0` console error và không tràn ngang.

## Phase 5: Closure (Đóng dự án)
- Commit sạch, đẩy lên nhánh `main` của `KH4NHTU0N9/KH4NHTU0N9.github.io` và xác nhận build GitHub Pages.
