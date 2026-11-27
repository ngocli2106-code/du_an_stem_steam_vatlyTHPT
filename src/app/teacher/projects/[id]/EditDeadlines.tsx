'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/client';
import { stageName } from '@/lib/stages';

interface Props { projectId: string; dueDate: string; stages: { key: number; dueDate: string }[] }

export function EditDeadlines({ projectId, dueDate, stages }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [due, setDue] = useState(dueDate);
  const [sd, setSd] = useState<Record<number, string>>(Object.fromEntries(stages.map((s) => [s.key, s.dueDate])));
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const later = stages.filter((s) => sd[s.key] && due && sd[s.key] > due);

  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null);
    try {
      await api(`/api/projects/${projectId}`, 'PATCH', { dueDate: due, stages: stages.map((s) => ({ key: s.key, dueDate: sd[s.key] || null })) });
      setMsg({ ok: true, t: 'Đã lưu hạn nộp mới. Trạng thái quá hạn được tính lại ngay.' });
      setOpen(false); router.refresh();
    } catch (e) { setMsg({ ok: false, t: e instanceof ApiError ? e.message : 'Không lưu được. Hãy thử lại.' }); }
    finally { setBusy(false); }
  }

  return (
    <div>
      {!open && <button type="button" className="btn-secondary btn btn-sm" onClick={() => { setOpen(true); setMsg(null); }}>Sửa hạn nộp</button>}
      {open && (
        <form onSubmit={save} className="mt-2 space-y-3 rounded-lg border border-slate-300 p-3" aria-label="Sửa hạn nộp">
          <div className="max-w-xs"><label htmlFor="ed-due" className="label">Hạn nộp cuối của dự án</label>
            <input id="ed-due" type="date" className="input" value={due} onChange={(e) => setDue(e.target.value)} required /></div>
          <ul className="space-y-2">
            {stages.map((s) => (
              <li key={s.key} className="flex flex-wrap items-center gap-2">
                <label htmlFor={`ed-${s.key}`} className="min-w-[200px] flex-1 text-sm font-semibold">{s.key}. {stageName(s.key)}</label>
                <input id={`ed-${s.key}`} type="date" className="input !w-44" value={sd[s.key] ?? ''} onChange={(e) => setSd({ ...sd, [s.key]: e.target.value })} />
                {sd[s.key] && <button type="button" className="btn-secondary btn btn-sm" onClick={() => setSd({ ...sd, [s.key]: '' })}>Dùng hạn dự án</button>}
              </li>
            ))}
          </ul>
          <p className="hint">Để trống hạn của chặng thì dùng hạn nộp cuối của dự án. Hạn tính đến 23:59 (giờ Việt Nam) của ngày đã chọn.</p>
          {later.length > 0 && <p className="text-sm text-amber-900">Lưu ý: chặng {later.map((s) => s.key).join(', ')} có hạn muộn hơn hạn nộp cuối của dự án.</p>}
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary btn" disabled={busy || !due}>{busy ? 'Đang lưu…' : 'Lưu hạn nộp'}</button>
            <button type="button" className="btn-secondary btn" onClick={() => setOpen(false)}>Huỷ</button>
          </div>
        </form>
      )}
      <div aria-live="polite">{msg && <p role={msg.ok ? 'status' : 'alert'} className={`mt-2 text-sm font-semibold ${msg.ok ? 'text-emerald-800' : 'text-rose-900'}`}>{msg.t}</p>}</div>
    </div>
  );
}
