import { stageName, STAGE_FORMS } from '@/lib/stages';
import type { ProjectContent } from '@/lib/types';
import { fmtDateTime } from '@/lib/progress';
import type { StageView } from '@/lib/group-view';
import type { Mode } from '@/lib/types';
import { ContentView } from './ContentView';

export function StageGuide({ stageKey, content }: { stageKey: number; content: ProjectContent }) {
  const info = content.stages[String(stageKey)];
  const prompts = STAGE_FORMS[stageKey]?.prompts ?? [];
  return (
    <section className="card space-y-3 border-brand-100 bg-brand-50" aria-labelledby="guide">
      <h2 id="guide" className="text-base font-bold">Hướng dẫn chặng {stageKey}: {stageName(stageKey)}</h2>
      {info?.task && <p className="text-sm"><b>Nhiệm vụ:</b> {info.task}</p>}
      {prompts.length > 0 && <div><p className="text-sm font-semibold">Câu hỏi gợi mở</p><ul className="list-disc pl-5 text-sm">{prompts.map((q, i) => <li key={i}>{q}</li>)}</ul></div>}
      {[3, 5, 6].includes(stageKey) && content.guidingQuestions.length > 0 && (
        <div><p className="text-sm font-semibold">Câu hỏi riêng của dự án</p><ul className="list-disc pl-5 text-sm">{content.guidingQuestions.map((q, i) => <li key={i}>{q}</li>)}</ul></div>
      )}
      {[4, 5].includes(stageKey) && content.safety && <p className="rounded-lg border border-amber-500 bg-amber-50 p-2 text-sm"><b>⚠ An toàn:</b> {content.safety}</p>}
      {[4, 5].includes(stageKey) && content.toolNotes.length > 0 && <div><p className="text-sm font-semibold">Hướng dẫn dụng cụ</p><ul className="list-disc pl-5 text-sm">{content.toolNotes.map((q, i) => <li key={i}>{q}</li>)}</ul></div>}
      {stageKey === 5 && content.dataTable.note && <p className="text-sm"><b>Lưu ý về phép đo:</b> {content.dataTable.note}</p>}
      {stageKey === 5 && content.criteria.length > 0 && <p className="text-xs text-slate-700">Tiêu chí của giáo viên nằm ở trang hồ sơ nhóm, mục “Hướng dẫn dự án”.</p>}
    </section>
  );
}

const KIND_LABEL: Record<string, string> = { COMMENT: 'Nhận xét', REVISION: 'Yêu cầu bổ sung', APPROVE: 'Đã duyệt' };
const KIND_STYLE: Record<string, string> = { COMMENT: 'border-slate-400 bg-slate-50', REVISION: 'border-rose-500 bg-rose-50', APPROVE: 'border-emerald-500 bg-emerald-50' };

export function SubmissionHistory({ stage, mode, children }: { stage: StageView; mode: Mode; children?: (subId: string) => React.ReactNode }) {
  if (stage.submissions.length === 0) return <p className="hint">Chưa có lần nộp nào.</p>;
  const subs = [...stage.submissions].reverse();
  return (
    <div className="space-y-3">
      {subs.map((s, i) => {
        const fbs = stage.feedbacks.filter((f) => f.submissionId === s.id);
        return (
          <details key={s.id} className="card !p-3" open={i === 0 && false}>
            <summary className="cursor-pointer font-semibold">Lần nộp {s.number} · {fmtDateTime(s.submittedAt)} · {s.by}{i === 0 && <span className="badge ml-2 border-brand-600 bg-brand-50 text-brand-800">Mới nhất</span>}
              {fbs.length > 0 && <span className="ml-2 text-sm font-normal text-slate-700">({fbs.length} phản hồi)</span>}</summary>
            <div className="mt-3 space-y-3">
              {fbs.map((f) => (
                <div key={f.id} className={`rounded-lg border-l-4 p-3 text-sm ${KIND_STYLE[f.kind]}`}>
                  <p className="font-semibold">{KIND_LABEL[f.kind]} · {f.author} · {fmtDateTime(f.createdAt)}</p>
                  {f.text && <p className="whitespace-pre-wrap">{f.text}</p>}
                </div>
              ))}
              {children?.(s.id)}
              <div className="border-t border-slate-200 pt-3"><ContentView stageKey={stage.key} mode={mode} content={s.content} /></div>
            </div>
          </details>
        );
      })}
    </div>
  );
}

export function FeedbackForLatest({ stage }: { stage: StageView }) {
  const last = stage.submissions[stage.submissions.length - 1];
  if (!last) return null;
  const fbs = stage.feedbacks.filter((f) => f.submissionId === last.id);
  if (!fbs.length) return null;
  return (
    <section className="space-y-2" aria-label="Phản hồi của giáo viên">
      {fbs.map((f) => (
        <div key={f.id} className={`rounded-lg border-l-4 p-3 text-sm ${KIND_STYLE[f.kind]}`}>
          <p className="font-semibold">{KIND_LABEL[f.kind]} cho lần nộp {last.number} · {f.author} · {fmtDateTime(f.createdAt)}</p>
          {f.text && <p className="whitespace-pre-wrap">{f.text}</p>}
        </div>
      ))}
    </section>
  );
}
