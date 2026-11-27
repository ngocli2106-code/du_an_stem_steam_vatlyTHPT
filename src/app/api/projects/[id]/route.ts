import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireUser, HttpError } from '@/lib/auth';
import { loadOwnProject } from '@/lib/access';
import { handle, readJson } from '@/lib/api';
import { endOfDayVN } from '@/lib/progress';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày không hợp lệ');
const body = z.object({
  dueDate: date,
  // null: chặng dùng hạn nộp cuối của dự án
  stages: z.array(z.object({ key: z.number().int().min(1).max(7), dueDate: date.nullable() })),
});

/** Sửa hạn nộp của dự án đã giao. Không đổi danh sách chặng, nội dung hay rubric. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const u = await requireUser('TEACHER', true);
    const { id } = await ctx.params;
    const p = await loadOwnProject(u, id);
    const b = body.parse(await readJson(req));
    const assigned = new Set(p.stages.map((s) => s.stageKey));
    const keys = b.stages.map((s) => s.key);
    if (new Set(keys).size !== keys.length) throw new HttpError(400, 'Chặng bị lặp.');
    const extra = keys.filter((k) => !assigned.has(k));
    if (extra.length) throw new HttpError(400, `Chặng ${extra.join(', ')} không được giao trong dự án này.`);

    let due: Date;
    const stageDue = new Map<number, Date | null>();
    try {
      due = endOfDayVN(b.dueDate);
      for (const s of b.stages) stageDue.set(s.key, s.dueDate ? endOfDayVN(s.dueDate) : null);
    } catch { throw new HttpError(400, 'Ngày không hợp lệ.'); }

    await prisma.$transaction([
      prisma.project.update({ where: { id }, data: { dueDate: due } }),
      ...[...stageDue].map(([k, d]) => prisma.projectStage.update({ where: { projectId_stageKey: { projectId: id, stageKey: k } }, data: { dueDate: d } })),
    ]);
    return { ok: true };
  });
}
