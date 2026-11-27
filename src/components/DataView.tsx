import { colLabel, columnMean, conditionDiffs, buildSeries, type Column, type Dataset } from '@/lib/dataset';
import { formatNumberVi, parseNumberVi } from '@/lib/numbers';
import { LineChart } from './Chart';

export function DatasetTable({ columns, ds, showMean = true }: { columns: Column[]; ds: Dataset; showMean?: boolean }) {
  return (
    <div className="avoid-break">
      <h4 className="mb-1 text-sm font-bold">{ds.label || 'Lượt đo'}</h4>
      {ds.conditions.filter((c) => c.k.trim() || c.v.trim()).length > 0 && (
        <p className="mb-1 text-sm text-slate-800"><span className="font-semibold">Điều kiện đo: </span>{ds.conditions.filter((c) => c.k.trim()).map((c) => `${c.k.trim()}: ${c.v.trim() || '—'}`).join('; ')}</p>
      )}
      <div className="overflow-x-auto">
        <table className="data-table w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-400 px-2 py-1 text-left">#</th>
              {columns.map((c) => <th key={c.id} className="border border-slate-400 px-2 py-1 text-left">{colLabel(c)}</th>)}
              <th className="border border-slate-400 px-2 py-1 text-left">Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {ds.rows.length === 0 && <tr><td colSpan={columns.length + 2} className="border border-slate-400 px-2 py-2 text-slate-700">Chưa có dòng dữ liệu.</td></tr>}
            {ds.rows.map((r, i) => (
              <tr key={r.id}>
                <td className="border border-slate-400 px-2 py-1">{i + 1}</td>
                {columns.map((c) => {
                  const raw = r.cells[c.id] ?? '';
                  const p = c.type === 'number' ? parseNumberVi(raw) : null;
                  return (
                    <td key={c.id} className={`border border-slate-400 px-2 py-1 ${p && !p.ok ? 'bg-rose-50 text-rose-800' : ''}`}>
                      {raw.trim() === '' ? <span className="text-slate-500">(trống)</span> : p && p.ok && p.value !== null ? formatNumberVi(p.value) : raw}
                      {p && !p.ok && <span className="ml-1 text-xs">(không hợp lệ)</span>}
                    </td>
                  );
                })}
                <td className="border border-slate-400 px-2 py-1">{r.note}</td>
              </tr>
            ))}
            {showMean && columns.some((c) => c.type === 'number' && columnMean(ds, c)) && (
              <tr className="bg-slate-50 font-semibold">
                <td className="border border-slate-400 px-2 py-1">TB</td>
                {columns.map((c) => {
                  const m = c.type === 'number' ? columnMean(ds, c) : null;
                  return <td key={c.id} className="border border-slate-400 px-2 py-1">{m ? `${formatNumberVi(m.mean)} (n=${m.n})` : ''}</td>;
                })}
                <td className="border border-slate-400 px-2 py-1" />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function DataBlock({ value, withConditions = true }: { value: any; withConditions?: boolean }) {
  const columns: Column[] = value?.columns ?? [];
  const datasets: Dataset[] = value?.datasets ?? [];
  if (!columns.length || !datasets.length) return <p className="hint">Chưa có dữ liệu.</p>;
  const chart = value?.chart;
  const x = columns.find((c) => c.id === chart?.x);
  const y = columns.find((c) => c.id === chart?.y);
  return (
    <div className="space-y-4">
      {datasets.map((d) => <DatasetTable key={d.id} columns={columns} ds={d} />)}
      {x && y && <LineChart series={buildSeries(datasets, x, y)} xLabel={colLabel(x)} yLabel={colLabel(y)} />}
      {withConditions && datasets.length === 2 && <ConditionsCompare a={datasets[0]} b={datasets[1]} />}
    </div>
  );
}

export function ConditionsCompare({ a, b }: { a: Dataset; b: Dataset }) {
  const rows = conditionDiffs(a, b);
  if (rows.length === 0) return null;
  const diff = rows.filter((r) => r.differs);
  return (
    <div className="avoid-break">
      <h4 className="mb-1 text-sm font-bold">Điều kiện đo của hai lượt</h4>
      <table className="data-table w-full border-collapse text-sm">
        <thead><tr className="bg-slate-100">
          <th className="border border-slate-400 px-2 py-1 text-left">Điều kiện</th>
          <th className="border border-slate-400 px-2 py-1 text-left">{a.label}</th>
          <th className="border border-slate-400 px-2 py-1 text-left">{b.label}</th>
          <th className="border border-slate-400 px-2 py-1 text-left">So sánh</th>
        </tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className={r.differs ? 'bg-amber-50' : ''}>
              <td className="border border-slate-400 px-2 py-1">{r.key}</td>
              <td className="border border-slate-400 px-2 py-1">{r.a || '—'}</td>
              <td className="border border-slate-400 px-2 py-1">{r.b || '—'}</td>
              <td className="border border-slate-400 px-2 py-1 font-semibold">{r.differs ? '⚠ Khác nhau' : '✓ Giống nhau'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {diff.length > 0 && <p className="mt-1 text-sm text-amber-900">Có {diff.length} điều kiện khác nhau. Hãy cân nhắc điều này khi kết luận hai lượt có so sánh trực tiếp được hay không.</p>}
    </div>
  );
}

export function CompareSummary({ value }: { value: any }) {
  const columns: Column[] = value?.columns ?? [];
  const datasets: Dataset[] = value?.datasets ?? [];
  if (datasets.length < 2) return null;
  const [a, b] = datasets;
  const nums = columns.filter((c) => c.type === 'number');
  return (
    <div className="space-y-3">
      <div className="avoid-break">
        <h4 className="mb-1 text-sm font-bold">Giá trị trung bình theo từng đại lượng</h4>
        <table className="data-table w-full border-collapse text-sm">
          <thead><tr className="bg-slate-100">
            <th className="border border-slate-400 px-2 py-1 text-left">Đại lượng</th>
            <th className="border border-slate-400 px-2 py-1 text-left">{a.label}</th>
            <th className="border border-slate-400 px-2 py-1 text-left">{b.label}</th>
            <th className="border border-slate-400 px-2 py-1 text-left">Chênh lệch (2 − 1)</th>
          </tr></thead>
          <tbody>
            {nums.map((c) => {
              const ma = columnMean(a, c), mb = columnMean(b, c);
              return (
                <tr key={c.id}>
                  <td className="border border-slate-400 px-2 py-1">{colLabel(c)}</td>
                  <td className="border border-slate-400 px-2 py-1">{ma ? `${formatNumberVi(ma.mean)} (n=${ma.n})` : 'chưa có'}</td>
                  <td className="border border-slate-400 px-2 py-1">{mb ? `${formatNumberVi(mb.mean)} (n=${mb.n})` : 'chưa có'}</td>
                  <td className="border border-slate-400 px-2 py-1">{ma && mb ? formatNumberVi(mb.mean - ma.mean) : '—'}</td>
                </tr>
              );
            })}
            {nums.length === 0 && <tr><td colSpan={4} className="border border-slate-400 px-2 py-1">Chưa có cột số để so sánh.</td></tr>}
          </tbody>
        </table>
      </div>
      <ConditionsCompare a={a} b={b} />
    </div>
  );
}
