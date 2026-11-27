'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/client';

interface Student { userId: string; name: string; code: string | null; username: string; groupId: string; roleLabel: string }
interface Group { id: string; name: string; count: number }
interface Created { displayName: string; username: string; password: string }

export function ClassManager({ classId, students, groups }: { classId: string; students: Student[]; groups: Group[] }) {
  const router = useRouter();
  const [text, setText] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [created, setCreated] = useState<Created[]>([]);
  const [busy, setBusy] = useState(false);
  const [gname, setGname] = useState('');
  const [auto, setAuto] = useState(4);

  async function run<T>(fn: () => Promise<T>, okText?: string): Promise<T | undefined> {
    setBusy(true); setMsg(null);
    try { const r = await fn(); if (okText) setMsg({ ok: true, text: okText }); router.refresh(); return r; }
    catch (e) { setMsg({ ok: false, text: e instanceof ApiError ? e.message : 'Có lỗi xảy ra.' }); }
    finally { setBusy(false); }
  }

  async function addStudents(e: React.FormEvent) {
    e.preventDefault();
    const r = await run(() => api<{ created: Created[]; added: string[]; skipped: string[] }>(`/api/classes/${classId}/students`, 'POST', { text }));
    if (r) {
      setCreated((c) => [...r.created, ...c]); setText('');
      setMsg({ ok: true, text: `Đã thêm ${r.created.length + r.added.length} học sinh.${r.skipped.length ? ' Bỏ qua: ' + r.skipped.join('; ') : ''}` });
    }
  }

  return (
    <div className="space-y-6">
      <div aria-live="polite">{msg && <p role={msg.ok ? 'status' : 'alert'} className={`rounded-lg border p-3 text-sm ${msg.ok ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-rose-500 bg-rose-50 text-rose-900'}`}>{msg.text}</p>}</div>

      <section className="card" aria-labelledby="add-h">
        <h2 id="add-h" className="text-lg font-bold">Thêm học sinh</h2>
        <p className="hint mb-2">Mỗi dòng một học sinh: <code>Tên hiển thị</code>, hoặc <code>Mã học sinh</code>, hoặc <code>Mã | Tên</code>. Hệ thống tạo tài khoản và mật khẩu khởi tạo (chỉ hiện một lần).</p>
        <form onSubmit={addStudents} className="space-y-2">
          <label htmlFor="stu" className="label">Danh sách học sinh</label>
          <textarea id="stu" className="input min-h-[120px] font-mono" value={text} onChange={(e) => setText(e.target.value)} placeholder={'HS101 | Nguyễn Văn A\nTrần Thị B'} />
          <button className="btn-primary btn" disabled={busy || !text.trim()}>Thêm vào lớp</button>
        </form>
        {created.length > 0 && (
          <div className="mt-3 rounded-lg border border-amber-500 bg-amber-50 p-3 text-sm" role="region" aria-label="Tài khoản mới tạo">
            <p className="mb-2 font-semibold">Hãy lưu lại mật khẩu khởi tạo ngay bây giờ, hệ thống không hiển thị lại:</p>
            <table className="w-full text-left"><thead><tr><th>Tên</th><th>Tên đăng nhập</th><th>Mật khẩu</th></tr></thead>
              <tbody>{created.map((c) => <tr key={c.username}><td>{c.displayName}</td><td><code>{c.username}</code></td><td><code>{c.password}</code></td></tr>)}</tbody></table>
            <button className="btn-secondary btn btn-sm mt-2" onClick={() => setCreated([])}>Đã lưu, ẩn bảng này</button>
          </div>
        )}
      </section>

      <section className="card" aria-labelledby="grp-h">
        <h2 id="grp-h" className="text-lg font-bold">Nhóm</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <form onSubmit={(e) => { e.preventDefault(); run(() => api(`/api/classes/${classId}/groups`, 'POST', { name: gname }), 'Đã tạo nhóm.').then(() => setGname('')); }} className="flex items-end gap-2">
            <div className="flex-1"><label htmlFor="gn" className="label">Tạo nhóm thủ công</label><input id="gn" className="input" value={gname} onChange={(e) => setGname(e.target.value)} placeholder="Tên nhóm" required /></div>
            <button className="btn-primary btn" disabled={busy}>Tạo</button>
          </form>
          <form onSubmit={(e) => { e.preventDefault(); run(() => api(`/api/classes/${classId}/groups`, 'POST', { auto }), 'Đã chia nhóm ngẫu nhiên cho học sinh chưa có nhóm.'); }} className="flex items-end gap-2">
            <div className="flex-1"><label htmlFor="ga" className="label">Chia ngẫu nhiên học sinh chưa có nhóm</label>
              <div className="flex items-center gap-2"><input id="ga" type="number" min={1} max={20} className="input w-24" value={auto} onChange={(e) => setAuto(Number(e.target.value))} /><span className="text-sm">nhóm</span></div></div>
            <button className="btn-secondary btn" disabled={busy || students.length === 0}>Chia nhóm</button>
          </form>
        </div>
        <ul className="mt-3 flex flex-wrap gap-2">
          {groups.map((g) => (
            <li key={g.id} className="badge border-slate-400 bg-slate-50 text-slate-900">{g.name} · {g.count} HS
              <button className="ml-1 rounded px-1 text-rose-800 underline" aria-label={`Xoá ${g.name}`} onClick={() => { if (confirm(`Xoá ${g.name}? Thành viên sẽ chưa có nhóm.`)) run(() => api(`/api/classes/${classId}/groups/${g.id}`, 'DELETE'), 'Đã xoá nhóm.'); }}>xoá</button></li>
          ))}
          {groups.length === 0 && <li className="hint">Chưa có nhóm.</li>}
        </ul>
      </section>

      <section className="card" aria-labelledby="stu-h">
        <h2 id="stu-h" className="mb-2 text-lg font-bold">Học sinh ({students.length})</h2>
        {students.length === 0 ? <p className="hint">Chưa có học sinh. Thêm danh sách ở trên.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead><tr><th className="py-2">Học sinh</th><th>Tên đăng nhập</th><th>Nhóm</th><th>Vai trò trong nhóm</th><th><span className="sr-only">Thao tác</span></th></tr></thead>
              <tbody>
                {students.map((s) => (
                  <StudentRow key={s.userId + s.groupId + s.roleLabel} s={s} groups={groups} classId={classId} run={run} busy={busy} onPw={(c) => setCreated((x) => [c, ...x])} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StudentRow({ s, groups, classId, run, busy, onPw }: { s: Student; groups: Group[]; classId: string; run: (f: () => Promise<any>, ok?: string) => Promise<any>; busy: boolean; onPw: (c: Created) => void }) {
  const [role, setRole] = useState(s.roleLabel);
  const put = (groupId: string | null, roleLabel?: string) => run(() => api(`/api/classes/${classId}/students/${s.userId}`, 'PUT', { groupId, roleLabel }), 'Đã cập nhật nhóm.');
  return (
    <tr className="border-t border-slate-200">
      <th scope="row" className="py-2 pr-2 font-semibold">{s.name}{s.code && <span className="block text-xs font-normal text-slate-700">Mã {s.code}</span>}</th>
      <td><code>{s.username}</code></td>
      <td><label className="sr-only" htmlFor={`g-${s.userId}`}>Nhóm của {s.name}</label>
        <select id={`g-${s.userId}`} className="input !min-h-[36px] !py-1" value={s.groupId} disabled={busy} onChange={(e) => put(e.target.value || null, role)}>
          <option value="">Chưa có nhóm</option>{groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></td>
      <td><label className="sr-only" htmlFor={`r-${s.userId}`}>Vai trò của {s.name}</label>
        <input id={`r-${s.userId}`} className="input !min-h-[36px] !py-1" value={role} disabled={!s.groupId} placeholder="Ví dụ: Nhóm trưởng"
          onChange={(e) => setRole(e.target.value)} onBlur={() => { if (s.groupId && role !== s.roleLabel) put(s.groupId, role); }} /></td>
      <td className="space-x-1 whitespace-nowrap py-1">
        <button className="btn-secondary btn btn-sm" disabled={busy} onClick={async () => { if (!confirm(`Đặt lại mật khẩu của ${s.name}?`)) return; const r = await run(() => api<{ username: string; password: string }>(`/api/classes/${classId}/students/${s.userId}/reset-password`, 'POST'), 'Đã đặt lại mật khẩu, xem bảng ở phần Thêm học sinh.'); if (r) onPw({ displayName: s.name, username: r.username, password: r.password }); }}>Đặt lại MK</button>
        <button className="btn-danger btn btn-sm" disabled={busy} onClick={() => { if (confirm(`Xoá ${s.name} khỏi lớp?`)) run(() => api(`/api/classes/${classId}/students/${s.userId}`, 'DELETE'), 'Đã xoá khỏi lớp.'); }}>Xoá</button>
      </td>
    </tr>
  );
}
