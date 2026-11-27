import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { requireUser, HttpError } from '@/lib/auth';
import { loadOwnClass } from '@/lib/access';
import { handle } from '@/lib/api';
import { randomPassword } from '@/lib/people';

export async function POST(_req: Request, ctx: { params: Promise<{ id: string; userId: string }> }) {
  return handle(async () => {
    const u = await requireUser('TEACHER', true);
    const { id, userId } = await ctx.params;
    await loadOwnClass(u, id);
    const m = await prisma.classMember.findUnique({ where: { classId_userId: { classId: id, userId } }, include: { user: true } });
    if (!m || m.user.role !== 'STUDENT') throw new HttpError(404, 'Học sinh không thuộc lớp này.');
    const password = randomPassword();
    await prisma.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(password, 10) } });
    return { username: m.user.username, password };
  });
}
