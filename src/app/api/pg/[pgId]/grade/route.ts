import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireUser, HttpError } from '@/lib/auth';
import { handle, readJson } from '@/lib/api';
import { loadProjectGroup } from '@/lib/access';
import type { Rubric } from '@/lib/rubric';

const body = z.object({
  scores: z.record(z.string(), z.object({ level: z.number().int().min(0).max(3).nullable(), comment: z.string().max(2000) })),
  overallComment: z.string().max(4000),
});

/** Lưu nháp điểm. Học sinh không thấy cho tới khi công bố. */
export async function PUT(req: Request, ctx: { params: Promise<{ pgId: string }> }) {
  return handle(async () => {
    const u = await requireUser('TEACHER', true);
    const { pgId } = await ctx.params;
    const { pg } = await loadProjectGroup(u, pgId);
    const b = body.parse(await readJson(req));
    const rubric: Rubric = JSON.parse(pg.project.rubricJson);
    const ids = new Set(rubric.criteria.map((c) => c.id));
    for (const k of Object.keys(b.scores)) if (!ids.has(k)) throw new HttpError(400, 'Tiêu chí không thuộc rubric của dự án.');
    await prisma.projectGroup.update({ where: { id: pg.id }, data: { gradeDraftJson: JSON.stringify(b) } });
    return { ok: true };
  });
}
