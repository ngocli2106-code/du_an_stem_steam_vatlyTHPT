import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { Shell, requirePageUser } from '@/components/Shell';
import { Crumbs, DemoBadge, PageHeader } from '@/components/ui';
import { ProgressMatrix } from '@/components/ProgressMatrix';
import { teacherOverview } from '@/lib/overview';
import { ensureProjectGroups } from '@/lib/project-setup';
import { fmtDate, toDateInput } from '@/lib/progress';
import { EditDeadlines } from './EditDeadlines';
import { ExportScores } from './ExportScores';
import { stageName } from '@/lib/stages';
import type { Rubric } from '@/lib/rubric';

export const dynamic = 'force-dynamic';

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageUser('TEACHER');
  const { id } = await params;
  const p = await prisma.project.findUnique({ where: { id }, include: { class: true, stages: { orderBy: { stageKey: 'asc' } } } });
  if (!p || p.class.teacherId !== user.id) notFound();
  await ensureProjectGroups(id);
  const rows = await teacherOverview(user.id, { projectId: id });
  const rubric: Rubric = JSON.parse(p.rubricJson);
  return (
    <Shell user={user} wide>
      <Crumbs items={[{ href: '/teacher/projects', label: 'Dự án' }, { label: p.title }]} />
      <PageHeader title={<>{p.title} {p.isDemo && <DemoBadge />}</>}
        sub={`Lớp ${p.class.name} · ${p.kind === 'FULL' ? 'Dự án đầy đủ' : 'Nhiệm vụ ngắn'} · ${p.mode} · hạn ${fmtDate(p.dueDate)}`} />
      <section className="card mb-5 grid gap-4 md:grid-cols-2">
        <div><h2 className="font-bold">Mục tiêu</h2><p className="whitespace-pre-wrap text-sm">{p.goals || '—'}</p></div>
        <div><h2 className="font-bold">Chặng được giao và hạn</h2>
          <ul className="text-sm">{p.stages.map((s) => <li key={s.id}>{s.stageKey}. {stageName(s.stageKey)} — {fmtDate(s.dueDate ?? p.dueDate)}{!s.dueDate && ' (theo hạn dự án)'}</li>)}</ul>
          <div className="mt-2"><EditDeadlines projectId={p.id} dueDate={toDateInput(p.dueDate)}
            stages={p.stages.map((s) => ({ key: s.stageKey, dueDate: s.dueDate ? toDateInput(s.dueDate) : '' }))} /></div></div>
        <div className="md:col-span-2"><h2 className="font-bold">Rubric đã giao (bản lưu cùng dự án)</h2>
          <ul className="text-sm">{rubric.criteria.map((c) => <li key={c.id}>{c.name}: {c.weight} điểm</li>)}</ul></div>
      </section>
      <section className="card mb-5" aria-labelledby="exp-h"><h2 id="exp-h" className="mb-2 font-bold">Xuất điểm ra CSV</h2><ExportScores projectId={p.id} /></section>
      <ProgressMatrix rows={rows} />
      <p className="mt-3 text-sm"><Link className="underline" href={`/teacher?projectId=${id}`}>Mở trong bảng tiến độ có bộ lọc</Link></p>
    </Shell>
  );
}
