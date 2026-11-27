import type { StageStatus } from './types';

export const REVISE_STATES: StageStatus[] = ['NOT_STARTED', 'IN_PROGRESS', 'NEEDS_REVISION'];

/** Hạn nộp cuối ngày theo giờ Việt Nam. */
export function endOfDayVN(dateStr: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) throw new Error('Ngày không hợp lệ');
  const d = new Date(`${dateStr}T23:59:59+07:00`);
  if (Number.isNaN(d.getTime())) throw new Error('Ngày không hợp lệ');
  return d;
}

export function toDateInput(d: Date): string {
  const v = new Date(d.getTime() + 7 * 3600_000);
  return v.toISOString().slice(0, 10);
}

export function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return '—';
  const v = new Date(new Date(d).getTime() + 7 * 3600_000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(v.getUTCDate())}/${p(v.getUTCMonth() + 1)}/${v.getUTCFullYear()}`;
}

export function fmtDateTime(d: Date | string): string {
  const v = new Date(new Date(d).getTime() + 7 * 3600_000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(v.getUTCHours())}:${p(v.getUTCMinutes())} ${p(v.getUTCDate())}/${p(v.getUTCMonth() + 1)}/${v.getUTCFullYear()}`;
}

export function isOverdue(status: StageStatus, due: Date | null, now = new Date()): boolean {
  return !!due && due.getTime() < now.getTime() && REVISE_STATES.includes(status);
}

export interface StageRow { stageKey: number; status: StageStatus; due: Date | null }

export interface GroupSummary {
  assigned: number;
  done: number; // đã nộp hoặc đã duyệt
  approved: number;
  waiting: number; // chờ giáo viên phản hồi
  needsRevision: number;
  overdue: number;
  notSubmitted: number; // chưa nộp (chưa bắt đầu / đang làm)
  percentSubmitted: number;
  priority: number;
}

/** Chỉ tính trên các chặng được giao (rows chỉ chứa chặng được giao). */
export function summarize(rows: StageRow[], now = new Date()): GroupSummary {
  const assigned = rows.length;
  const c = (f: (r: StageRow) => boolean) => rows.filter(f).length;
  const approved = c((r) => r.status === 'APPROVED');
  const waiting = c((r) => r.status === 'SUBMITTED');
  const needsRevision = c((r) => r.status === 'NEEDS_REVISION');
  const overdue = c((r) => isOverdue(r.status, r.due, now));
  const notSubmitted = c((r) => r.status === 'NOT_STARTED' || r.status === 'IN_PROGRESS');
  const done = approved + waiting;
  return {
    assigned, done, approved, waiting, needsRevision, overdue, notSubmitted,
    percentSubmitted: assigned ? Math.round((done / assigned) * 100) : 0,
    priority: waiting * 1000 + needsRevision * 100 + overdue * 10 + notSubmitted,
  };
}
