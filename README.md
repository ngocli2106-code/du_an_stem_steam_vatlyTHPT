# Xưởng STEM & STEAM THPT

Webapp tiếng Việt hướng dẫn học sinh lớp 10–12 làm dự án Vật lí theo nhóm (quy trình thiết kế kĩ thuật 7 chặng), theo dõi tiến độ, lưu minh chứng và chấm rubric.

Stack: Next.js 15 (App Router) · TypeScript · Tailwind CSS 3 · Prisma 6 · PostgreSQL · Vercel Blob (lưu minh chứng khi deploy). Không dùng dịch vụ AI, thư điện tử hay phân tích hành vi.

## Deploy lên Vercel (bản xem trước công khai)

Cần tài khoản Vercel (gói Hobby miễn phí) đã liên kết GitHub. Không cần tài khoản riêng cho CSDL hay kho tệp: cả hai tạo ngay trong Vercel.

1. **Tạo dự án:** Vercel → *Add New… → Project* → chọn repo này → *Import*. Chưa bấm Deploy cũng được; nếu lỡ deploy, lần đầu sẽ báo thiếu cấu hình (bình thường).
2. **CSDL:** trong dự án → tab *Storage* → *Create Database* → **Neon (Postgres)** → gói Free → *Connect* cho mọi môi trường. Vercel tự thêm `DATABASE_URL` và `DATABASE_URL_UNPOOLED`.
3. **Kho minh chứng:** tab *Storage* → *Create* → **Blob** → chọn quyền truy cập **Private** (không đổi được sau khi tạo) → *Connect*. Vercel tự thêm `BLOB_READ_WRITE_TOKEN`.
4. **Biến môi trường** (*Settings → Environment Variables*):
   | Tên | Giá trị |
   |---|---|
   | `AUTH_SECRET` | chuỗi ngẫu nhiên ≥ 32 ký tự, ví dụ kết quả của `openssl rand -hex 32` |
   | `SEED_DEMO` | `1` nếu muốn tạo sẵn lớp và tài khoản demo |
   | `DEMO_PASSWORD` | mật khẩu chung cho tài khoản demo, ≥ 10 ký tự, **khác** `demo-stem-2026` |
5. **Deploy:** tab *Deployments* → *Redeploy* (hoặc push lên `main`). Lệnh build (`npm run vercel-build`) tự: kiểm tra cấu hình → `prisma migrate deploy` → tạo demo nếu `SEED_DEMO=1` (chỉ một lần, chạy lại không ghi đè) → build.

Mỗi lần push lên `main` Vercel deploy lại bản chính; push lên nhánh khác tạo bản **Preview** có link riêng (cùng CSDL nếu Neon được kết nối cho môi trường Preview).

Sau khi đã có dữ liệu thật, đặt lại `SEED_DEMO` thành `0` (hoặc xoá) và đổi mật khẩu các tài khoản demo nếu không dùng nữa.

## Chạy trên máy cá nhân

Cần Node.js ≥ 20.9 và Postgres. Cách nhanh nhất có Docker:

```bash
npm run db:up      # Postgres 16 trong Docker (docker-compose.yml)
npm run setup      # cài gói, tạo .env (AUTH_SECRET ngẫu nhiên), migrate, tạo dữ liệu demo
npm run dev        # http://localhost:3000
```

Không dùng Docker: tạo một CSDL Postgres rồi sửa `DATABASE_URL` và `DATABASE_URL_UNPOOLED` trong `.env` (xem `.env.example`). Minh chứng ở máy cá nhân lưu trong `./data/uploads` (ngoài `public/`).

Từng bước riêng: `node scripts/init-env.mjs` · `npm run db:migrate` · `npm run db:seed` · `npm run build` · `npm start` (chạy `npm start` qua HTTP thường cần `INSECURE_COOKIES=1`).

## Tài khoản demo

| Vai trò | Tên đăng nhập |
|---|---|
| Giáo viên | `giaovien` |
| Học sinh Nhóm 1 | `hs.an`, `hs.binh` |
| Học sinh Nhóm 2 | `hs.chi`, `hs.dung` |

Mật khẩu chung là `DEMO_PASSWORD` (máy cá nhân mặc định `demo-stem-2026`; bản deploy bắt buộc đặt giá trị riêng). Dự án demo gắn nhãn **Dữ liệu minh họa** trên giao diện và bản in.

## Kiểm thử

```bash
npm run lint && npm run typecheck && npm test   # 34 test đơn vị
npm run build
E2E_DATABASE_URL=postgresql://user@localhost:5432/stem_e2e npm run test:e2e   # 128 kiểm tra luồng chính qua HTTP
```

Kiểm thử E2E **xoá sạch** CSDL được chỉ định trước khi chạy, nên tên CSDL bắt buộc chứa `e2e` hoặc `test`.

## Quy ước chính

- Số thập phân nhập được cả `12,5` và `12.5`; ô trống ≠ 0; dấu ngăn nghìn không được chấp nhận (`1.234` được hiểu là 1,234).
- Mỗi lần nộp lưu bản chụp nội dung và tham chiếu minh chứng; phản hồi gắn với đúng lần nộp. Lưu nháp dùng khoá phiên bản (HTTP 409 khi bản cũ).
- Rubric được chụp kèm dự án khi giao (sửa mẫu không ảnh hưởng); sửa rubric của dự án tăng số phiên bản, kết quả công bố ghi phiên bản đã dùng. Điểm nháp tách khỏi công bố.
- Quyền kiểm tra trên máy chủ cho mọi trang, API và tệp; truy cập trái quyền trả 404.
- Minh chứng tối đa 4 MB/tệp (giới hạn 4,5 MB của hàm Vercel); ảnh lớn được nén trên trình duyệt trước khi gửi. Trên Vercel tệp nằm trong kho Blob **riêng tư** và chỉ được đọc qua máy chủ sau khi kiểm tra quyền.
- Đăng nhập sai 8 lần liên tiếp khoá tài khoản 5 phút (bộ đếm lưu trong CSDL).

## Giới hạn hiện tại

- Giáo viên sửa được hạn nộp, rubric và xuất điểm CSV của dự án đã giao; chưa thêm/bớt được chặng sau khi giao.
- Tệp chỉ được kiểm tra loại bằng chữ kí đầu tệp, chưa quét virus. PDF lớn hơn 4 MB cần nén trước.
- Học sinh cùng nhóm sửa đồng thời được bảo vệ bằng phát hiện xung đột, không có hợp nhất tự động.
- Chưa có kiểm thử tự động bằng trình duyệt; giao diện 390/1440 px và bản in A4 được chụp và xem thủ công.
- Kho Vercel Blob chưa được chạy thử thật trong quá trình phát triển (không có khoá truy cập); phần này dựng theo tài liệu SDK `@vercel/blob` 2.9 và cần kiểm tra lại sau lần deploy đầu tiên.
