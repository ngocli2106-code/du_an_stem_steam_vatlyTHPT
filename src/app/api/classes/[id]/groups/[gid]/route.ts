import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireUser, HttpError } from '@/lib/auth';
import { loadOwnClass } from '@/lib/access';
import { handle, readJson } from '@/lib/api';

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string; gid: string }> }) {
  return handle(async () => {
    const u = await requireUser('TEACHER', true);
    const { id, gid } = await ctx.params;
    await loadOwnClass(u, id);
    const { name } = z.object({ name: z.string().trim().min(1).max(60) }).parse(await readJson(req));
    const r = await prisma.group.updateMany({ where: { id: gid, classId: id }, data: { name } });
    if (r.count === 0) throw new HttpError(404, 'Không tìm thấy nhóm.');
    return { ok: true };
  });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string; gid: string }> }) {
  return handle(async () => {
    const u = await requireUser('TEACHER', true);
    const { id, gid } = await ctx.params;
    await loadOwnClass(u, id);
    const used = await prisma.projectGroup.count({ where: { groupId: gid } });
    if (used > 0) throw new HttpError(409, 'Nhóm đã có hồ sơ dự án nên không thể xoá.');
    const r = await prisma.group.deleteMany({ where: { id: gid, classId: id } });
    if (r.count === 0) throw new HttpError(404, 'Không tìm thấy nhóm.');
    return { ok: true };
  });
}
