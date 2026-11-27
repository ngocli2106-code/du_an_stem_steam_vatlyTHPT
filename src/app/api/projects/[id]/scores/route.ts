import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { loadOwnProject } from '@/lib/access';
import { handle } from '@/lib/api';
import { buildScoreRows, toCsv, type CsvFormat } from '@/lib/csv';
import { slugVi } from '@/lib/people';
import { toDateInput } from '@/lib/progress';
import type { Rubric } from '@/lib/rubric';

/** Xuất điểm sản phẩm nhóm ra CSV. ?format=vn|std, ?draft=1 để gồm điểm nháp. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const u = await requireUser('TEACHER');
    const { id } = await ctx.params;
    const p = await loadOwnProject(u, id);
    const url = new URL(req.url);
    const format: CsvFormat = url.searchParams.get('format') === 'std' ? 'std' : 'vn';
    const includeDraft = url.searchParams.get('draft') === '1';
    const pgs = await prisma.projectGroup.findMany({
      where: { projectId: id },
      include: { group: { include: { members: { include: { user: true } } } }, stageWorks: true },
      orderBy: { group: { name: 'asc' } },
    });
    const rubric: Rubric = JSON.parse(p.rubricJson);
    const rows = buildScoreRows(rubric, pgs.map((pg) => ({
      className: p.class.name, groupName: pg.group.name,
      members: pg.group.members.map((m) => ({ code: m.user.studentCode, name: m.user.displayName, username: m.user.username, roleLabel: m.roleLabel }))
        .sort((a, b) => a.name.localeCompare(b.name, 'vi')),
      stagesAssigned: p.stages.length,
      stagesApproved: pg.stageWorks.filter((w) => w.status === 'APPROVED' && p.stages.some((s) => s.stageKey === w.stageKey)).length,
      published: pg.publishedJson ? JSON.parse(pg.publishedJson) : null,
      draft: pg.gradeDraftJson ? JSON.parse(pg.gradeDraftJson) : null,
    })), includeDraft);
    const name = `diem-${slugVi(p.title).replace(/\./g, '-') || 'du-an'}${includeDraft ? '-nhap' : ''}-${toDateInput(new Date())}.csv`;
    return new NextResponse(toCsv(rows, format), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${name}"; filename*=UTF-8''${encodeURIComponent(name)}`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  });
}
