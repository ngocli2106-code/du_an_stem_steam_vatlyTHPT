import { mean, parseNumberVi } from './numbers';

export interface Column { id: string; name: string; unit: string; type: 'number' | 'text' }
export interface Row { id: string; cells: Record<string, string>; note: string }
export interface Dataset {
  id: string;
  label: string;
  conditions: { k: string; v: string }[];
  rows: Row[];
}
export interface CellError { dsId: string; rowId: string; colId: string; message: string }

export function uid(prefix = 'x'): string {
  return `${prefix}${Math.random().toString(36).slice(2, 9)}`;
}

export function colLabel(c: Column): string {
  return c.unit.trim() ? `${c.name.trim() || '(chưa đặt tên)'} (${c.unit.trim()})` : c.name.trim() || '(chưa đặt tên)';
}

export function validateDatasets(columns: Column[], datasets: Dataset[]): CellError[] {
  const errs: CellError[] = [];
  for (const ds of datasets) {
    for (const row of ds.rows) {
      for (const col of columns) {
        if (col.type !== 'number') continue;
        const r = parseNumberVi(row.cells[col.id]);
        if (!r.ok) errs.push({ dsId: ds.id, rowId: row.id, colId: col.id, message: r.error });
      }
    }
  }
  return errs;
}

/** Các giá trị số hợp lệ (bỏ ô trống, bỏ ô lỗi) của một cột. 0 vẫn được tính. */
export function numericValues(ds: Dataset, col: Column): number[] {
  const out: number[] = [];
  for (const row of ds.rows) {
    const r = parseNumberVi(row.cells[col.id]);
    if (r.ok && r.value !== null) out.push(r.value);
  }
  return out;
}

export function columnMean(ds: Dataset, col: Column): { mean: number; n: number } | null {
  const v = numericValues(ds, col);
  const m = mean(v);
  return m === null ? null : { mean: m, n: v.length };
}

export interface Series { label: string; points: { x: number; y: number }[] }

export function buildSeries(datasets: Dataset[], xCol: Column | undefined, yCol: Column | undefined): Series[] {
  if (!xCol || !yCol || xCol.type !== 'number' || yCol.type !== 'number') return [];
  return datasets.map((ds) => {
    const pts: { x: number; y: number }[] = [];
    for (const row of ds.rows) {
      const x = parseNumberVi(row.cells[xCol.id]);
      const y = parseNumberVi(row.cells[yCol.id]);
      if (x.ok && y.ok && x.value !== null && y.value !== null) pts.push({ x: x.value, y: y.value });
    }
    pts.sort((a, b) => a.x - b.x);
    return { label: ds.label, points: pts };
  });
}

export function hasAnyNumber(columns: Column[], datasets: Dataset[]): boolean {
  return datasets.some((ds) => columns.some((c) => c.type === 'number' && numericValues(ds, c).length > 0));
}

/** So sánh điều kiện đo của các lượt. Trả về các khoá khác nhau hoặc thiếu ở một bên. */
export function conditionDiffs(a: Dataset, b: Dataset): { key: string; a: string; b: string; differs: boolean }[] {
  const norm = (s: string) => s.trim().toLowerCase();
  const keys: string[] = [];
  for (const c of [...a.conditions, ...b.conditions]) {
    if (c.k.trim() && !keys.some((k) => norm(k) === norm(c.k))) keys.push(c.k.trim());
  }
  return keys.map((key) => {
    const av = a.conditions.find((c) => norm(c.k) === norm(key))?.v.trim() ?? '';
    const bv = b.conditions.find((c) => norm(c.k) === norm(key))?.v.trim() ?? '';
    return { key, a: av, b: bv, differs: norm(av) !== norm(bv) };
  });
}
