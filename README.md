# Xưởng STEM & STEAM THPT

Webapp tiếng Việt hướng dẫn học sinh lớp 10–12 làm dự án Vật lí theo nhóm (quy trình thiết kế kĩ thuật 7 chặng), theo dõi tiến độ, lưu minh chứng và chấm rubric.

Stack: Next.js 15 (App Router) · TypeScript · Tailwind CSS 3 · Prisma 6 · SQLite. Không dùng dịch vụ AI, thư điện tử hay phân tích hành vi.

## Chạy thử cục bộ

```bash
npm run setup      # cài gói, tạo .env (AUTH_SECRET ngẫu nhiên), migrate, seed dữ liệu demo
npm run dev        # http://localhost:3000
```

Từng bước riêng: `node scripts/init-env.mjs` · `npm run db:migrate` · `npm run db:seed` · `npm run build` · `npm start`.

Seed chỉ tạo dữ liệu demo nếu chưa có tài khoản `giaovien`, nên chạy lại không ghi đè dữ liệu. Muốn làm lại từ đầu, xoá thư mục `data/` rồi `npm run db:migrate && npm run db:seed`.

## Tài khoản demo

Mật khẩu chung là `DEMO_PASSWORD` trong `.env` (mặc định `demo-stem-2026`, chỉ để thử cục bộ; hãy đổi trước khi seed nếu muốn).

| Vai trò | Tên đăng nhập |
|---|---|
| Giáo viên | `giaovien` |
| Học sinh Nhóm 1 | `hs.an`, `hs.binh` |
| Học sinh Nhóm 2 | `hs.chi`, `hs.dung` |

Dự án demo “Thiết kế bao bì…” gắn nhãn **Dữ liệu minh họa** (trên giao diện và bản in). Nhóm 1 có sẵn chặng 1 đã duyệt, chặng 2 đã nộp, chặng 5 đang làm; Nhóm 2 bắt đầu trống. Dự án tạo mới luôn bắt đầu với bảng dữ liệu trống.

## Cấu hình (`.env`, xem `.env.example`)

`DATABASE_URL` (SQLite, mặc định `file:../data/app.db`) · `AUTH_SECRET` (≥ 32 ký tự) · `DEMO_PASSWORD` · `UPLOAD_DIR` (mặc định `./data/uploads`, ngoài `public/`). Thư mục `data/` được giữ qua các lần khởi động lại và không đưa vào Git. Chạy qua HTTP thường (không HTTPS) ở chế độ `npm start` cần `INSECURE_COOKIES=1`.

## Kiểm thử

```bash
npm run lint && npm run typecheck && npm test   # 25 test đơn vị
npm run build
npm run test:e2e                                # 93 kiểm tra luồng chính qua HTTP, dùng CSDL riêng data/e2e.db
```

## Quy ước chính

- Số thập phân nhập được cả `12,5` và `12.5`; ô trống ≠ 0; dấu ngăn nghìn không được chấp nhận (`1.234` được hiểu là 1,234).
- Mỗi lần nộp lưu bản chụp nội dung và tham chiếu minh chứng; phản hồi gắn với đúng lần nộp. Lưu nháp dùng khoá phiên bản (HTTP 409 khi bản cũ).
- Rubric được chụp kèm dự án khi giao; điểm nháp tách khỏi công bố.
- Quyền kiểm tra trên máy chủ cho mọi trang, API và tệp; truy cập trái quyền trả 404.

## Giới hạn hiện tại

- Đã sửa được hạn nộp của dự án đã giao (trang dự án → “Sửa hạn nộp”); chưa sửa được rubric hay danh sách chặng sau khi giao, và chưa có xuất điểm ra CSV.
- Giới hạn đăng nhập sai lưu trong bộ nhớ tiến trình (mất khi khởi động lại).
- Tệp chỉ kiểm tra loại bằng chữ kí đầu tệp, chưa quét virus.
- Học sinh cùng nhóm sửa đồng thời được bảo vệ bằng phát hiện xung đột, không có hợp nhất tự động.
- Chưa kiểm thử tự động bằng trình duyệt; giao diện 390/1440 px và bản in A4 được chụp và xem thủ công.
