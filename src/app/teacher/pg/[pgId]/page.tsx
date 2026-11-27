import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Shell, requirePageUser } from '@/components/Shell';
import { Crumbs, DemoBadge, PageHeader, StatusBadge } from '@/components/ui';
import { loadGroupView } from '@/lib/group-view';
import { HttpError } from '@/lib/auth';
import { fmtDate, fmtDateTime } from '@/lib/progress';
import { SELF_EVAL_ITEMS, SELF_EVAL_LEVELS, stageName, stageShort } from '@/lib/stages';
import { ContentView } from '@/components/ContentView';
import { SubmissionHistory } from '@/components/StageParts';
import { ProjectBrief } from '@/components/ProjectBrief';
import { FeedbackForm } from './FeedbackForm';
import { GradingPanel } from './GradingPanel';

export const dynamic = 'force-dynamic';

export default async function TeacherGroupPage({ params, searchParams }: { params: Promise<{ pgId: string }>; searchParams: Promise<{ stage?: string }> }) {
  const user = await requirePageUser('TEACHER');
  const { pgId } = await params;
  const sp = await searchParams;
  let v;
  try { v = await loadGroupView(user, pgId); } catch (e) { if (e instanceof HttpError) notFound(); throw e; }
  const def = v.stages.find((s) => s.status === 'SUBMITTED') ?? v.stages.find((s) => s.status === 'NEEDS_REVISION') ?? v.stages[0];
  const stage = v.stages.find((s) => String(s.key) === sp.stage) ?? def;
  const latest = stage?.submissions[stage.submissions.length - 1];
  return (
    <Shell user={user} wide>
      <Crumbs items={[{ href: '/teacher', label: 'Tiến độ' }, { href: `/teacher/projects/${v.project.id}`, label: v.project.title }, { label: v.groupName }]} />
      <PageHeader title={<>{v.groupName} {v.project.isDemo && <DemoBadge />}</>}
        sub={<>{v.project.title} · Lớp {v.project.class.name} · Thành viên: {v.members.map((m) => `${m.name}${m.roleLabel ? ` (${m.roleLabel})` : ''}`).join(', ')}</>}
        actions={<Link href={`/print/${v.pg.id}`} target="_blank" className="btn-secondary btn">In hồ sơ A4</Link>} />

      <nav aria-label="Chặng" className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {v.stages.map((s) => (
          <Link key={s.key} href={`?stage=${s.key}`} aria-current={s.key === stage?.key ? 'page' : undefined}
            className={`whitespace-nowrap rounded-lg border px-3 py-2 text-sm font-semibold ${s.key === stage?.key ? 'border-brand-700 bg-brand-50' : 'border-slate-300 bg-white'}`}>
            {s.key}. {stageShort(s.key)} <StatusBadge status={s.status} overdue={s.overdue} />
          </Link>
        ))}
      </nav>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-5">
          {stage && (
            <>
              <section className="card" aria-labelledby="stg-h">
                <h2 id="stg-h" className="text-lg font-bold">{stage.key}. {stageName(stage.key)}</h2>
                <p className="mb-3 flex flex-wrap items-center gap-2 text-sm"><StatusBadge status={stage.status} overdue={stage.overdue} /> Hạn {fmtDate(stage.due)} · {stage.submissions.length} lần nộp · cập nhật bản làm việc {fmtDateTime(stage.updatedAt)}{stage.updatedBy ? ` bởi ${stage.updatedBy}` : ''}</p>

                {latest && stage.status === 'SUBMITTED' && (
                  <div className="mb-4 rounded-lg border-2 border-amber-400 bg-amber-50 p-3">
                    <p className="mb-2 font-semibold">Lần nộp {latest.number} đang chờ phản hồi</p>
                    <FeedbackForm pgId={pgId} stageKey={stage.key} submissionId={latest.id} mode="decide" />
                  </div>
                )}

                {['IN_PROGRESS', 'NEEDS_REVISION'].includes(stage.status) && (
                  <details className="mb-4 rounded-lg border border-slate-300 p-3">
                    <summary className="cursor-pointer font-semibold">Bản làm việc hiện tại của nhóm (chưa nộp)</summary>
                    <div className="mt-3"><ContentView stageKey={stage.key} mode={v.mode} content={{ data: stage.draft.data, evidenceMeta: stage.draftEvidence }} /></div>
                  </details>
                )}
                {stage.status === 'NOT_STARTED' && <p className="hint">Nhóm chưa bắt đầu chặng này.</p>}

                <h3 className="mb-2 mt-2 font-bold">Các lần nộp (mới nhất trước)</h3>
                <SubmissionHistory stage={stage} mode={v.mode}>
                  {(subId) => subId === latest?.id && stage.status !== 'SUBMITTED'
                    ? <FeedbackForm pgId={pgId} stageKey={stage.key} submissionId={subId} mode="comment" />
                    : subId !== latest?.id ? <FeedbackForm pgId={pgId} stageKey={stage.key} submissionId={subId} mode="comment" /> : null}
                </SubmissionHistory>
              </section>
            </>
          )}

          <section className="card" aria-labelledby="ctr"><h2 id="ctr" className="mb-2 text-lg font-bold">Đóng góp và tự đánh giá cá nhân</h2>
            <p className="hint mb-2">Tách riêng với điểm sản phẩm nhóm. Chỉ giáo viên và chính học sinh xem được.</p>
            {v.members.map((m) => {
              const c = v.contributions.find((x) => x.userId === m.userId);
              return (
                <div key={m.userId} className="mb-3 rounded-lg border border-slate-300 p-3 text-sm">
                  <p className="font-bold">{m.name} {m.roleLabel && <span className="font-normal text-slate-700">· {m.roleLabel}</span>}</p>
                  {!c ? <p className="text-slate-600">Chưa ghi đóng góp.</p> : (
                    <>
                      <p className="whitespace-pre-wrap"><b>Đóng góp:</b> {c.contribution || '—'}</p>
                      <p><b>Tự đánh giá:</b> {SELF_EVAL_ITEMS.map((it) => `${it.label.replace('Tôi ', '')}: ${c.ratings[it.key] !== undefined ? SELF_EVAL_LEVELS[c.ratings[it.key]] : '—'}`).join(' · ')}</p>
                      <p className="whitespace-pre-wrap"><b>Phản tư:</b> {c.reflection || '—'}</p>
                      <p className="text-xs text-slate-600">Cập nhật {fmtDateTime(c.updatedAt)}</p>
                    </>
                  )}
                </div>
              );
            })}
          </section>
          <details className="card"><summary className="cursor-pointer font-bold">Hướng dẫn dự án đã giao</summary><div className="mt-3"><ProjectBrief content={v.content} project={v.project} mode={v.mode} /></div></details>
        </div>

        <aside className="lg:sticky lg:top-4 lg:self-start">
          <GradingPanel pgId={pgId} rubric={v.rubric} draft={v.gradeDraft} published={v.published} />
        </aside>
      </div>
    </Shell>
  );
}
