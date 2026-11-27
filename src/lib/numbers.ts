// Xử lí số theo thói quen nhập của người Việt (dấu phẩy thập phân) và phân biệt 0 với ô trống.

export type ParseResult =
  | { ok: true; value: number | null } // value === null: ô trống
  | { ok: false; error: string };

const RE = /^[+-]?(\d+([.,]\d+)?|[.,]\d+)$/;

export function parseNumberVi(raw: string | null | undefined): ParseResult {
  const s = (raw ?? '').trim();
  if (s === '') return { ok: true, value: null };
  if (/[.,].*[.,]/.test(s)) {
    return { ok: false, error: 'Chỉ dùng một dấu phẩy hoặc dấu chấm thập phân, không dùng dấu ngăn cách hàng nghìn.' };
  }
  if (!RE.test(s)) return { ok: false, error: 'Nhập một số (ví dụ 12,5). Đơn vị ghi ở tiêu đề cột.' };
  const v = Number(s.replace(',', '.'));
  if (!Number.isFinite(v)) return { ok: false, error: 'Giá trị không hợp lệ.' };
  return { ok: true, value: v };
}

export function formatNumberVi(n: number, maxFraction = 3): string {
  if (!Number.isFinite(n)) return '';
  const r = Number(n.toFixed(maxFraction));
  return String(r).replace('.', ',');
}

export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}
