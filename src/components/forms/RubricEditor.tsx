'use client';
import { stageName } from '@/lib/stages';
import { LEVEL_NAMES, rescaleWeights, totalWeight, USER_CENTERED_CRITERION, type Rubric, type RubricCriterion } from '@/lib/rubric';
import type { Mode } from '@/lib/types';

export type EditableCriterion = RubricCriterion & { on: boolean };

export function toRubric(items: EditableCriterion[]): Rubric {
  return { criteria: items.filter((c) => c.on).map((c) => ({ id: c.id, name: c.name, weight: c.weight, stageKeys: c.stageKeys, levels: c.levels })) };
}

export function rescaleOn(items: EditableCriterion[]): EditableCriterion[] {
  const on = rescaleWeights(items.filter((c) => c.on));
  return items.map((c) => ({ ...c, weight: on.find((o) => o.id === c.id)?.weight ?? c.weight }));
}

/** Trình sửa rubric dùng chung cho giao dự án, sửa mẫu và sửa rubric của dự án đã giao. */
export function RubricEditor({ items, onChange, mode, errors, note }: {
  items: EditableCriterion[]; onChange: (v: EditableCriterion[]) => void; mode: Mode; errors: string[]; note?: (c: EditableCriterion) => React.ReactNode;
}) {
  const total = totalWeight(toRubric(items));
  const up = (i: number, p: Partial<EditableCriterion>) => onChange(items.map((c, j) => (j === i ? { ...c, ...p } : c)));
  const newId = () => { let id = ''; do { id = `x${Math.random().toString(36).slice(2, 8)}`; } while (items.some((c) => c.id === id)); return id; };
  return (
    <div className="space-y-3">
      <p className="hint">Hệ số theo mức: {LEVEL_NAMES.map((n, i) => `${n.split(' – ')[0]} = ${[0, 0.5, 0.75, 1][i].toString().replace('.', ',')}`).join(' · ')}.</p>
      <div className={`rounded-lg border p-2 text-sm font-semibold ${total === 100 ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-rose-500 bg-rose-50 text-rose-900'}`} role="status">
        Tổng trọng số: {String(total).replace('.', ',')} / 100 {total === 100 ? '✓' : '— cần đúng 100'}
      </div>
      <div className="space-y-3">
        {items.map((c, i) => (
          <div key={c.id} className={`rounded-lg border p-3 ${c.on ? 'border-slate-400' : 'border-slate-200 bg-slate-50 opacity-70'}`}>
            <div className="grid items-end gap-2 sm:grid-cols-[auto_1fr_110px]">
              <label className="inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={c.on} onChange={(e) => up(i, { on: e.target.checked })} /> Dùng</label>
              <div><label className="label" htmlFor={`rn-${c.id}`}>Tên tiêu chí</label><input id={`rn-${c.id}`} className="input" value={c.name} onChange={(e) => up(i, { name: e.target.value })} /></div>
              <div><label className="label" htmlFor={`rw-${c.id}`}>Trọng số</label><input id={`rw-${c.id}`} type="number" min={0} max={100} step="any" className="input" value={c.weight} disabled={!c.on} onChange={(e) => up(i, { weight: Number(e.target.value) })} /></div>
            </div>
            <p className="mt-1 text-xs text-slate-700">Gắn với chặng: {c.stageKeys.length ? c.stageKeys.map((k) => `${k}. ${stageName(k)}`).join(', ') : 'không gắn chặng cụ thể'}</p>
            {note?.(c)}
            <details className="mt-2"><summary className="cursor-pointer text-sm font-semibold text-brand-700">Mô tả 4 mức</summary>
              <div className="mt-2 space-y-2">{c.levels.map((l, j) => (
                <div key={j}><label className="label" htmlFor={`rl-${c.id}-${j}`}>{LEVEL_NAMES[j]}</label>
                  <textarea id={`rl-${c.id}-${j}`} className="input" rows={2} value={l} onChange={(e) => up(i, { levels: c.levels.map((x, k) => (k === j ? e.target.value : x)) as RubricCriterion['levels'] })} /></div>))}</div></details>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-secondary btn" onClick={() => onChange(rescaleOn(items))}>Chia lại trọng số về 100</button>
        {mode === 'STEAM' && !items.some((c) => c.id === USER_CENTERED_CRITERION.id) && <button type="button" className="btn-secondary btn" onClick={() => onChange([...items, { ...USER_CENTERED_CRITERION, on: true }])}>+ Thêm tiêu chí “Thiết kế hướng tới người dùng”</button>}
        <button type="button" className="btn-secondary btn" onClick={() => onChange([...items, { id: newId(), name: 'Tiêu chí mới', weight: 0, stageKeys: [], levels: ['', '', '', ''], on: true }])}>+ Thêm tiêu chí khác</button>
      </div>
      {errors.length > 0 && <ul className="list-disc pl-5 text-sm text-rose-900">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>}
    </div>
  );
}
