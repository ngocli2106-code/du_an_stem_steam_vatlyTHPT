import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireUser, HttpError } from '@/lib/auth';
import { loadOwnProject } from '@/lib/access';
import { handle, readJson } from '@/lib/api';
import { rubricSchema } from '@/lib/schemas';
import { criteriaOutsideStages, pruneDraft, validateRubric, type GradeDraft } from '@/lib/rubric';

const body = z.object({ baseVersion: z.number().int().min(1), rubric: rubricSchema });

/**
 * Sửa rubric của dự án đã giao.
 * - Điểm nháp: giữ mức đã chấm của tiêu chí còn lại (tính lại theo trọng số mới), bỏ tiêu chí đã xoá.
 * - Kết quả đã công bố: giữ nguyên bản đã công bố cho học sinh tới khi giáo viên công bố lại.
 */
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const u = await requireUser('TEACHER', true);
    const { id } = await ctx.params;
    const p = await loadOwnProject(u, id);
    const b = body.parse(await readJson(req));
    const errs = validateRubric(b.rubric);
    if (errs.length) throw new HttpError(400, 'Rubric chưa hợp lệ: ' + errs.join(' '));
    if (p.kind === 'SHORT') {
      const bad = criteriaOutsideStages(b.rubric, p.stages.map((s) => s.stageKey));
      if (bad.length) throw new HttpError(400, `Tiêu chí không gắn với chặng được giao: ${bad.map((c) => c.name).join(', ')}.`);
    }
    const result = await prisma.$transaction(async (tx) => {
      const upd = await tx.project.updateMany({
        where: { id, rubricVersion: b.baseVersion },
        data: { rubricJson: JSON.stringify(b.rubric), rubricVersion: { increment: 1 } },
      });
      if (upd.count === 0) throw new HttpError(409, 'Rubric vừa được sửa ở nơi khác. Hãy tải lại trang để xem bản mới nhất.', { code: 'CONFLICT' });
      const pgs = await tx.projectGroup.findMany({ where: { projectId: id }, select: { id: true, gradeDraftJson: true, publishedJson: true } });
      let drafts = 0;
      for (const pg of pgs) {
        if (!pg.gradeDraftJson) continue;
        drafts++;
        const next = pruneDraft(JSON.parse(pg.gradeDraftJson) as GradeDraft, b.rubric);
        await tx.projectGroup.update({ where: { id: pg.id }, data: { gradeDraftJson: JSON.stringify(next) } });
      }
      return { version: b.baseVersion + 1, drafts, published: pgs.filter((x) => x.publishedJson).length };
    });
    return { ok: true, ...result };
  });
}
