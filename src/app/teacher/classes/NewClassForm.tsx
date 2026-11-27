'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/client';

export function NewClassForm() {
  const r = useRouter();
  const [name, setName] = useState('');
  const [grade, setGrade] = useState(10);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function go(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    try { const x = await api<{ id: string }>('/api/classes', 'POST', { name, grade }); r.push(`/teacher/classes/${x.id}`); }
    catch (e) { setErr(e instanceof ApiError ? e.message : 'Lỗi'); setBusy(false); }
  }
  return (
    <form onSubmit={go} className="card grid gap-3 sm:grid-cols-[1fr_140px_auto] sm:items-end">
      <div><label htmlFor="cn" className="label">Tên lớp</label><input id="cn" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ví dụ: 10A1" required /></div>
      <div><label htmlFor="cg" className="label">Khối</label>
        <select id="cg" className="input" value={grade} onChange={(e) => setGrade(Number(e.target.value))}><option value={10}>Lớp 10</option><option value={11}>Lớp 11</option><option value={12}>Lớp 12</option></select></div>
      <button className="btn-primary btn" disabled={busy}>Tạo lớp</button>
      {err && <p role="alert" className="text-sm text-rose-800 sm:col-span-3">{err}</p>}
    </form>
  );
}
