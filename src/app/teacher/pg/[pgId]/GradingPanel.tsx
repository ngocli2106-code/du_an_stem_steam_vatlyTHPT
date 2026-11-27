'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/client';
import { criterionScore, LEVEL_NAMES, round2, type GradeDraft, type PublishedResult, type Rubric } from '@/lib/rubric';
import { formatNumberVi } from '@/lib/numbers';
import { fmtDateTime } from '@/lib/progress';

export function GradingPanel({ pgId, rubric, draft, published, stale, projectId }: { pgId: string; rubric: Rubric; draft: GradeDraft | null; published: PublishedResult | null; stale: boolean; projectId: string }) {
  const router = useRouter();
  const [g, setG] = useState<GradeDraft>(draft ?? { scores: {}, overallComment: '' });
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const total = round2(rubric.criteria.reduce((a, c) => { const l = g.scores[c.id]?.level; return a + (l === null || l === undefined ? 0 : criterionScore(c.weight, l)); }, 0));
  const missing = rubric.criteria.filter((c) => g.scores[c.id]?.level === null || g.scores[c.id]?.level === undefined);
  const upd = (id: string, p: Partial<{ level: number | null; comment: string }>) => { setG((x) => ({ ...x, scores: { ...x.scores, [id]: { level: x.scores[id]?.level ?? null, comment: x.scores[id]?.comment ?? '', ...p } } })); setDirty(true); setMsg(null); };

  async function run(fn: () => Promise<any>, ok: string) {
    setBusy(true); setMsg(null);
    try { await fn(); setMsg({ ok: true, t: ok }); router.refresh(); return true; }
    catch (e) { setMsg({ ok: false, t: e instanceof ApiError ? e.message : 'Có lỗi xảy ra.' }); return false; }
    finally { setBusy(false); }
  }
  const saveDraft = async () => { const ok = await run(() => api(`/api/pg/${pgId}/grade`, 'PUT', g), 'Đã lưu nháp điểm. Học sinh chưa nhìn thấy.'); if (ok) setDirty(false); return ok; };
  const publish = async () => {
    if (missing.length) { setMsg({ ok: false, t: `Còn ${missing.length} tiêu chí chưa chấm.` }); return; }
    if (!confirm(`Công bố ${formatNumberVi(total)}/100 điểm và nhận xét cho nhóm? Học sinh trong nhóm sẽ nhìn thấy.`)) return;
    if (dirty && !(await saveDraft())) return;
    await run(() => api(`/api/pg/${pgId}/publish`, 'POST'), 'Đã công bố kết quả cho nhóm.');
  };

  return (
    <section className="card space-y-4" aria-labelledby="grade-h">
      <div>
        <h2 id="grade-h" className="text-lg font-bold">Chấm rubric (sản phẩm nhóm)</h2>
        <p className={`mt-1 rounded-lg border p-2 text-sm font-semibold ${published ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-slate-400 bg-slate-50'}`}>
          {published ? `Đã công bố ${formatNumberVi(published.total)}/100 lúc ${fmtDateTime(published.publishedAt)}. Sửa điểm rồi công bố lại nếu cần.` : 'Chưa công bố: học sinh chưa nhìn thấy điểm nháp.'}
        </p>
        {stale && <p role="status" className="mt-2 rounded-lg border border-amber-500 bg-amber-50 p-2 text-sm text-amber-900">Rubric của dự án đã được sửa sau lần công bố này. Học sinh vẫn thấy kết quả cũ. Kiểm tra lại các mức rồi bấm “Công bố kết quả” để cập nhật. <Link className="underline" href={`/teacher/projects/${projectId}/rubric`}>Xem rubric</Link></p>}
      </div>
      {rubric.criteria.map((c) => {
        const e = g.scores[c.id];
        return (
          <fieldset key={c.id} className="rounded-lg border border-slate-300 p-3">
            <legend className="px-1 text-sm font-bold">{c.name} <span className="font-normal text-slate-700">({formatNumberVi(c.weight)} điểm)</span></legend>
            <div className="space-y-1">
              {c.levels.map((desc, i) => (
                <label key={i} className={`flex min-h-[44px] cursor-pointer gap-2 rounded-lg border p-2 text-sm ${e?.level === i ? 'border-brand-700 bg-brand-50' : 'border-slate-300'}`}>
                  <input type="radio" name={`lv-${c.id}`} className="mt-1" checked={e?.level === i} onChange={() => upd(c.id, { level: i })} />
                  <span><b>{LEVEL_NAMES[i]}</b> · hệ số {formatNumberVi([0, 0.5, 0.75, 1][i])} → {formatNumberVi(criterionScore(c.weight, i))} điểm<br /><span className="text-slate-800">{desc}</span></span>
                </label>
              ))}
            </div>
            <label className="label mt-2" htmlFor={`cm-${c.id}`}>Nhận xét tiêu chí</label>
            <textarea id={`cm-${c.id}`} rows={2} className="input" value={e?.comment ?? ''} onChange={(ev) => upd(c.id, { comment: ev.target.value })} />
          </fieldset>
        );
      })}
      <div><label className="label" htmlFor="gc">Nhận xét chung</label><textarea id="gc" rows={3} className="input" value={g.overallComment} onChange={(e) => { setG({ ...g, overallComment: e.target.value }); setDirty(true); }} /></div>
      <p className="text-lg font-bold" aria-live="polite">Tổng (bản nháp): {formatNumberVi(total)} / 100{missing.length > 0 && <span className="ml-2 text-sm font-normal text-amber-900">còn {missing.length} tiêu chí chưa chấm</span>}</p>
      <div className="flex flex-wrap gap-2">
        <button className="btn-secondary btn" disabled={busy} onClick={saveDraft}>Lưu nháp điểm</button>
        <button className="btn-primary btn" disabled={busy || missing.length > 0} onClick={publish}>Công bố kết quả</button>
      </div>
      <div aria-live="polite">{msg && <p role={msg.ok ? 'status' : 'alert'} className={`text-sm font-semibold ${msg.ok ? 'text-emerald-800' : 'text-rose-900'}`}>{msg.t}</p>}</div>
      {dirty && <p className="text-xs text-amber-900">● Có thay đổi chưa lưu nháp.</p>}
    </section>
  );
}
