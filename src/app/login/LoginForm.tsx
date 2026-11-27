'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/client';

export function LoginForm() {
  const router = useRouter();
  const [username, setU] = useState('');
  const [password, setP] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const r = await api<{ role: string }>('/api/auth/login', 'POST', { username, password });
      router.push(r.role === 'TEACHER' ? '/teacher' : '/student');
      router.refresh();
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Không đăng nhập được.'); setBusy(false); }
  }
  return (
    <form onSubmit={submit} className="card space-y-4" aria-describedby={err ? 'login-err' : undefined}>
      <div><label htmlFor="u" className="label">Tên đăng nhập</label>
        <input id="u" className="input" autoComplete="username" autoCapitalize="none" value={username} onChange={(e) => setU(e.target.value)} required /></div>
      <div><label htmlFor="p" className="label">Mật khẩu</label>
        <input id="p" type="password" className="input" autoComplete="current-password" value={password} onChange={(e) => setP(e.target.value)} required /></div>
      {err && <p id="login-err" role="alert" className="rounded-lg border border-rose-400 bg-rose-50 p-3 text-sm text-rose-900">{err}</p>}
      <button className="btn-primary btn w-full" disabled={busy}>{busy ? 'Đang đăng nhập…' : 'Đăng nhập'}</button>
    </form>
  );
}
