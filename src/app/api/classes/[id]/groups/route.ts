import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireUser, HttpError } from '@/lib/auth';
import { loadOwnClass } from '@/lib/access';
import { handle, readJson } from '@/lib/api';

const body = z.union([
  z.object({ name: z.string().trim().min(1, 'Nhập tên nhóm').max(60) }),
  z.object({ auto: z.number().int().min(1).max(20) }),
]);

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const u = await requireUser('TEACHER', true);
    const { id } = await ctx.params;
    await loadOwnClass(u, id);
    const b = body.parse(await readJson(req));
    if ('name' in b) {
      const g = await prisma.group.create({ data: { classId: id, name: b.name } });
      return { id: g.id };
    }
    // Chia ngẫu nhiên những học sinh chưa có nhóm vào b.auto nhóm mới.
    const members = await prisma.classMember.findMany({ where: { classId: id, user: { role: 'STUDENT' } } });
    const taken = new Set((await prisma.groupMember.findMany({ where: { classId: id } })).map((x) => x.userId));
    const free = members.map((m) => m.userId).filter((x) => !taken.has(x));
    if (free.length === 0) throw new HttpError(400, 'Không còn học sinh chưa có nhóm.');
    const n = Math.min(b.auto, free.length);
    for (let i = free.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [free[i], free[j]] = [free[j], free[i]]; }
    const existing = await prisma.group.count({ where: { classId: id } });
    await prisma.$transaction(async (tx) => {
      const groups = [];
      for (let i = 0; i < n; i++) groups.push(await tx.group.create({ data: { classId: id, name: `Nhóm ${existing + i + 1}` } }));
      for (let i = 0; i < free.length; i++) {
        await tx.groupMember.create({ data: { groupId: groups[i % n].id, classId: id, userId: free[i] } });
      }
    });
    return { ok: true, groups: n };
  });
}
