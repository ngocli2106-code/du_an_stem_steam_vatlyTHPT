import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireUser, HttpError } from '@/lib/auth';
import { handle, readJson } from '@/lib/api';
import { loadStage } from '@/lib/stage-ops';
import { REVISE_STATES } from '@/lib/progress';
import type { StageStatus } from '@/lib/types';

const body = z.object({
  baseVersion: z.number().int().min(0),
  force: z.boolean().optional(),
  content: z.object({
    data: z.record(z.string(), z.any()),
    evidence: z.array(z.object({ id: z.string(), caption: z.string().max(300) })).max(30),
  }),
});

export async function PUT(req: Request, ctx: { params: Promise<{ pgId: string; key: string }> }) {
  return handle(async () => {
    const u = await requireUser('STUDENT', true);
    const { pgId, key } = await ctx.params;
    const { sw, pg } = await loadStage(u, pgId, key);
    const b = body.parse(await readJson(req));
    const json = JSON.stringify(b.content);
    if (json.length > 400_000) throw new HttpError(413, 'Nội dung quá lớn.');
    if (!REVISE_STATES.includes(sw.status as StageStatus)) {
      throw new HttpError(409, sw.status === 'SUBMITTED' ? 'Chặng đã nộp và đang chờ giáo viên phản hồi nên không sửa được.' : 'Chặng đã được duyệt nên không sửa được.', { code: 'LOCKED' });
    }
    if (b.content.evidence.length) {
      const n = await prisma.evidence.count({ where: { id: { in: b.content.evidence.map((e) => e.id) }, projectGroupId: pg.id } });
      if (n !== new Set(b.content.evidence.map((e) => e.id)).size) throw new HttpError(400, 'Minh chứng không thuộc hồ sơ nhóm.');
    }
    const base = b.force ? sw.version : b.baseVersion;
    const r = await prisma.stageWork.updateMany({
      where: { id: sw.id, version: base, status: { in: REVISE_STATES } },
      data: {
        draftJson: json, version: { increment: 1 }, updatedAt: new Date(), updatedById: u.id,
        ...(sw.status === 'NOT_STARTED' ? { status: 'IN_PROGRESS' } : {}),
      },
    });
    if (r.count === 0) {
      const cur = await prisma.stageWork.findUnique({ where: { id: sw.id }, include: { } });
      const who = cur?.updatedById ? (await prisma.user.findUnique({ where: { id: cur.updatedById } }))?.displayName : null;
      throw new HttpError(409, 'Bản làm việc đã được thay đổi ở nơi khác (bởi bạn cùng nhóm hoặc thiết bị khác).', {
        code: 'CONFLICT', current: { version: cur?.version, status: cur?.status, updatedBy: who, updatedAt: cur?.updatedAt, content: cur ? JSON.parse(cur.draftJson) : null },
      });
    }
    const cur = await prisma.stageWork.findUnique({ where: { id: sw.id } });
    return { version: cur!.version, status: cur!.status, updatedAt: cur!.updatedAt };
  });
}
