import type { GradeDraft, PublishedResult, Rubric } from './rubric';
import { computeResult, criterionScore, round2 } from './rubric';

export type CsvFormat = 'vn' | 'std';
/** vn: dấu ; và thập phân dấu phẩy (Excel cài đặt vùng Việt Nam). std: dấu , và thập phân dấu chấm. */
export const CSV_FORMATS: Record<CsvFormat, { sep: string; dec: string }> = { vn: { sep: ';', dec: ',' }, std: { sep: ',', dec: '.' } };

export type Cell = string | number | null;

/** Chống chèn công thức (CSV injection) cho ô văn bản và đặt ngoặc kép khi cần. */
export function csvCell(v: Cell, f: CsvFormat): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return Number.isFinite(v) ? String(round2(v)).replace('.', CSV_FORMATS[f].dec) : '';
  let s = v;
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (s.includes(CSV_FORMATS[f].sep) || /["\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(rows: Cell[][], f: CsvFormat): string {
  // BOM để Excel nhận đúng tiếng Việt UTF-8; CRLF theo RFC 4180.
  return '﻿' + rows.map((r) => r.map((c) => csvCell(c, f)).join(CSV_FORMATS[f].sep)).join('\r\n') + '\r\n';
}

export interface ExportGroup {
  className: string; groupName: string;
  members: { code: string | null; name: string; username: string; roleLabel: string }[];
  stagesAssigned: number; stagesApproved: number;
  published: PublishedResult | null; draft: GradeDraft | null;
}

/** Một dòng cho mỗi học sinh; điểm là điểm sản phẩm của nhóm. */
export function buildScoreRows(rubric: Rubric, groups: ExportGroup[], includeDraft: boolean): Cell[][] {
  const header: Cell[] = ['Lớp', 'Nhóm', 'Mã học sinh', 'Họ và tên', 'Tên đăng nhập', 'Vai trò', 'Chặng đã duyệt',
    ...rubric.criteria.map((c) => `${c.name} (/${c.weight})`), 'Tổng (/100)', 'Trạng thái điểm', 'Ngày công bố', 'Nhận xét chung'];
  const rows: Cell[][] = [header];
  for (const g of groups) {
    let scores: (number | null)[] = rubric.criteria.map(() => null);
    let total: number | null = null;
    let state: string;
    let comment = '';
    if (includeDraft && g.draft) {
      scores = rubric.criteria.map((c) => { const l = g.draft!.scores[c.id]?.level; return l === null || l === undefined ? null : criterionScore(c.weight, l); });
      const complete = scores.every((s) => s !== null);
      total = complete ? computeResult(rubric, g.draft).total : null;
      state = !complete ? 'Nháp, chưa chấm đủ' : g.published ? 'Nháp (đã có bản công bố)' : 'Nháp';
      comment = g.draft.overallComment ?? '';
    } else if (g.published) {
      scores = rubric.criteria.map((c) => g.published!.rows.find((r) => r.id === c.id)?.score ?? null);
      total = g.published.total; comment = g.published.overallComment; state = 'Đã công bố';
    } else state = includeDraft ? 'Chưa chấm' : 'Chưa công bố';
    const date = g.published ? toVnDate(g.published.publishedAt) : null;
    const members = g.members.length ? g.members : [{ code: null, name: '(nhóm chưa có thành viên)', username: '', roleLabel: '' }];
    for (const m of members) {
      rows.push([g.className, g.groupName, m.code, m.name, m.username, m.roleLabel, `${g.stagesApproved}/${g.stagesAssigned}`, ...scores, total, state, date, comment]);
    }
  }
  return rows;
}

function toVnDate(iso: string): string {
  const v = new Date(new Date(iso).getTime() + 7 * 3600_000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(v.getUTCDate())}/${p(v.getUTCMonth() + 1)}/${v.getUTCFullYear()}`;
}
