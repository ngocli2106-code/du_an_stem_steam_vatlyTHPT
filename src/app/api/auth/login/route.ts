import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { createSession, assertSameOrigin, HttpError } from '@/lib/auth';
import { handle, readJson } from '@/lib/api';

const body = z.object({ username: z.string().trim().min(1, 'Nhập tên đăng nhập'), password: z.string().min(1, 'Nhập mật khẩu') });
// Dùng hash giả để thời gian phản hồi không lộ tài khoản có tồn tại hay không.
const DUMMY = bcrypt.hashSync('khong-ton-tai', 10);

// Giới hạn thử sai theo tên đăng nhập (trong bộ nhớ, đủ cho bản chạy cục bộ).
const fails = new Map<string, { n: number; until: number }>();

export async function POST(req: Request) {
  return handle(async () => {
    await assertSameOrigin();
    const { username, password } = body.parse(await readJson(req));
    const key = username.toLowerCase();
    const f = fails.get(key);
    if (f && f.n >= 8 && f.until > Date.now()) throw new HttpError(429, 'Đăng nhập sai quá nhiều lần. Hãy thử lại sau vài phút.');
    const user = await prisma.user.findUnique({ where: { username: key } });
    const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY);
    if (!user || !ok) {
      fails.set(key, { n: (f?.n ?? 0) + 1, until: Date.now() + 5 * 60_000 });
      throw new HttpError(401, 'Tên đăng nhập hoặc mật khẩu không đúng.');
    }
    fails.delete(key);
    await createSession(user.id);
    return { ok: true, role: user.role };
  });
}
