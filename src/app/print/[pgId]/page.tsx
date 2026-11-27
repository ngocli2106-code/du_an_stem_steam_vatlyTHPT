import { notFound } from 'next/navigation';
import { requirePageUser } from '@/components/Shell';
import { loadGroupView } from '@/lib/group-view';
import { HttpError } from '@/lib/auth';
import { fmtDate, fmtDateTime } from '@/lib/progress';
import { SELF_EVAL_ITEMS, SELF_EVAL_LEVELS, stageName } from '@/lib/stages';
import { STATUS_LABEL } from '@/lib/types';
import { ContentView } from '@/components/ContentView';
import { RubricResult } from '@/components/RubricResult';
import { PrintButton } from './PrintButton';

export const dynamic = 'force-dynamic';

export default async function PrintPage({ params }: { params: Promise<{ pgId: string }> }) {
  const user = await requirePageUser();
  const { pgId } = await params;
  let v;
  try { v = await loadGroupView(user, pgId); } catch (e) { if (e instanceof HttpError) notFound(); throw e; }
  const back = user.role === 'TEACHER' ? `/teacher/pg/${pgId}` : `/student/p/${pgId}`;
  return (
    <div className="print-page mx-auto max-w-[210mm] bg-white px-4 py-4 sm:px-8">
      <div className="no-print mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 p-3">
        <a href={back} className="btn-secondary btn">← Quay lại</a>
        <PrintButton />
        <span className="text-sm text-slate-700">Bản in khổ A4. Trong hộp thoại in, chọn khổ A4 và bật “Đồ hoạ nền” nếu muốn giữ màu.</span>
      </div>

      <header className="mb-4 border-b-2 border-slate-800 pb-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">Hồ sơ dự án {v.mode} · Vật lí {v.project.grade}</p>
        <h1 className="text-2xl font-bold">{v.project.title}</h1>
        <p className="text-sm">Nhóm: <b>{v.groupName}</b> · Lớp {v.project.class.name} · Hạn nộp cuối {fmtDate(v.project.dueDate)}</p>
        <p className="text-sm">Thành viên: {v.members.map((m) => `${m.name}${m.roleLabel ? ` (${m.roleLabel})` : ''}`).join('; ')}</p>
        {v.project.isDemo && <p className="mt-1 inline-block rounded border-2 border-violet-600 px-2 py-0.5 text-sm font-bold text-violet-900">DỮ LIỆU MINH HỌA</p>}
        <p className="text-xs text-slate-600">In lúc {fmtDateTime(new Date())}</p>
      </header>

      {v.stages.map((s) => (
        <section key={s.key} className="print-stage mb-6" aria-labelledby={`ps-${s.key}`}>
          <h2 id={`ps-${s.key}`} className="print-section-head mb-2 border-b border-slate-400 pb-1 text-lg font-bold">
            {s.key}. {stageName(s.key)} <span className="text-sm font-normal text-slate-700">— {STATUS_LABEL[s.status]}</span>
          </h2>
          {s.status === 'NOT_STARTED' ? <p className="text-sm italic">Chưa bắt đầu.</p>
            : <ContentView stageKey={s.key} mode={v.mode} content={{ data: s.draft.data, evidenceMeta: s.draftEvidence }} />}
        </section>
      ))}

      <section className="mb-6" aria-labelledby="ps-rub">
        <h2 id="ps-rub" className="print-section-head mb-2 border-b border-slate-400 pb-1 text-lg font-bold">Kết quả đánh giá sản phẩm nhóm</h2>
        {v.published ? <RubricResult result={v.published} rubric={v.rubric} rubricVersion={v.project.rubricVersion} /> : <p className="text-sm italic">Giáo viên chưa công bố kết quả.</p>}
      </section>

      <section className="mb-6" aria-labelledby="ps-ctr">
        <h2 id="ps-ctr" className="print-section-head mb-2 border-b border-slate-400 pb-1 text-lg font-bold">Đóng góp và tự đánh giá cá nhân <span className="text-sm font-normal">(không tính vào điểm sản phẩm nhóm)</span></h2>
        {v.contributions.length === 0 ? <p className="text-sm italic">Chưa có nội dung.</p> : v.contributions.map((c) => (
          <div key={c.userId} className="avoid-break mb-2 text-sm">
            <p className="font-bold">{c.name}</p>
            <p className="whitespace-pre-wrap">Đóng góp: {c.contribution || '—'}</p>
            <p>Tự đánh giá: {SELF_EVAL_ITEMS.map((it) => `${it.label.replace('Tôi ', '')} – ${c.ratings[it.key] !== undefined ? SELF_EVAL_LEVELS[c.ratings[it.key]] : '—'}`).join('; ')}</p>
            <p className="whitespace-pre-wrap">Phản tư: {c.reflection || '—'}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
