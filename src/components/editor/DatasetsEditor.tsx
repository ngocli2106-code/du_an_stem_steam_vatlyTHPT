'use client';
import { useMemo } from 'react';
import { buildSeries, colLabel, columnMean, uid, validateDatasets, type Column, type Dataset } from '@/lib/dataset';
import { formatNumberVi } from '@/lib/numbers';
import type { ProjectContent } from '@/lib/types';
import { LineChart } from '../Chart';

export interface DataValue { columns: Column[]; datasets: Dataset[]; chart?: { x: string; y: string } }

export function emptyRow(columns: Column[]) {
  return { id: uid('r'), cells: Object.fromEntries(columns.map((c) => [c.id, ''])), note: '' };
}

/** Bảng dữ liệu trống theo cấu hình của mẫu. */
export function initialData(dt: ProjectContent['dataTable'], hint?: { x: string; y: string }, labels?: string[]): DataValue {
  const columns: Column[] = dt.columns.map((c, i) => ({ id: `c${i + 1}`, name: c.name, unit: c.unit, type: c.type }));
  const names = labels ?? dt.datasetLabels;
  const datasets: Dataset[] = names.map((label) => ({
    id: uid('d'), label,
    conditions: dt.conditionKeys.map((k) => ({ k, v: '' })),
    rows: Array.from({ length: dt.defaultRows }, () => emptyRow(columns)),
  }));
  return { columns, datasets, chart: defaultChart(columns, hint) };
}

export function defaultChart(columns: Column[], hint?: { x: string; y: string }) {
  const nums = columns.filter((c) => c.type === 'number');
  const find = (n?: string) => (n ? nums.find((c) => c.name.trim().toLowerCase() === n.trim().toLowerCase()) : undefined);
  const x = find(hint?.x) ?? nums[0];
  const y = find(hint?.y) ?? nums.find((c) => c.id !== x?.id);
  return x && y ? { x: x.id, y: y.id } : undefined;
}

