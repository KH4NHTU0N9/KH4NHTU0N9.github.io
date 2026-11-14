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

