'use client';
import { uid } from '@/lib/dataset';
import { formatNumberVi, parseNumberVi } from '@/lib/numbers';
import type { Field, SubField } from '@/lib/stages';

type Item = Record<string, any>;

function SubInput({ f, v, onChange, id, disabled }: { f: SubField; v: string; onChange: (v: string) => void; id: string; disabled?: boolean }) {
  const p = f.kind === 'number' ? parseNumberVi(v) : null;
  const bad = p && !p.ok;
  return (
    <div>
      <label htmlFor={id} className="label">{f.label}</label>
      {f.kind === 'longtext' ? <textarea id={id} rows={2} className="input" disabled={disabled} value={v} onChange={(e) => onChange(e.target.value)} />
        : f.kind === 'select' ? <select id={id} className="input" disabled={disabled} value={v} onChange={(e) => onChange(e.target.value)}><option value="">Chọn…</option>{f.options!.map((o) => <option key={o}>{o}</option>)}</select>
        : <input id={id} type={f.kind === 'date' ? 'date' : 'text'} inputMode={f.kind === 'number' ? 'decimal' : undefined} className={`input ${bad ? 'input-error' : ''}`} disabled={disabled}
            value={v} aria-invalid={bad ? true : undefined} aria-describedby={bad ? `${id}-e` : undefined} onChange={(e) => onChange(e.target.value)} />}
      {bad && p && !p.ok && <p id={`${id}-e`} role="alert" className="mt-0.5 text-xs font-semibold text-rose-800">⚠ {p.error}</p>}
    </div>
  );
}

export function ListEditor({ f, value, onChange, disabled, pid }: { f: Extract<Field, { type: 'list' }>; value: Item[]; onChange: (v: Item[]) => void; disabled?: boolean; pid: string }) {
  const items = value.length ? value : [];
  const total = f.sumKey ? items.reduce((a, it) => { const p = parseNumberVi(it[f.sumKey!]); return a + (p.ok && p.value ? p.value : 0); }, 0) : null;
  const blank = (): Item => ({ _id: uid('i'), ...Object.fromEntries(f.item.map((s) => [s.key, ''])) });
  return (
    <div className="space-y-3">
      {items.length === 0 && <p className="hint">Chưa có mục nào. Bấm “{f.addLabel}”{f.min ? ` (nên có ít nhất ${f.min})` : ''}.</p>}
      {items.map((it, i) => (
        <div key={it._id ?? i} className="rounded-lg border border-slate-300 bg-slate-50 p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            {f.item.map((s) => (
              <div key={s.key} className={s.kind === 'longtext' ? 'sm:col-span-2' : ''}>
                <SubInput f={s} id={`${pid}-${f.key}-${i}-${s.key}`} v={it[s.key] ?? ''} disabled={disabled}
                  onChange={(v) => onChange(items.map((x, j) => (j === i ? { ...x, [s.key]: v } : x)))} />
              </div>
            ))}
          </div>
          {!disabled && <button type="button" className="btn-danger btn btn-sm mt-2" onClick={() => onChange(items.filter((_, j) => j !== i))}>Xoá mục {i + 1}</button>}
        </div>
      ))}
      {!disabled && (!f.max || items.length < f.max) && <button type="button" className="btn-secondary btn" onClick={() => onChange([...items, blank()])}>+ {f.addLabel}</button>}
      {total !== null && items.length > 0 && <p className="text-sm font-semibold">{f.sumLabel}: {formatNumberVi(total)}</p>}
    </div>
  );
}

export function MatrixEditor({ value, ideas, criteriaFromStage1, onChange, disabled }: {
  value: { criteria: string[]; scores: Record<string, string[]> } | undefined; ideas: Item[]; criteriaFromStage1: string[];
  onChange: (v: { criteria: string[]; scores: Record<string, string[]> }) => void; disabled?: boolean;
}) {
  const m = value ?? { criteria: [], scores: {} };
  const named = ideas.map((it, i) => ({ id: it._id ?? String(i), title: it.title?.trim() || `Ý tưởng ${i + 1}` }));
  const setScore = (id: string, ci: number, v: string) => {
    const row = [...(m.scores[id] ?? [])]; while (row.length < m.criteria.length) row.push('');
    row[ci] = v; onChange({ ...m, scores: { ...m.scores, [id]: row } });
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {criteriaFromStage1.length > 0 && !disabled && <button type="button" className="btn-secondary btn btn-sm" onClick={() => onChange({ ...m, criteria: criteriaFromStage1 })}>Lấy tiêu chí từ chặng Xác định vấn đề</button>}
        {!disabled && <button type="button" className="btn-secondary btn btn-sm" disabled={m.criteria.length >= 8} onClick={() => onChange({ ...m, criteria: [...m.criteria, ''] })}>+ Thêm tiêu chí</button>}
      </div>
      {m.criteria.length === 0 || named.length === 0 ? <p className="hint">Cần có ít nhất một ý tưởng (ở trên) và một tiêu chí để so sánh.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead><tr className="bg-slate-100">
              <th scope="col" className="border border-slate-400 px-2 py-1 text-left">Ý tưởng</th>
              {m.criteria.map((c, ci) => (
                <th scope="col" key={ci} className="border border-slate-400 p-1 text-left">
                  <input aria-label={`Tiêu chí ${ci + 1}`} className="input !min-h-[36px] !px-2 !py-1" disabled={disabled} value={c}
                    onChange={(e) => onChange({ ...m, criteria: m.criteria.map((x, j) => (j === ci ? e.target.value : x)) })} /></th>
              ))}
              <th scope="col" className="border border-slate-400 px-2 py-1">Tổng</th>
            </tr></thead>
            <tbody>{named.map((n) => {
              const row = m.scores[n.id] ?? [];
              const t = m.criteria.reduce((a, _, ci) => { const p = parseNumberVi(row[ci]); return a + (p.ok && p.value ? p.value : 0); }, 0);
              return (
                <tr key={n.id}>
                  <th scope="row" className="border border-slate-400 px-2 py-1 text-left">{n.title}</th>
                  {m.criteria.map((_, ci) => (
                    <td key={ci} className="border border-slate-400 p-1">
                      <select aria-label={`${n.title} – ${m.criteria[ci] || `tiêu chí ${ci + 1}`}`} className="input !min-h-[36px] !px-2 !py-1" disabled={disabled} value={row[ci] ?? ''} onChange={(e) => setScore(n.id, ci, e.target.value)}>
                        <option value="">—</option>{[1, 2, 3, 4, 5].map((s) => <option key={s}>{s}</option>)}</select></td>
                  ))}
                  <td className="border border-slate-400 px-2 text-center font-bold">{formatNumberVi(t)}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
