import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { HttpError } from './auth';

export async function handle(fn: () => Promise<unknown>): Promise<NextResponse> {
  try {
    const r = await fn();
    return r instanceof NextResponse ? r : NextResponse.json(r ?? { ok: true });
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message, ...(e.extra ?? {}) }, { status: e.status });
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Dữ liệu gửi lên không hợp lệ: ' + e.issues.map((i) => i.message).join('; ') }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: 'Đã có lỗi máy chủ. Hãy thử lại sau.' }, { status: 500 });
  }
}

export async function readJson(req: Request): Promise<any> {
  try { return await req.json(); } catch { throw new HttpError(400, 'Nội dung yêu cầu không phải JSON hợp lệ.'); }
}
