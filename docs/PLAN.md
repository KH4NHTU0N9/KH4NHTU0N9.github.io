# KH4NHTU0N9.github.io — Project Execution Plan (5 Phases)

## Phase 1: Initiation (Khởi tạo)
- **Mục tiêu:** Xây dựng trang Profile cá nhân (`https://kh4nhtu0n9.github.io/`) kết hợp **3D Mathematical Visualization Engine** chạy thời gian thực trên HTML5 Canvas 2D (Zero-dependency, pure HTML/CSS/ES Modules).
- **Phạm vi (In-scope):**
  - Bộ giải tích số RK4 (4th-order Runge-Kutta) và bộ sinh mặt/đường cong tham số (`Lorenz Attractor`, `Halvorsen Attractor`, `Torus Knot`, `Möbius Phase Ribbon`).
  - Hệ chiếu phối cảnh 3D tương tác (kéo xoay Orbit, cuộn Zoom, hover tạo nhiễu trường vector, bấm tạo sóng tròn).
  - Giao diện Profile thực tế của `@KH4NHTU0N9` (`Embedded & Robotics`, `Security & Forensics`, `Software & Infra`) kèm danh sách repo nổi bật và live GitHub API hydration an toàn.
  - Bảng điều khiển phương trình trực tiếp (chỉnh tham số $\sigma, \rho, \beta, a, p, q$, đổi bảng màu oscilloscope, chế độ Zen `H`).
- **Ngoài phạm vi (Out-of-scope):** Build toolchain nặng (Webpack/Vite/React), backend server riêng, hiệu ứng lạm dụng GPU gây lag cuộn trang.
- **Tài liệu tham khảo:**
  - [GitHub Docs — What is GitHub Pages?](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
  - [MDN Web Docs — CanvasRenderingContext2D](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D)
  - [Edward N. Lorenz (1963) — Deterministic Nonperiodic Flow (AMS)](https://journals.ametsoc.org/view/journals/atsc/20/2/1520-0469_1963_020_0130_dnf_2_0_co_2.xml)

## Phase 2: Planning (Lập kế hoạch)
- **Kiến trúc hệ thống:**
  - `src/math/integrators.js`: RK4 ODE steppers & parametric curve/surface generators (`lorenz`, `halvorsen`, `torusKnot`, `mobius`).
  - `src/math/projection3d.js`: Camera yaw/pitch/zoom transform, coordinate axes, depth mapping.
  - `src/math/renderer.js`: Retina 2D Canvas oscilloscope/phase-space renderer với trail glow, tracer heads và interactive pointer ripple.
  - `src/data/profile.js`: Dữ liệu Profile & Tech Stack đã xác thực từ GitHub (`KH4NHTU0N9`).
  - `src/ui/equationPanel.js` & `src/ui/profileView.js`: Điều khiển công thức live, domain filtering, safe DOM rendering.
- **Quản lý rủi ro (Risk Management):**
  - *Bùng nổ số học RK4 khi đổi tham số lớn:* Giới hạn miền slider an toàn và kẹp biên bước tích phân / phát hiện diverged state tự reset quỹ đạo.
  - *GitHub REST API rate-limit (`60 req/h`):* Dùng snapshot verified trong `src/data/profile.js` làm mặc định và chỉ cập nhật bổ sung khi API trả `HTTP 200` hợp lệ.
  - *Chống XSS:* Toàn bộ text/link đi qua DOM `textContent` và bộ kiểm tra URL allowlist `https:`/`mailto:`.
- **Lộ trình (Milestones):**
  - M1: Core Math Engine + Node.js unit tests.
  - M2: Interactive Canvas 3D Oscilloscope & Equation Controls.
  - M3: Profile Portfolio UI + Responsive CSS & Accessibility.
  - M4: End-to-End Headless Chrome Visual & Runtime Audit + Docs.

## Phase 3: Execution (Thực thi)
### Task Tracker
- [x] Khởi tạo repo & tài liệu kế hoạch `docs/PLAN.md`
- [x] `src/math/integrators.js` + unit tests (`tests/integrators.test.mjs`)
- [x] `src/math/projection3d.js` + unit tests (`tests/projection3d.test.mjs`)
- [x] `src/math/renderer.js`
- [x] `src/data/profile.js` + `tests/profileData.test.mjs`
- [x] `src/ui/equationPanel.js`, `src/ui/profileView.js`, `src/main.js`
- [x] `index.html`, `styles/main.css`, `README.md`

### DevLog
- **Init:** Tạo cấu trúc `KH4NHTU0N9.github.io` thuần ES Modules không dependency, tối ưu cho GitHub Pages User Site.
- **M1–M3 Built:** Hoàn thiện lõi tích phân RK4 (`lorenz`, `halvorsen`, `torusKnot`, `mobius`), bộ chiếu phối cảnh 3D, Canvas 2D oscilloscope với LUT màu, dữ liệu hồ sơ xác thực `@KH4NHTU0N9` và UI đáp ứng Desktop/Mobile.
- **M4 Verified & Polished:** Khắc phục nút `[hidden]` Zen ngoài fullscreen, sửa điểm khởi tạo + cache quỹ đạo RK4 giúp Lorenz tạo đủ hai cánh bướm đối xứng 60fps, mở rộng cột telemetry & nút mobile hết cắt chữ; kiểm chứng trực quan Desktop (`1440×900`) & Mobile (`390×844`) với `0` lỗi console.

## Phase 4: Monitoring (Giám sát)
- [x] `node --test tests/*.test.mjs`: 10/10 tests pass (`integrators.test.mjs`, `profileData.test.mjs`, `projection3d.test.mjs`).
- [x] Headless Chrome audit (`1440×900` Desktop & `390×844` Mobile): `0` console error, `0` uncaught exception, `scrollWidth <= innerWidth` trên cả Desktop & Mobile, Zen mode, chuyển 4 mô hình toán và live GitHub API hydration hoạt động chuẩn.

