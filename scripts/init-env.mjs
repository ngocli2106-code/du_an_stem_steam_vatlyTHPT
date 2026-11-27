// Tạo .env cục bộ nếu chưa có, với AUTH_SECRET ngẫu nhiên.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
if (!existsSync('.env')) {
  const t = readFileSync('.env.example', 'utf8').replace(
    /AUTH_SECRET=".*"/,
    `AUTH_SECRET="${randomBytes(32).toString('hex')}"`,
  );
  writeFileSync('.env', t);
  console.log('Đã tạo .env (AUTH_SECRET ngẫu nhiên).');
} else console.log('.env đã tồn tại, giữ nguyên.');
