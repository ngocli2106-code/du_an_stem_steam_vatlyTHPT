import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { Shell, requirePageUser } from '@/components/Shell';
import { Crumbs, PageHeader } from '@/components/ui';
import { isPublishedStale, type GradeDraft, type PublishedResult, type Rubric } from '@/lib/rubric';
import { RubricEditForm } from './RubricEditForm';

export const dynamic = 'force-dynamic';

export default async function EditRubricPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageUser('TEACHER');
  const { id } = await params;
  const p = await prisma.project.findUnique({ where: { id }, include: { class: true, stages: true, projectGroups: { select: { gradeDraftJson: true, publishedJson: true } } } });
  if (!p || p.class.teacherId !== user.id) notFound();
  const rubric: Rubric = JSON.parse(p.rubricJson);
  const drafts = p.projectGroups.map((g) => (g.gradeDraftJson ? (JSON.parse(g.gradeDraftJson) as GradeDraft) : null));
  const pubs = p.projectGroups.map((g) => (g.publishedJson ? (JSON.parse(g.publishedJson) as PublishedResult) : null));
  // Số nhóm đã được chấm (nháp) ở từng tiêu chí, để giáo viên thấy tác động khi xoá/sửa.
  const scoredCount = Object.fromEntries(rubric.criteria.map((c) => [c.id, drafts.filter((d) => d?.scores[c.id]?.level != null).length]));
  return (
    <Shell user={user}>
      <Crumbs items={[{ href: '/teacher/projects', label: 'Dự án' }, { href: `/teacher/projects/${p.id}`, label: p.title }, { label: 'Sửa rubric' }]} />
      <PageHeader title="Sửa rubric của dự án đã giao" sub={`${p.title} · Lớp ${p.class.name} · ${p.kind === 'FULL' ? 'Dự án đầy đủ' : 'Nhiệm vụ ngắn'} · phiên bản rubric ${p.rubricVersion}`} />
      <RubricEditForm
        projectId={p.id} mode={p.mode as 'STEM' | 'STEAM'} kind={p.kind as 'FULL' | 'SHORT'} version={p.rubricVersion} rubric={rubric}
        stageKeys={p.stages.map((s) => s.stageKey)} groups={p.projectGroups.length}
        draftGroups={drafts.filter(Boolean).length} publishedGroups={pubs.filter(Boolean).length}
        stalePublished={pubs.filter((x) => isPublishedStale(x, p.rubricVersion)).length} scoredCount={scoredCount} />
    </Shell>
  );
}
