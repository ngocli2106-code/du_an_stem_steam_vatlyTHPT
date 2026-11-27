import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireUser, HttpError } from '@/lib/auth';
import { handle, readJson } from '@/lib/api';
import { loadStage } from '@/lib/stage-ops';
import { REVISE_STATES } from '@/lib/progress';
import { parseDraft } from '@/lib/stages';
import { validateStage } from '@/lib/validate';
import type { Mode, StageStatus } from '@/lib/types';

const body = z.object({ baseVersion: z.number().int().min(0) });

export async function POST(req: Request, ctx: { params: Promise<{ pgId: string; key: string }> }) {
  return handle(async () => {
    const u = await requireUser('STUDENT', true);
    const { pgId, key } = await ctx.params;
    const { sw, pg, key: stageKey } = await loadStage(u, pgId, key);
    const b = body.parse(await readJson(req));
    if (!REVISE_STATES.includes(sw.status as StageStatus)) throw new HttpError(409, 'Chặng này đang chờ phản hồi hoặc đã được duyệt, không thể nộp.');
    if (sw.version !== b.baseVersion) {
      throw new HttpError(409, 'Bản làm việc đã thay đổi. Hãy lưu lại rồi nộp.', { code: 'CONFLICT' });
    }
    const draft = parseDraft(sw.draftJson);
    const v = validateStage(stageKey, pg.project.mode as Mode, draft);
    if (v.blocking.length) throw new HttpError(422, v.blocking.join(' '), { code: 'INVALID', blocking: v.blocking });

    const evRows = draft.evidence.length
      ? await prisma.evidence.findMany({ where: { id: { in: draft.evidence.map((e) => e.id) }, projectGroupId: pg.id } })
      : [];
    const evidenceMeta = draft.evidence.map((e) => {
      const r = evRows.find((x) => x.id === e.id);
      return { id: e.id, caption: e.caption, name: r?.fileName ?? '(không rõ)', mime: r?.mime ?? '', size: r?.size ?? 0 };
    });

    const res = await prisma.$transaction(async (tx) => {
      const upd = await tx.stageWork.updateMany({
        where: { id: sw.id, version: b.baseVersion, status: { in: REVISE_STATES } },
        data: { status: 'SUBMITTED', version: { increment: 1 }, updatedAt: new Date(), updatedById: u.id },
      });
      if (upd.count === 0) throw new HttpError(409, 'Bản làm việc đã thay đổi. Hãy tải lại trang.', { code: 'CONFLICT' });
      const n = await tx.submission.count({ where: { stageWorkId: sw.id } });
      const sub = await tx.submission.create({
        data: { stageWorkId: sw.id, number: n + 1, submittedById: u.id, contentJson: JSON.stringify({ data: draft.data, evidence: draft.evidence, evidenceMeta }) },
      });
      const cur = await tx.stageWork.findUnique({ where: { id: sw.id } });
      return { sub, version: cur!.version };
    });
    return { submissionId: res.sub.id, number: res.sub.number, version: res.version, status: 'SUBMITTED', warnings: v.warnings };
  });
}
