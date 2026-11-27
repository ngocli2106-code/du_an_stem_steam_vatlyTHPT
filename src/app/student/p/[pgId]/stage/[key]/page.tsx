import { notFound } from 'next/navigation';
import { Shell, requirePageUser } from '@/components/Shell';
import { Crumbs, PageHeader, StatusBadge } from '@/components/ui';
import { loadGroupView } from '@/lib/group-view';
import { HttpError } from '@/lib/auth';
import { fmtDate, REVISE_STATES } from '@/lib/progress';
import { stageName } from '@/lib/stages';
import { StageEditor } from '@/components/editor/StageEditor';
import { ContentView } from '@/components/ContentView';
import { FeedbackForLatest, StageGuide, SubmissionHistory } from '@/components/StageParts';
import type { DataValue } from '@/components/editor/DatasetsEditor';

export const dynamic = 'force-dynamic';

export default async function StagePage({ params }: { params: Promise<{ pgId: string; key: string }> }) {
  const user = await requirePageUser('STUDENT');
  const { pgId, key } = await params;
  let v;
  try { v = await loadGroupView(user, pgId); } catch (e) { if (e instanceof HttpError) notFound(); throw e; }
  const stage = v.stages.find((s) => String(s.key) === key);
  if (!stage) notFound();
  const editable = REVISE_STATES.includes(stage.status);
  const s1 = v.stages.find((s) => s.key === 1);
  const s5 = v.stages.find((s) => s.key === 5);
  const stage1Criteria: string[] = ((s1?.draft.data.criteria ?? []) as any[]).filter((c) => c.kind !== 'Ràng buộc' && c.text?.trim()).map((c) => c.text);
  const stage5Data = (s5?.draft.data.data ?? null) as DataValue | null;
  const lastRevision = stage.status === 'NEEDS_REVISION';
  return (
    <Shell user={user}>
      <Crumbs items={[{ href: '/student', label: 'Việc của nhóm' }, { href: `/student/p/${pgId}`, label: v.project.title }, { label: stageName(stage.key) }]} />
      <PageHeader title={`${stage.key}. ${stageName(stage.key)}`}
        sub={<span className="flex flex-wrap items-center gap-2"><StatusBadge status={stage.status} overdue={stage.overdue} /> Hạn nộp {fmtDate(stage.due)} · {v.groupName}</span>} />

      {lastRevision && <p className="mb-3 rounded-lg border border-rose-500 bg-rose-50 p-3 text-sm font-semibold text-rose-900">Giáo viên yêu cầu bổ sung. Hãy đọc phản hồi bên dưới, chỉnh sửa rồi nộp lại. Các lần nộp trước vẫn được giữ.</p>}
      <div className="mb-4"><FeedbackForLatest stage={stage} /></div>

      {editable ? (
        <div className="space-y-4">
          <StageGuide stageKey={stage.key} content={v.content} />
          <StageEditor
            pgId={pgId} stageKey={stage.key} mode={v.mode} version={stage.version} status={stage.status}
            initialData={stage.draft.data} initialEvidence={stage.draftEvidence} content={v.content}
            stage1Criteria={stage1Criteria} stage5Data={stage.key === 6 ? stage5Data : null}
            evidenceRequirements={v.content.stages[String(stage.key)]?.evidence ?? []} updatedBy={stage.updatedBy} />
        </div>
      ) : (
        <div className="space-y-4">
          <p className="rounded-lg border border-slate-400 bg-white p-3 text-sm">
            {stage.status === 'SUBMITTED' ? 'Chặng đã nộp và đang chờ giáo viên phản hồi. Nhóm chưa sửa được trong lúc này.' : 'Chặng đã được duyệt.'}
          </p>
          <section className="card"><h2 className="mb-3 text-lg font-bold">Nội dung đã nộp</h2><ContentView stageKey={stage.key} mode={v.mode} content={{ data: stage.draft.data, evidenceMeta: stage.draftEvidence }} /></section>
        </div>
      )}

      <section className="mt-6" aria-labelledby="hist"><h2 id="hist" className="mb-2 text-lg font-bold">Lịch sử các lần nộp</h2>
        <SubmissionHistory stage={stage} mode={v.mode} /></section>
    </Shell>
  );
}
