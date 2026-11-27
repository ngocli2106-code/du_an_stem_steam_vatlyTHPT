'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/client';

export function CopyTemplate({ id, title }: { id: string; title: string }) {
  const r = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function copy() {
    setBusy(true); setErr(null);
    try {
      const src = await fetch(`/api/templates/${id}`).then((x) => x.json());
      const res = await api<{ id: string }>('/api/templates', 'POST', { title: `${title} (bản sao)`, grade: src.grade, mode: src.mode, content: src.content, rubric: src.rubric });
      r.push(`/teacher/templates/${res.id}`);
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Không sao chép được.'); setBusy(false); }
  }
  return <><button className="btn-secondary btn" onClick={copy} disabled={busy}>{busy ? 'Đang sao chép…' : 'Sao chép để sửa'}</button>{err && <p role="alert" className="w-full text-sm text-rose-800">{err}</p>}</>;
}
