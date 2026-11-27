import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireUser, HttpError } from '@/lib/auth';
import { handle, readJson } from '@/lib/api';
import { loadStage } from '@/lib/stage-ops';

const body = z.object({
  action: z.enum(['comment', 'revision', 'approve']),
  submissionId: z.string(),
  text: z.string().max(4000),
});

export async function POST(req: Request, ctx: { params: Promise<{ pgId: string; key: string }> }) {
  return handle(async () => {
    const u = await requireUser('TEACHER', true);
    const { pgId, key } = await ctx.params;
    const { sw } = await loadStage(u, pgId, key);
    const b = body.parse(await readJson(req));
    const text = b.text.trim();
    if (b.action !== 'approve' && !text) throw new HttpError(400, 'Hãy viết nhận xét.');
    const sub = await prisma.submission.findFirst({ where: { id: b.submissionId, stageWorkId: sw.id } });
    if (!sub) throw new HttpError(404, 'Không tìm thấy lần nộp.');
    const kind = b.action === 'comment' ? 'COMMENT' : b.action === 'revision' ? 'REVISION' : 'APPROVE';

    await prisma.$transaction(async (tx) => {
      if (kind !== 'COMMENT') {
        const latest = await tx.submission.findFirst({ where: { stageWorkId: sw.id }, orderBy: { number: 'desc' } });
        if (latest?.id !== sub.id) throw new HttpError(409, 'Nhóm đã nộp phiên bản mới hơn. Hãy tải lại để xem.');
        const upd = await tx.stageWork.updateMany({
          where: { id: sw.id, status: 'SUBMITTED' },
          data: { status: kind === 'REVISION' ? 'NEEDS_REVISION' : 'APPROVED', version: { increment: 1 }, updatedAt: new Date() },
        });
        if (upd.count === 0) throw new HttpError(409, 'Chặng không còn ở trạng thái chờ phản hồi. Hãy tải lại.');
      }
      await tx.feedback.create({ data: { stageWorkId: sw.id, submissionId: sub.id, authorId: u.id, kind, text } });
    });
    return { ok: true };
  });
}
