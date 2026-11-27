import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser, HttpError } from '@/lib/auth';
import { handle } from '@/lib/api';
import { loadProjectGroup } from '@/lib/access';
import { readUpload } from '@/lib/storage';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const u = await requireUser();
    const { id } = await ctx.params;
    const ev = await prisma.evidence.findUnique({ where: { id } });
    if (!ev) throw new HttpError(404, 'Không tìm thấy tệp.');
    await loadProjectGroup(u, ev.projectGroupId); // kiểm tra quyền theo hồ sơ nhóm; lỗi => 404
    const body = await readUpload(ev.storedName);
    return new NextResponse(body as BodyInit, {
      headers: {
        'Content-Type': ev.mime,
        ...(body instanceof Uint8Array ? { 'Content-Length': String(body.length) } : {}),
        'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(ev.fileName)}`,
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; sandbox; style-src 'unsafe-inline'",
        'Cache-Control': 'private, no-store',
      },
    });
  });
}
