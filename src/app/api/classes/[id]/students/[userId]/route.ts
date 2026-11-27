import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireUser, HttpError } from '@/lib/auth';
import { loadOwnClass } from '@/lib/access';
import { handle, readJson } from '@/lib/api';

const body = z.object({ groupId: z.string().nullable(), roleLabel: z.string().max(40).optional() });

export async function PUT(req: Request, ctx: { params: Promise<{ id: string; userId: string }> }) {
  return handle(async () => {
    const u = await requireUser('TEACHER', true);
    const { id, userId } = await ctx.params;
    await loadOwnClass(u, id);
    const b = body.parse(await readJson(req));
    const member = await prisma.classMember.findUnique({ where: { classId_userId: { classId: id, userId } } });
    if (!member) throw new HttpError(404, 'Học sinh không thuộc lớp này.');
    if (b.groupId === null) {
      await prisma.groupMember.deleteMany({ where: { classId: id, userId } });
      return { ok: true };
    }
    const g = await prisma.group.findFirst({ where: { id: b.groupId, classId: id } });
    if (!g) throw new HttpError(404, 'Không tìm thấy nhóm.');
    await prisma.groupMember.upsert({
      where: { userId_classId: { userId, classId: id } },
      create: { groupId: g.id, classId: id, userId, roleLabel: b.roleLabel ?? '' },
      update: { groupId: g.id, ...(b.roleLabel !== undefined ? { roleLabel: b.roleLabel } : {}) },
    });
    return { ok: true };
  });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string; userId: string }> }) {
  return handle(async () => {
    const u = await requireUser('TEACHER', true);
    const { id, userId } = await ctx.params;
    await loadOwnClass(u, id);
    await prisma.$transaction([
      prisma.groupMember.deleteMany({ where: { classId: id, userId } }),
      prisma.classMember.deleteMany({ where: { classId: id, userId } }),
    ]);
    return { ok: true };
  });
}
