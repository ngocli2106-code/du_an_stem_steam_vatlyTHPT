import { prisma } from './db';
import { HttpError } from './auth';
import { assertStageAssigned, loadProjectGroup } from './access';
import type { SessionUser } from './auth';

export async function loadStage(user: SessionUser, pgId: string, keyRaw: string) {
  const key = Number(keyRaw);
  const ctx = await loadProjectGroup(user, pgId);
  assertStageAssigned(ctx.pg, key);
  const sw = await prisma.stageWork.findUnique({ where: { projectGroupId_stageKey: { projectGroupId: pgId, stageKey: key } } });
  if (!sw) throw new HttpError(404, 'Không tìm thấy chặng.');
  return { ...ctx, key, sw };
}
