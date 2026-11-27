'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/client';
import { fieldsFor, type Field } from '@/lib/stages';
import { validateStage } from '@/lib/validate';
import type { Mode, ProjectContent, StageStatus } from '@/lib/types';
import { STATUS_LABEL } from '@/lib/types';
import type { EvidenceMeta } from '../ContentView';
import { CompareSummary } from '../DataView';
import { DatasetsEditor, initialData, type DataValue } from './DatasetsEditor';
import { EvidencePanel } from './EvidencePanel';
import { ListEditor, MatrixEditor } from './fields';

interface Props {
  pgId: string; stageKey: number; mode: Mode; version: number; status: StageStatus;
  initialData: Record<string, any>; initialEvidence: EvidenceMeta[];
  content: ProjectContent; stage1Criteria: string[]; stage5Data: DataValue | null;
  evidenceRequirements: string[]; updatedBy: string | null;
}

type Save = { kind: 'idle' } | { kind: 'saving' } | { kind: 'saved'; at: string } | { kind: 'offline'; msg: string }
  | { kind: 'conflict'; by: string | null } | { kind: 'locked'; msg: string } | { kind: 'error'; msg: string };

const clock = () => new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

export function StageEditor(p: Props) {
  const router = useRouter();
  const fields = fieldsFor(p.stageKey, p.mode);

  const seed = useMemo(() => {
    const d = { ...p.initialData };
    const df = fields.find((f) => f.type === 'datasets') as Extract<Field, { type: 'datasets' }> | undefined;
    if (df && !d[df.key]) {
      let v = initialData(p.content.dataTable, p.content.chartHint, df.fixedLabels);
      if (df.fixedLabels && p.stage5Data) {
        const cols = p.stage5Data.columns.map((c) => ({ ...c }));
        v = { ...v, columns: cols, datasets: v.datasets.map((ds) => ({ ...ds, rows: ds.rows.map((r) => ({ ...r, cells: Object.fromEntries(cols.map((c) => [c.id, ''])) })) })), chart: p.stage5Data.chart };
      }
      d[df.key] = v;
    }
    if (p.stageKey === 6 && !d.verdict) d.verdict = [];
    return d;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [data, setData] = useState<Record<string, any>>(seed);
  const [ev, setEv] = useState<EvidenceMeta[]>(p.initialEvidence);
  const [version, setVersion] = useState(p.version);
  const snap = (d: Record<string, any>, e: EvidenceMeta[]) => JSON.stringify([d, e.map((x) => [x.id, x.caption])]);
  const saved = useRef(snap(p.initialData, p.initialEvidence));
  const [save, setSave] = useState<Save>({ kind: 'idle' });
  const [errs, setErrs] = useState<string[]>([]);
  const [restore, setRestore] = useState<{ data: Record<string, any>; evidence: EvidenceMeta[] } | null>(null);
  const [conflict, setConflict] = useState<any>(null);
  const draftKey = `stem-draft:${p.pgId}:${p.stageKey}`;
  const dirty = snap(data, ev) !== saved.current;

  // Khôi phục bản chưa lưu sau khi mất mạng / đóng nhầm trang.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const b = JSON.parse(raw);
      if (b.baseVersion === p.version && snap(b.data, b.evidence) !== saved.current) setRestore({ data: b.data, evidence: b.evidence });
    } catch { /* bỏ qua */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => { try { localStorage.setItem(draftKey, JSON.stringify({ baseVersion: version, data, evidence: ev })); } catch { /* đầy bộ nhớ */ } }, 500);
    return () => clearTimeout(t);
  }, [data, ev, dirty, draftKey, version]);
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const set = useCallback((k: string, v: any) => setData((d) => ({ ...d, [k]: v })), []);
  const check = useMemo(() => validateStage(p.stageKey, p.mode, { data, evidence: ev.map((e) => ({ id: e.id, caption: e.caption })) }), [data, ev, p.stageKey, p.mode]);

  async function doSave(force = false): Promise<number | null> {
    setSave({ kind: 'saving' });
    try {
      const r = await api<{ version: number }>(`/api/pg/${p.pgId}/stage/${p.stageKey}/draft`, 'PUT', {
        baseVersion: version, force, content: { data, evidence: ev.map((e) => ({ id: e.id, caption: e.caption })) },
      });
      saved.current = snap(data, ev); setVersion(r.version); setConflict(null);
      try { localStorage.removeItem(draftKey); } catch { /* bỏ qua */ }
      setSave({ kind: 'saved', at: clock() });
      return r.version;
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 0) setSave({ kind: 'offline', msg: e.message });
        else if (e.data?.code === 'CONFLICT') { setConflict(e.data.current); setSave({ kind: 'conflict', by: e.data.current?.updatedBy ?? null }); }
        else if (e.data?.code === 'LOCKED') setSave({ kind: 'locked', msg: e.message });
        else setSave({ kind: 'error', msg: e.message });
      } else setSave({ kind: 'error', msg: 'Không lưu được.' });
      return null;
    }
  }

  async function doSubmit() {
    setErrs([]);
    if (check.blocking.length) { setErrs(check.blocking); return; }
    const msg = `Nộp chặng này?${check.warnings.length ? '\n\nLưu ý:\n- ' + check.warnings.join('\n- ') : ''}\n\nSau khi nộp, nhóm không sửa được cho tới khi giáo viên phản hồi.`;
    if (!confirm(msg)) return;
    let v = version;
    if (dirty || version === 0) { const nv = await doSave(); if (nv === null) return; v = nv; }
    setSave({ kind: 'saving' });
    try {
      await api(`/api/pg/${p.pgId}/stage/${p.stageKey}/submit`, 'POST', { baseVersion: v });
      try { localStorage.removeItem(draftKey); } catch { /* bỏ qua */ }
      saved.current = snap(data, ev);
      router.refresh();
    } catch (e) {
      if (e instanceof ApiError && e.data?.blocking) setErrs(e.data.blocking);
      else if (e instanceof ApiError && e.status === 0) setSave({ kind: 'offline', msg: e.message });
      else setSave({ kind: 'error', msg: e instanceof ApiError ? e.message : 'Không nộp được.' });
    }
  }

  const fid = (k: string) => `f-${p.stageKey}-${k}`;
  const renderField = (f: Field) => {
    const v = data[f.key];
    switch (f.type) {
      case 'text': return <input id={fid(f.key)} className="input" value={v ?? ''} placeholder={f.placeholder} onChange={(e) => set(f.key, e.target.value)} />;
      case 'longtext': return <textarea id={fid(f.key)} className="input" rows={4} value={v ?? ''} placeholder={f.placeholder} onChange={(e) => set(f.key, e.target.value)} />;
      case 'select': return <select id={fid(f.key)} className="input" value={v ?? ''} onChange={(e) => set(f.key, e.target.value)}><option value="">Chọn…</option>{f.options.map((o) => <option key={o}>{o}</option>)}</select>;
      case 'list': return <ListEditor pid={`s${p.stageKey}`} f={f} value={Array.isArray(v) ? v : []} onChange={(x) => set(f.key, x)} />;
      case 'matrix': return <MatrixEditor value={v} ideas={Array.isArray(data.ideas) ? data.ideas : []} criteriaFromStage1={p.stage1Criteria} onChange={(x) => set(f.key, x)} />;
      case 'datasets': {
        const fixed = f.fixedLabels;
        return <DatasetsEditor value={v as DataValue} fixedLabels={fixed} onChange={(x) => set(f.key, x)}
          copyFrom={fixed && p.stage5Data ? { label: 'Sao chép từ chặng Thử nghiệm', value: p.stage5Data } : undefined} />;
      }
      case 'compare': return <CompareSummary value={data.data} />;
    }
  };

  return (
    <div className="space-y-4 pb-28">
      {restore && (
        <div role="alert" className="rounded-lg border border-amber-500 bg-amber-50 p-3 text-sm">
          <p className="font-semibold">Tìm thấy nội dung chưa lưu trên thiết bị này (có thể do mất mạng hoặc đóng trang).</p>
          <div className="mt-2 flex gap-2">
            <button className="btn-primary btn btn-sm" onClick={() => { setData(restore.data); setEv(restore.evidence); setRestore(null); }}>Khôi phục</button>
            <button className="btn-secondary btn btn-sm" onClick={() => { try { localStorage.removeItem(draftKey); } catch { /* bỏ qua */ } setRestore(null); }}>Bỏ qua</button>
          </div>
        </div>
      )}

      {fields.map((f) => (
        <section key={f.key} className="card" aria-labelledby={`h-${fid(f.key)}`}>
          <h3 id={`h-${fid(f.key)}`} className="text-base font-bold"><label htmlFor={['text', 'longtext', 'select'].includes(f.type) ? fid(f.key) : undefined}>{f.label}</label></h3>
          {'hint' in f && f.hint && <p className="hint mb-2">{f.hint}</p>}
          <div className="mt-2">{renderField(f)}</div>
        </section>
      ))}

      <section className="card" aria-labelledby="h-ev">
        <h3 id="h-ev" className="mb-2 text-base font-bold">Minh chứng</h3>
        <EvidencePanel pgId={p.pgId} stageKey={p.stageKey} items={ev} requirements={p.evidenceRequirements}
          onAdd={(e) => setEv((x) => [...x, e])} onCaption={(id, c) => setEv((x) => x.map((e) => (e.id === id ? { ...e, caption: c } : e)))} onRemove={(id) => setEv((x) => x.filter((e) => e.id !== id))} />
      </section>

      {(check.blocking.length > 0 || check.warnings.length > 0 || errs.length > 0) && (
        <section className="card border-amber-400" aria-label="Kiểm tra trước khi nộp">
          <h3 className="text-base font-bold">Kiểm tra trước khi nộp</h3>
          <ul className="list-disc pl-5 text-sm">
            {[...new Set([...errs, ...check.blocking])].map((m, i) => <li key={`b${i}`} className="font-semibold text-rose-900">Cần sửa: {m}</li>)}
            {check.warnings.map((m, i) => <li key={`w${i}`} className="text-amber-900">Gợi ý: {m}</li>)}
          </ul>
        </section>
      )}

      <div className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-slate-300 bg-white/95 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2">
          <button className="btn-secondary btn" onClick={() => doSave()} disabled={save.kind === 'saving' || (!dirty && version > 0)}>Lưu nháp</button>
          <button className="btn-primary btn" onClick={doSubmit} disabled={save.kind === 'saving'}>Nộp chặng</button>
          <div aria-live="polite" className="min-w-0 flex-1 text-sm">
            {save.kind === 'saving' && <span>Đang lưu…</span>}
            {save.kind === 'saved' && !dirty && <span className="font-semibold text-emerald-800">✓ Đã lưu nháp lúc {save.at}</span>}
            {dirty && save.kind !== 'saving' && save.kind !== 'offline' && save.kind !== 'conflict' && save.kind !== 'error' && <span className="text-amber-900">● Có thay đổi chưa lưu</span>}
            {save.kind === 'offline' && <span role="alert" className="font-semibold text-rose-900">⚠ {save.msg} <button className="underline" onClick={() => doSave()}>Thử lại</button></span>}
            {save.kind === 'error' && <span role="alert" className="font-semibold text-rose-900">⚠ {save.msg} <button className="underline" onClick={() => doSave()}>Thử lại</button></span>}
            {save.kind === 'locked' && <span role="alert" className="font-semibold text-rose-900">⚠ {save.msg} <button className="underline" onClick={() => router.refresh()}>Tải lại</button></span>}
            {save.kind === 'idle' && !dirty && <span className="text-slate-700">Trạng thái: {STATUS_LABEL[p.status]}</span>}
          </div>
        </div>
        {save.kind === 'conflict' && (
          <div role="alert" className="mx-auto mt-2 max-w-5xl rounded-lg border border-rose-500 bg-rose-50 p-3 text-sm">
            <p className="font-semibold">Bản làm việc đã được {conflict?.updatedBy ? `${conflict.updatedBy} ` : 'một bạn cùng nhóm '}lưu trước đó. Lưu tiếp sẽ ghi đè phần của bạn ấy.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button className="btn-secondary btn btn-sm" onClick={() => { try { localStorage.removeItem(draftKey); } catch { /* */ } window.location.reload(); }}>Tải bản của nhóm (bỏ thay đổi của tôi)</button>
              <button className="btn-danger btn btn-sm" onClick={() => doSave(true)}>Ghi đè bằng bản của tôi</button>
            </div>
            <p className="mt-1 text-xs text-slate-700">Mẹo: nội dung của bạn vẫn còn trên màn hình. Hãy sao chép phần quan trọng trước khi chọn tải bản của nhóm.</p>
          </div>
        )}
      </div>
    </div>
  );
}
