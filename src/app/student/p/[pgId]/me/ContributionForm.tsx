'use client';
import { useState } from 'react';
import { api, ApiError } from '@/lib/client';
import { SELF_EVAL_ITEMS, SELF_EVAL_LEVELS } from '@/lib/stages';

export function ContributionForm({ pgId, initial }: { pgId: string; initial: { contribution: string; reflection: string; ratings: Record<string, number> } }) {
  const [s, setS] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [busy, setBusy] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null);
    try { await api(`/api/pg/${pgId}/contribution`, 'PUT', s); setMsg({ ok: true, t: 'Đã lưu.' }); }
    catch (e) { setMsg({ ok: false, t: e instanceof ApiError ? e.message : 'Không lưu được. Nội dung vẫn còn trên màn hình, hãy thử lại.' }); }
    finally { setBusy(false); }
  }
  return (
    <form onSubmit={save} className="space-y-4">
      <div className="card"><label htmlFor="ct" className="label">Tôi đã đóng góp gì cho dự án? (nêu việc cụ thể, kèm minh chứng nếu có)</label>
        <textarea id="ct" rows={5} className="input" value={s.contribution} onChange={(e) => setS({ ...s, contribution: e.target.value })} /></div>
      <fieldset className="card"><legend className="label">Tự đánh giá</legend>
        <div className="space-y-3">{SELF_EVAL_ITEMS.map((it) => (
          <div key={it.key}><p className="text-sm font-semibold" id={`se-${it.key}`}>{it.label}</p>
            <div role="radiogroup" aria-labelledby={`se-${it.key}`} className="mt-1 flex flex-wrap gap-2">
              {SELF_EVAL_LEVELS.map((l, i) => (
                <label key={l} className={`inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm ${s.ratings[it.key] === i ? 'border-brand-700 bg-brand-50 font-semibold' : 'border-slate-400'}`}>
                  <input type="radio" name={`r-${it.key}`} checked={s.ratings[it.key] === i} onChange={() => setS({ ...s, ratings: { ...s.ratings, [it.key]: i } })} />{l}</label>))}
            </div></div>))}
        </div>
      </fieldset>
      <div className="card"><label htmlFor="rf" className="label">Phản tư: tôi học được gì và sẽ làm khác đi điều gì?</label>
        <textarea id="rf" rows={4} className="input" value={s.reflection} onChange={(e) => setS({ ...s, reflection: e.target.value })} /></div>
      <div className="flex items-center gap-3"><button className="btn-primary btn" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu'}</button>
        <span aria-live="polite" className={`text-sm font-semibold ${msg?.ok ? 'text-emerald-800' : 'text-rose-900'}`}>{msg?.t}</span></div>
    </form>
  );
}
