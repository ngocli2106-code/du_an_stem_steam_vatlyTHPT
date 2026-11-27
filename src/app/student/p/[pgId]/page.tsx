import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Shell, requirePageUser } from '@/components/Shell';
import { Crumbs, DemoBadge, PageHeader, StatusBadge } from '@/components/ui';
import { loadGroupView } from '@/lib/group-view';
import { HttpError } from '@/lib/auth';
import { fmtDate } from '@/lib/progress';
import { stageName } from '@/lib/stages';
import { ProjectBrief } from '@/components/ProjectBrief';
import { RubricResult } from '@/components/RubricResult';

export const dynamic = 'force-dynamic';

export default async function StudentGroupPage({ params }: { params: Promise<{ pgId: string }> }) {
  const user = await requirePageUser('STUDENT');
  const { pgId } = await params;
  let v;
  try { v = await loadGroupView(user, pgId); } catch (e) { if (e instanceof HttpError) notFound(); throw e; }
  const me = v.members.find((m) => m.userId === user.id);
  return (
    <Shell user={user}>
      <Crumbs items={[{ href: '/student', label: 'Việc của nhóm' }, { label: v.project.title }]} />
      <PageHeader title={<>{v.project.title} {v.project.isDemo && <DemoBadge />}</>}
        sub={`${v.groupName} · Vai trò của bạn: ${me?.roleLabel || 'chưa được giao'} · Hạn nộp cuối ${fmtDate(v.project.dueDate)}`}
        actions={<Link href={`/print/${v.pg.id}`} className="btn-secondary btn" target="_blank">In hồ sơ A4</Link>} />

      <section className="card mb-4" aria-labelledby="stg"><h2 id="stg" className="mb-2 text-lg font-bold">Các chặng</h2>
        <ol className="space-y-2">
          {v.stages.map((s) => (
            <li key={s.key} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-300 p-3">
              <div><Link className="font-semibold text-brand-700 underline" href={`/student/p/${v.pg.id}/stage/${s.key}`}>{s.key}. {stageName(s.key)}</Link>
                <div className="text-sm text-slate-700">Hạn {fmtDate(s.due)} · {s.submissions.length} lần nộp</div></div>
              <StatusBadge status={s.status} overdue={s.overdue} />
            </li>
          ))}
        </ol>
        <p className="mt-3"><Link href={`/student/p/${v.pg.id}/me`} className="btn-secondary btn">Đóng góp và tự đánh giá của tôi</Link></p>
      </section>

      {v.published && <section className="card mb-4" aria-labelledby="res"><h2 id="res" className="mb-2 text-lg font-bold">Kết quả đã công bố</h2><RubricResult result={v.published} rubric={v.rubric} rubricVersion={v.project.rubricVersion} /></section>}
      <ProjectBrief content={v.content} project={v.project} mode={v.mode} />
    </Shell>
  );
}
