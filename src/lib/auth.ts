import { SignJWT, jwtVerify } from 'jose';
import { cookies, headers } from 'next/headers';
import { prisma } from './db';

const COOKIE = 'stem_session';
const MAX_AGE = 60 * 60 * 12;

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error('AUTH_SECRET chưa được cấu hình (>= 32 ký tự). Chạy `npm run setup`.');
  return new TextEncoder().encode(s);
}

export class HttpError extends Error {
  constructor(public status: number, message: string, public extra?: Record<string, unknown>) { super(message); }
}

export interface SessionUser { id: string; username: string; displayName: string; role: 'TEACHER' | 'STUDENT' }

export async function createSession(userId: string) {
  const token = await new SignJWT({}).setProtectedHeader({ alg: 'HS256' }).setSubject(userId)
    .setIssuedAt().setExpirationTime(`${MAX_AGE}s`).sign(secret());
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' && process.env.INSECURE_COOKIES !== '1', path: '/', maxAge: MAX_AGE });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function getUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;
    const u = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!u) return null;
    return { id: u.id, username: u.username, displayName: u.displayName, role: u.role as SessionUser['role'] };
  } catch {
    return null;
  }
}

/** Chặn yêu cầu ghi từ nguồn khác (CSRF) khi trình duyệt gửi Origin. */
export async function assertSameOrigin() {
  const h = await headers();
  const origin = h.get('origin');
  if (!origin) return;
  const host = h.get('host');
  let ok = false;
  try { ok = new URL(origin).host === host; } catch { ok = false; }
  if (!ok) throw new HttpError(403, 'Nguồn yêu cầu không hợp lệ.');
}

export async function requireUser(role?: 'TEACHER' | 'STUDENT', mutating = false): Promise<SessionUser> {
  if (mutating) await assertSameOrigin();
  const u = await getUser();
  if (!u) throw new HttpError(401, 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.');
  if (role && u.role !== role) throw new HttpError(403, 'Bạn không có quyền thực hiện thao tác này.');
  return u;
}
