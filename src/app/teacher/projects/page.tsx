import Link from 'next/link';
import { prisma } from '@/lib/db';
import { Shell, requirePageUser } from '@/components/Shell';
import { DemoBadge, Empty, PageHeader } from '@/components/ui';
import { fmtDate } from '@/lib/progress';
import { stageShort } from '@/lib/stages';

export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
  const user = await requirePageUser('TEACHER');
  const projects = await prisma.project.findMany({ where: { class: { teacherId: user.id } }, include: { class: true, stages: true, _count: { select: { projectGroups: true } } }, orderBy: { createdAt: 'desc' } });
  return (
    <Shell user={user}>
      <PageHeader title="Dự án đã giao" actions={<Link href="/teacher/projects/new" className="btn-primary btn">+ Giao dự án mới</Link>} />
      {projects.length === 0 ? <Empty title="Chưa giao dự án nào">Chọn một mẫu để giao cho lớp.</Empty> : (
        <ul className="space-y-3">
          {projects.map((p) => (
            <li key={p.id} className="card">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/teacher/projects/${p.id}`} className="text-lg font-bold text-brand-700 underline">{p.title}</Link>
                <span className="badge border-slate-400 bg-slate-50">{p.kind === 'FULL' ? 'Dự án đầy đủ' : 'Nhiệm vụ ngắn'}</span>
                <span className="badge border-slate-400 bg-slate-50">{p.mode}</span>
                {p.isDemo && <DemoBadge />}
              </div>
              <p className="text-sm text-slate-700">Lớp {p.class.name} · {p._count.projectGroups} nhóm · hạn {fmtDate(p.dueDate)} · chặng: {p.stages.map((s) => s.stageKey).sort().map(stageShort).join(', ')}</p>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}