export function DatasetsEditor({ value, onChange, fixedLabels, disabled, copyFrom }: {
  value: DataValue; onChange: (v: DataValue) => void; fixedLabels?: string[]; disabled?: boolean;
  copyFrom?: { label: string; value: DataValue | null };
}) {
  const { columns, datasets } = value;
  const errors = useMemo(() => validateDatasets(columns, datasets), [columns, datasets]);
  const errMap = new Map(errors.map((e) => [`${e.dsId}|${e.rowId}|${e.colId}`, e.message]));
  const set = (p: Partial<DataValue>) => onChange({ ...value, ...p });
  const setDs = (i: number, p: Partial<Dataset>) => set({ datasets: datasets.map((d, j) => (j === i ? { ...d, ...p } : d)) });
  const setCol = (i: number, p: Partial<Column>) => set({ columns: columns.map((c, j) => (j === i ? { ...c, ...p } : c)) });
  const nums = columns.filter((c) => c.type === 'number');
  const chart = value.chart && nums.some((c) => c.id === value.chart!.x) && nums.some((c) => c.id === value.chart!.y) ? value.chart : defaultChart(columns);
  const xCol = columns.find((c) => c.id === chart?.x);
  const yCol = columns.find((c) => c.id === chart?.y);

  function addCol() {
    const id = uid('c');
    set({ columns: [...columns, { id, name: '', unit: '', type: 'number' }], datasets: datasets.map((d) => ({ ...d, rows: d.rows.map((r) => ({ ...r, cells: { ...r.cells, [id]: '' } })) })) });
  }
  function delCol(i: number) {
    if (columns.length <= 1 || !confirm(`Xoá cột “${colLabel(columns[i])}” và dữ liệu trong cột?`)) return;
    set({ columns: columns.filter((_, j) => j !== i) });
  }
  function copyIn(i: number, src: Dataset, srcCols: Column[]) {
    // Sao chép theo tên cột; cột không khớp để trống.
    const norm = (s: string) => s.trim().toLowerCase();
    const rows = src.rows.map((r) => ({
      id: uid('r'), note: r.note,
      cells: Object.fromEntries(columns.map((c) => { const sc = srcCols.find((x) => norm(x.name) === norm(c.name)); return [c.id, sc ? r.cells[sc.id] ?? '' : '']; })),
    }));
    setDs(i, { rows, conditions: src.conditions.map((c) => ({ ...c })) });
  }

  return (
    <div className="space-y-5">
      {errors.length > 0 && (
        <p role="alert" className="rounded-lg border border-rose-500 bg-rose-50 p-3 text-sm font-semibold text-rose-900">
          Có {errors.length} ô nhập chưa hợp lệ (đánh dấu đỏ). Có thể gõ số thập phân bằng dấu phẩy, ví dụ 12,5.
        </p>
      )}

      <div className="rounded-lg border border-slate-300 p-3">
        <h4 className="mb-2 text-sm font-bold">Các cột (đại lượng và đơn vị)</h4>
        <div className="space-y-2">
          {columns.map((c, i) => (
            <div key={c.id} className="grid gap-2 sm:grid-cols-[1fr_110px_120px_auto]">
              <input aria-label={`Tên đại lượng cột ${i + 1}`} className="input" disabled={disabled} value={c.name} placeholder="Tên đại lượng" onChange={(e) => setCol(i, { name: e.target.value })} />
              <input aria-label={`Đơn vị cột ${i + 1}`} className="input" disabled={disabled} value={c.unit} placeholder="Đơn vị" onChange={(e) => setCol(i, { unit: e.target.value })} />
              <select aria-label={`Kiểu dữ liệu cột ${i + 1}`} className="input" disabled={disabled} value={c.type} onChange={(e) => setCol(i, { type: e.target.value as Column['type'] })}>
                <option value="number">Số</option><option value="text">Văn bản</option></select>
              <button type="button" className="btn-danger btn btn-sm" disabled={disabled || columns.length <= 1} onClick={() => delCol(i)}>Xoá cột</button>
            </div>
          ))}
        </div>
        <button type="button" className="btn-secondary btn btn-sm mt-2" disabled={disabled || columns.length >= 12} onClick={addCol}>+ Thêm cột</button>
      </div>

      {datasets.map((ds, di) => (
        <fieldset key={ds.id} className="rounded-lg border border-slate-400 p-3">
          <legend className="px-1 text-sm font-bold">{fixedLabels ? ds.label : `Lượt đo ${di + 1}`}</legend>
          <div className="mb-3 flex flex-wrap items-end gap-2">
            {!fixedLabels && (
              <div className="min-w-[200px] flex-1"><label className="label" htmlFor={`dl-${ds.id}`}>Tên phương án / phiên bản</label>
                <input id={`dl-${ds.id}`} className="input" disabled={disabled} value={ds.label} onChange={(e) => setDs(di, { label: e.target.value })} /></div>
            )}
            {copyFrom?.value && copyFrom.value.datasets.length > 0 && !disabled && (
              <div><label className="label" htmlFor={`cp-${ds.id}`}>{copyFrom.label}</label>
                <select id={`cp-${ds.id}`} className="input" value="" onChange={(e) => { const s = copyFrom.value!.datasets.find((x) => x.id === e.target.value); if (s && confirm('Thay dữ liệu của lượt này bằng bản sao từ chặng Thử nghiệm?')) copyIn(di, s, copyFrom.value!.columns); }}>
                  <option value="">Chọn lượt đo để sao chép…</option>{copyFrom.value.datasets.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></div>
            )}
            {!fixedLabels && datasets.length > 1 && !disabled && (
              <button type="button" className="btn-danger btn btn-sm" onClick={() => { if (confirm(`Xoá lượt “${ds.label}”?`)) set({ datasets: datasets.filter((_, j) => j !== di) }); }}>Xoá lượt này</button>
            )}
          </div>

          <div className="mb-3">
            <h5 className="mb-1 text-sm font-semibold">Điều kiện đo</h5>
            <div className="space-y-1">
              {ds.conditions.map((c, ci) => (
                <div key={ci} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <input aria-label={`Tên điều kiện ${ci + 1} của ${ds.label}`} className="input !min-h-[40px]" disabled={disabled} value={c.k} placeholder="Điều kiện (ví dụ Nhiệt độ phòng)"
                    onChange={(e) => setDs(di, { conditions: ds.conditions.map((x, j) => (j === ci ? { ...x, k: e.target.value } : x)) })} />
                  <input aria-label={`Giá trị điều kiện ${ci + 1} của ${ds.label}`} className="input !min-h-[40px]" disabled={disabled} value={c.v} placeholder="Giá trị / mô tả"
                    onChange={(e) => setDs(di, { conditions: ds.conditions.map((x, j) => (j === ci ? { ...x, v: e.target.value } : x)) })} />
                  <button type="button" className="btn-secondary btn btn-sm" disabled={disabled} aria-label={`Xoá điều kiện ${ci + 1}`} onClick={() => setDs(di, { conditions: ds.conditions.filter((_, j) => j !== ci) })}>Xoá</button>
                </div>
              ))}
            </div>
            <button type="button" className="btn-secondary btn btn-sm mt-1" disabled={disabled} onClick={() => setDs(di, { conditions: [...ds.conditions, { k: '', v: '' }] })}>+ Thêm điều kiện</button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <caption className="sr-only">Bảng dữ liệu {ds.label}</caption>
              <thead><tr className="bg-slate-100">
                <th scope="col" className="w-10 border border-slate-400 px-1 py-1">#</th>
                {columns.map((c) => <th scope="col" key={c.id} className="border border-slate-400 px-2 py-1 text-left">{colLabel(c)}</th>)}
                <th scope="col" className="border border-slate-400 px-2 py-1 text-left">Ghi chú</th>
                <th scope="col" className="w-12 border border-slate-400 px-1 py-1"><span className="sr-only">Xoá dòng</span></th>
              </tr></thead>
              <tbody>
                {ds.rows.map((r, ri) => (
                  <tr key={r.id}>
                    <td className="border border-slate-400 px-1 text-center">{ri + 1}</td>
                    {columns.map((c) => {
                      const msg = errMap.get(`${ds.id}|${r.id}|${c.id}`);
                      const eid = `e-${ds.id}-${r.id}-${c.id}`;
                      return (
                        <td key={c.id} className="border border-slate-400 p-1 align-top">
                          <input aria-label={`${colLabel(c)}, dòng ${ri + 1}, ${ds.label}`} className={`input !min-h-[40px] !px-2 !py-1 ${msg ? 'input-error' : ''}`}
                            inputMode={c.type === 'number' ? 'decimal' : 'text'} disabled={disabled} value={r.cells[c.id] ?? ''}
                            aria-invalid={msg ? true : undefined} aria-describedby={msg ? eid : undefined}
                            onChange={(e) => setDs(di, { rows: ds.rows.map((x) => (x.id === r.id ? { ...x, cells: { ...x.cells, [c.id]: e.target.value } } : x)) })} />
                          {msg && <p id={eid} role="alert" className="mt-0.5 text-xs font-semibold text-rose-800">⚠ {msg}</p>}
                        </td>
                      );
                    })}
                    <td className="border border-slate-400 p-1 align-top"><input aria-label={`Ghi chú dòng ${ri + 1}, ${ds.label}`} className="input !min-h-[40px] !px-2 !py-1" disabled={disabled} value={r.note} onChange={(e) => setDs(di, { rows: ds.rows.map((x) => (x.id === r.id ? { ...x, note: e.target.value } : x)) })} /></td>
                    <td className="border border-slate-400 text-center"><button type="button" className="btn-secondary btn btn-sm" disabled={disabled} aria-label={`Xoá dòng ${ri + 1} của ${ds.label}`} onClick={() => setDs(di, { rows: ds.rows.filter((x) => x.id !== r.id) })}>✕</button></td>
                  </tr>
                ))}
                {columns.some((c) => c.type === 'number' && columnMean(ds, c)) && (
                  <tr className="bg-slate-50 font-semibold">
                    <td className="border border-slate-400 px-1 text-center">TB</td>
                    {columns.map((c) => { const m = c.type === 'number' ? columnMean(ds, c) : null; return <td key={c.id} className="border border-slate-400 px-2 py-1">{m ? `${formatNumberVi(m.mean)} (n=${m.n})` : ''}</td>; })}
                    <td className="border border-slate-400" colSpan={2} />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <button type="button" className="btn-secondary btn btn-sm mt-2" disabled={disabled} onClick={() => setDs(di, { rows: [...ds.rows, emptyRow(columns)] })}>+ Thêm dòng</button>
          <p className="mt-1 text-xs text-slate-700">Ô trống không được tính. Số 0 là một giá trị đo thật. Giá trị trung bình chỉ tính trên các ô có số.</p>
        </fieldset>
      ))}
      {!fixedLabels && datasets.length < 6 && !disabled && (
        <button type="button" className="btn-secondary btn" onClick={() => set({ datasets: [...datasets, { id: uid('d'), label: `Phương án ${String.fromCharCode(65 + datasets.length)}`, conditions: datasets[0]?.conditions.map((c) => ({ k: c.k, v: '' })) ?? [], rows: [emptyRow(columns)] }] })}>+ Thêm lượt đo / phương án</button>
      )}

      <div className="rounded-lg border border-slate-300 p-3">
        <h4 className="mb-2 text-sm font-bold">Đồ thị</h4>
        {nums.length < 2 ? <p className="hint">Cần ít nhất hai cột kiểu số để vẽ đồ thị.</p> : (
          <>
            <div className="mb-3 grid gap-3 sm:grid-cols-2">
              <div><label className="label" htmlFor="ch-x">Trục ngang (x)</label>
                <select id="ch-x" className="input" disabled={disabled} value={chart?.x ?? ''} onChange={(e) => set({ chart: { x: e.target.value, y: chart?.y ?? '' } })}>{nums.map((c) => <option key={c.id} value={c.id}>{colLabel(c)}</option>)}</select></div>
              <div><label className="label" htmlFor="ch-y">Trục dọc (y)</label>
                <select id="ch-y" className="input" disabled={disabled} value={chart?.y ?? ''} onChange={(e) => set({ chart: { x: chart?.x ?? '', y: e.target.value } })}>{nums.map((c) => <option key={c.id} value={c.id}>{colLabel(c)}</option>)}</select></div>
            </div>
            {xCol && yCol && (xCol.id === yCol.id
              ? <p className="text-sm text-amber-900">Hãy chọn hai đại lượng khác nhau cho hai trục.</p>
              : <LineChart series={buildSeries(datasets, xCol, yCol)} xLabel={colLabel(xCol)} yLabel={colLabel(yCol)} />)}
          </>
        )}
      </div>
    </div>
  );
}
