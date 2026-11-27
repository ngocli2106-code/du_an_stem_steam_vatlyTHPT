// Lệnh build trên Vercel: kiểm tra cấu hình → migrate CSDL → (tuỳ chọn) seed demo → build Next.js.
import { execSync } from 'node:child_process';

const run = (cmd) => { console.log(`\n$ ${cmd}`); execSync(cmd, { stdio: 'inherit' }); };
const env = process.env;
const errors = [];
if (!env.DATABASE_URL) errors.push('Thiếu DATABASE_URL: vào Storage của dự án Vercel, tạo/kết nối CSDL Neon Postgres.');
if (!env.DATABASE_URL_UNPOOLED) errors.push('Thiếu DATABASE_URL_UNPOOLED (tích hợp Neon tự đặt; nếu dùng Postgres khác, đặt bằng chuỗi kết nối trực tiếp).');
if (!env.AUTH_SECRET || env.AUTH_SECRET.length < 32) errors.push('Thiếu AUTH_SECRET (chuỗi ngẫu nhiên ≥ 32 ký tự) trong Environment Variables.');
if (errors.length) {
  console.error('\nCấu hình chưa đủ để deploy:\n- ' + errors.join('\n- '));
  process.exit(1);
}
if (!env.BLOB_READ_WRITE_TOKEN && !env.BLOB_STORE_ID) {
  console.warn('\nCẢNH BÁO: chưa kết nối kho Vercel Blob (private). Học sinh sẽ không tải được minh chứng cho tới khi kết nối.');
}

// Gọi generate ở đây: npm mới có thể bỏ qua script cài đặt của Prisma.
run('npx prisma generate');
run('npx prisma migrate deploy');
if (env.SEED_DEMO === '1') run('npx tsx prisma/seed.ts');
else console.log('\nBỏ qua dữ liệu demo (đặt SEED_DEMO=1 để tạo).');
run('npx next build');
