import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { createSession, assertSameOrigin, HttpError } from '@/lib/auth';
import { handle, readJson } from '@/lib/api';

const body = z.object({ username: z.string().trim().min(1, 'Nhập tên đăng nhập').max(80), password: z.string().min(1, 'Nhập mật khẩu').max(200) });
// Dùng hash giả để thời gian phản hồi không lộ tài khoản có tồn tại hay không.
const DUMMY = bcrypt.hashSync('khong-ton-tai', 10);
const MAX_FAILS = 8;
const LOCK_MS = 5 * 60_000;

export async function POST(req: Request) {
  return handle(async () => {
    await assertSameOrigin();
    const { username, password } = body.parse(await readJson(req));
    const key = username.toLowerCase();
    // Bộ đếm lưu trong CSDL để có hiệu lực cả khi chạy serverless nhiều phiên bản.
    const t = await prisma.loginThrottle.findUnique({ where: { key } });
    if (t?.lockedTil && t.lockedTil > new Date()) throw new HttpError(429, 'Đăng nhập sai quá nhiều lần. Hãy thử lại sau vài phút.');
    const user = await prisma.user.findUnique({ where: { username: key } });
    const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY);
    if (!user || !ok) {
      const fails = (t && (!t.lockedTil || t.lockedTil <= new Date()) && t.failures < MAX_FAILS ? t.failures : 0) + 1;
      const lockedTil = fails >= MAX_FAILS ? new Date(Date.now() + LOCK_MS) : null;
      await prisma.loginThrottle.upsert({ where: { key }, create: { key, failures: fails, lockedTil }, update: { failures: fails, lockedTil } });
      throw new HttpError(401, 'Tên đăng nhập hoặc mật khẩu không đúng.');
    }
    if (t) await prisma.loginThrottle.delete({ where: { key } }).catch(() => undefined);
    await createSession(user.id);
    return { ok: true, role: user.role };
  });
}
