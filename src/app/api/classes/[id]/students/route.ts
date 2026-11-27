import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireUser, HttpError } from '@/lib/auth';
import { loadOwnClass } from '@/lib/access';
import { handle, readJson } from '@/lib/api';
import { parseStudentLines, randomPassword, slugVi } from '@/lib/people';

const body = z.object({ text: z.string().min(1, 'Nhập ít nhất một học sinh').max(20000) });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const u = await requireUser('TEACHER', true);
    const { id } = await ctx.params;
    await loadOwnClass(u, id);
    const parsed = parseStudentLines(body.parse(await readJson(req)).text);
    if (parsed.length === 0) throw new HttpError(400, 'Không có dòng hợp lệ.');
    if (parsed.length > 100) throw new HttpError(400, 'Mỗi lần thêm tối đa 100 học sinh.');

    const created: { displayName: string; username: string; password: string }[] = [];
    const added: string[] = [];
    const skipped: string[] = [];
    for (const p of parsed) {
      if (p.code) {
        const ex = await prisma.user.findUnique({ where: { studentCode: p.code }, include: { memberships: { include: { class: true } } } });
        if (ex) {
          const mine = ex.role === 'STUDENT' && ex.memberships.some((m) => m.class.teacherId === u.id);
          if (!mine) { skipped.push(`${p.code}: mã đã được dùng`); continue; }
          if (ex.memberships.some((m) => m.classId === id)) { skipped.push(`${p.code}: đã có trong lớp`); continue; }
          await prisma.classMember.create({ data: { classId: id, userId: ex.id } });
          added.push(ex.displayName);
          continue;
        }
      }
      let base = p.code ? slugVi(p.code) : slugVi(p.name);
      if (!base) base = 'hs';
      let username = base; let n = 1;
      while (await prisma.user.findUnique({ where: { username } })) username = `${base}${++n}`;
      const password = randomPassword();
      const user = await prisma.user.create({
        data: { username, displayName: p.name, studentCode: p.code, role: 'STUDENT', passwordHash: await bcrypt.hash(password, 10) },
      });
      await prisma.classMember.create({ data: { classId: id, userId: user.id } });
      created.push({ displayName: user.displayName, username, password });
    }
    return { created, added, skipped };
  });
}
