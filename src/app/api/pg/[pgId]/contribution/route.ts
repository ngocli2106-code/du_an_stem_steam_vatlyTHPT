import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { handle, readJson } from '@/lib/api';
import { loadProjectGroup } from '@/lib/access';

const body = z.object({
  contribution: z.string().max(3000),
  reflection: z.string().max(3000),
  ratings: z.record(z.string(), z.number().int().min(0).max(3)),
});

export async function PUT(req: Request, ctx: { params: Promise<{ pgId: string }> }) {
  return handle(async () => {
    const u = await requireUser('STUDENT', true);
    const { pgId } = await ctx.params;
    const { pg } = await loadProjectGroup(u, pgId);
    const b = body.parse(await readJson(req));
    const data = { contribution: b.contribution, selfEvalJson: JSON.stringify({ reflection: b.reflection, ratings: b.ratings }), updatedAt: new Date() };
    const c = await prisma.contribution.upsert({
      where: { projectGroupId_userId: { projectGroupId: pg.id, userId: u.id } },
      create: { projectGroupId: pg.id, userId: u.id, ...data }, update: data,
    });
    return { ok: true, updatedAt: c.updatedAt };
  });
}
