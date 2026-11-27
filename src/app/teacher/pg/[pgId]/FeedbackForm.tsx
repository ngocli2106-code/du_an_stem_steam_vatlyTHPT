'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/client';

export function FeedbackForm({ pgId, stageKey, submissionId, mode }: { pgId: string; stageKey: number; submissionId: string; mode: 'decide' | 'comment' }) {
  const router = useRouter();
  const [text, setText] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function send(action: 'comment' | 'revision' | 'approve') {
    setBusy(true); setErr(null);
    try {
      await api(`/api/pg/${pgId}/stage/${stageKey}/feedback`, 'POST', { action, submissionId, text });
      setText(''); router.refresh();
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Không gửi được. Nội dung vẫn còn, hãy thử lại.'); }
    finally { setBusy(false); }
  }
  const id = `fb-${submissionId}`;
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="label">{mode === 'decide' ? 'Nhận xét cho nhóm' : 'Thêm nhận xét cho lần nộp này'}</label>
      <textarea id={id} rows={3} className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder={mode === 'decide' ? 'Cần nêu rõ điều nhóm phải bổ sung nếu yêu cầu chỉnh sửa' : ''} />
      <div className="flex flex-wrap gap-2">
        {mode === 'decide' && <>
          <button className="btn-danger btn" disabled={busy || !text.trim()} onClick={() => send('revision')}>↺ Yêu cầu bổ sung</button>
          <button className="btn-primary btn" disabled={busy} onClick={() => send('approve')}>✓ Duyệt chặng</button>
        </>}
        <button className="btn-secondary btn" disabled={busy || !text.trim()} onClick={() => send('comment')}>Chỉ gửi nhận xét</button>
      </div>
      {err && <p role="alert" className="text-sm font-semibold text-rose-900">{err}</p>}
    </div>
  );
}
