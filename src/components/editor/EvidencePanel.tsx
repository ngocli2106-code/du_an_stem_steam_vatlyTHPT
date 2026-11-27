'use client';
import { useRef, useState } from 'react';
import type { EvidenceMeta } from '../ContentView';

export function EvidencePanel({ pgId, stageKey, items, requirements, onAdd, onCaption, onRemove, disabled }: {
  pgId: string; stageKey: number; items: EvidenceMeta[]; requirements: string[];
  onAdd: (e: EvidenceMeta) => void; onCaption: (id: string, c: string) => void; onRemove: (id: string) => void; disabled?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true); setErr(null);
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('Tệp quá lớn (tối đa 5 MB).');
      const fd = new FormData(); fd.append('file', file); fd.append('stageKey', String(stageKey));
      let res: Response;
      try { res = await fetch(`/api/pg/${pgId}/evidence`, { method: 'POST', body: fd, credentials: 'same-origin' }); }
      catch { throw new Error('Mất kết nối mạng. Hãy thử tải lại tệp khi có mạng.'); }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `Lỗi ${res.status}`);
      onAdd({ id: data.id, name: data.name, mime: data.mime, size: data.size, caption: '' });
    } catch (e) { setErr(e instanceof Error ? e.message : 'Không tải được tệp.'); }
    finally { setBusy(false); if (ref.current) ref.current.value = ''; }
  }

  return (
    <div className="space-y-3">
      {requirements.length > 0 && (
        <div className="rounded-lg border border-brand-100 bg-brand-50 p-3 text-sm">
          <p className="font-semibold">Giáo viên yêu cầu minh chứng:</p>
          <ul className="list-disc pl-5">{requirements.map((r, i) => <li key={i}>{r}</li>)}</ul>
        </div>
      )}
      {items.length === 0 && <p className="hint">Chưa đính kèm minh chứng.</p>}
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((e) => (
          <li key={e.id} className="rounded-lg border border-slate-300 p-2">
            {e.mime.startsWith('image/')
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={`/api/files/${e.id}`} alt={e.caption || e.name} className="mx-auto max-h-48 w-auto rounded" loading="lazy" />
              : <a href={`/api/files/${e.id}`} target="_blank" rel="noreferrer" className="font-semibold text-brand-700 underline">📄 {e.name}</a>}
            <label className="label mt-2" htmlFor={`cap-${e.id}`}>Chú thích</label>
            <input id={`cap-${e.id}`} className="input" disabled={disabled} value={e.caption} placeholder="Ảnh này cho thấy điều gì?" onChange={(ev) => onCaption(e.id, ev.target.value)} />
            {!disabled && <button type="button" className="btn-danger btn btn-sm mt-2" onClick={() => onRemove(e.id)}>Bỏ khỏi chặng này</button>}
          </li>
        ))}
      </ul>
      {!disabled && (
        <div>
          <label htmlFor="ev-file" className="btn-secondary btn cursor-pointer">{busy ? 'Đang tải lên…' : '+ Thêm ảnh hoặc PDF'}</label>
          <input id="ev-file" ref={ref} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" disabled={busy}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
          <p className="hint mt-1">JPG, PNG, WebP hoặc PDF, tối đa 5 MB mỗi tệp.</p>
        </div>
      )}
      {err && <p role="alert" className="rounded-lg border border-rose-500 bg-rose-50 p-2 text-sm text-rose-900">{err}</p>}
    </div>
  );
}
