import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { handle, readJson } from '@/lib/api';

const body = z.object({ name: z.string().trim().min(1, 'Nhập tên lớp').max(60), grade: z.number().int().min(10).max(12) });

export async function POST(req: Request) {
  return handle(async () => {
    const u = await requireUser('TEACHER', true);
    const b = body.parse(await readJson(req));
    const c = await prisma.class.create({ data: { name: b.name, grade: b.grade, teacherId: u.id } });
    return { id: c.id };
  });
}
