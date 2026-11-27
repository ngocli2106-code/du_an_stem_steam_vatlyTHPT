import { prisma } from '@/lib/db';
import { requireUser, HttpError } from '@/lib/auth';
import { handle } from '@/lib/api';
import { loadProjectGroup } from '@/lib/access';
import { computeResult, type GradeDraft, type Rubric } from '@/lib/rubric';

export async function POST(_req: Request, ctx: { params: Promise<{ pgId: string }> }) {
  return handle(async () => {
    const u = await requireUser('TEACHER', true);
    const { pgId } = await ctx.params;
    const { pg } = await loadProjectGroup(u, pgId);
    if (!pg.gradeDraftJson) throw new HttpError(400, 'Chưa có bản nháp điểm để công bố.');
    const rubric: Rubric = JSON.parse(pg.project.rubricJson);
    let result;
    try { result = { ...computeResult(rubric, JSON.parse(pg.gradeDraftJson) as GradeDraft), rubricVersion: pg.project.rubricVersion }; }
    catch (e) { throw new HttpError(400, e instanceof Error ? e.message : 'Không tính được điểm.'); }
    await prisma.projectGroup.update({ where: { id: pg.id }, data: { publishedJson: JSON.stringify(result), publishedAt: new Date(result.publishedAt) } });
    return { ok: true, total: result.total };
  });
}
