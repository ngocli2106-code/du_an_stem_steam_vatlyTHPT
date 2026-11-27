import { fieldsFor, type Field } from '@/lib/stages';
import { formatNumberVi, parseNumberVi } from '@/lib/numbers';
import type { Mode } from '@/lib/types';
import { CompareSummary, DataBlock } from './DataView';

export interface EvidenceMeta { id: string; name: string; mime: string; size: number; caption: string }

export function EvidenceList({ items }: { items: EvidenceMeta[] }) {
  if (!items.length) return <p className="hint">Chưa có minh chứng đính kèm.</p>;
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map((e) => (
        <li key={e.id} className="avoid-break rounded-lg border border-slate-300 p-2">
          {e.mime.startsWith('image/') ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/files/${e.id}`} alt={e.caption || e.name} className="mx-auto max-h-64 w-auto rounded print:max-h-56" loading="lazy" />
          ) : (
            <a href={`/api/files/${e.id}`} target="_blank" rel="noreferrer" className="font-semibold text-brand-700 underline">📄 {e.name}</a>
          )}
          <p className="mt-1 text-sm text-slate-800">{e.caption || <span className="text-slate-600">{e.name}</span>}</p>
        </li>
      ))}
    </ul>
  );
}

function matrixRows(v: any, ideas: any[]) {
  const crit: string[] = v?.criteria ?? [];
  return { crit, rows: ideas.map((it, i) => ({ title: it.title || `Ý tưởng ${i + 1}`, scores: (v?.scores?.[it._id ?? String(i)] ?? []) as string[] })) };
}

function FieldView({ f, data, stageKey }: { f: Field; data: Record<string, any>; stageKey: number }) {
  const v = data[f.key];
  const empty = <p className="text-sm italic text-slate-600">Chưa điền.</p>;
  switch (f.type) {
    case 'text': case 'longtext': case 'select':
      return typeof v === 'string' && v.trim() ? <p className="whitespace-pre-wrap">{v}</p> : empty;
    case 'list': {
      const items = (Array.isArray(v) ? v : []).filter((it: any) => Object.entries(it).some(([k, x]) => !k.startsWith('_') && typeof x === 'string' && x.trim()));
      if (!items.length) return empty;
      const total = f.sumKey ? items.reduce((a: number, it: any) => { const p = parseNumberVi(it[f.sumKey!]); return a + (p.ok && p.value ? p.value : 0); }, 0) : null;
      return (
        <div className="overflow-x-auto">
          <table className="data-table w-full border-collapse text-sm">
            <thead><tr className="bg-slate-100">{f.item.map((s) => <th key={s.key} className="border border-slate-400 px-2 py-1 text-left">{s.label}</th>)}</tr></thead>
            <tbody>{items.map((it: any, i: number) => (
              <tr key={i}>{f.item.map((s) => <td key={s.key} className="whitespace-pre-wrap border border-slate-400 px-2 py-1">{it[s.key] ?? ''}</td>)}</tr>
            ))}</tbody>
          </table>
          {total !== null && <p className="mt-1 text-sm font-semibold">{f.sumLabel}: {formatNumberVi(total)}</p>}
        </div>
      );
    }
    case 'matrix': {
      const ideas = (Array.isArray(data.ideas) ? data.ideas : []).filter((x: any) => x.title?.trim());
      const { crit, rows } = matrixRows(v, ideas);
      if (!crit.length || !rows.length) return empty;
      return (
        <div className="overflow-x-auto"><table className="data-table w-full border-collapse text-sm">
          <thead><tr className="bg-slate-100"><th className="border border-slate-400 px-2 py-1 text-left">Ý tưởng</th>{crit.map((c, i) => <th key={i} className="border border-slate-400 px-2 py-1 text-left">{c}</th>)}<th className="border border-slate-400 px-2 py-1">Tổng</th></tr></thead>
          <tbody>{rows.map((r, i) => {
            const t = r.scores.reduce((a, s) => { const p = parseNumberVi(s); return a + (p.ok && p.value ? p.value : 0); }, 0);
            return <tr key={i}><td className="border border-slate-400 px-2 py-1 font-semibold">{r.title}</td>{crit.map((_, j) => <td key={j} className="border border-slate-400 px-2 py-1 text-center">{r.scores[j] || '—'}</td>)}<td className="border border-slate-400 px-2 py-1 text-center font-bold">{formatNumberVi(t)}</td></tr>;
          })}</tbody></table></div>
      );
    }
    case 'datasets':
      return v ? <DataBlock value={v} withConditions={stageKey !== 6} /> : empty;
    case 'compare':
      return <CompareSummary value={data.data} />;
  }
}

export function ContentView({ stageKey, mode, content }: {
  stageKey: number; mode: Mode;
  content: { data: Record<string, any>; evidence?: { id: string; caption: string }[]; evidenceMeta?: EvidenceMeta[] };
}) {
  const fields = fieldsFor(stageKey, mode);
  const meta: EvidenceMeta[] = content.evidenceMeta ?? (content.evidence ?? []).map((e) => ({ id: e.id, caption: e.caption, name: 'minh chứng', mime: 'image/*', size: 0 }));
  return (
    <div className="space-y-4">
      {fields.map((f) => (
        <section key={f.key} className="avoid-break-none">
          <h4 className="mb-1 text-sm font-bold text-slate-900">{f.label}</h4>
          <FieldView f={f} data={content.data} stageKey={stageKey} />
        </section>
      ))}
      <section>
        <h4 className="mb-1 text-sm font-bold text-slate-900">Minh chứng đính kèm</h4>
        <EvidenceList items={meta} />
      </section>
    </div>
  );
}
