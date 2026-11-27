import { randomInt } from 'node:crypto';

export function slugVi(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '');
}

const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
export function randomPassword(len = 8): string {
  let s = '';
  for (let i = 0; i < len; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return s;
}

export interface ParsedStudent { code: string | null; name: string }

/** Mỗi dòng: "Tên", "Mã", hoặc "Mã | Tên" (cũng chấp nhận ; hoặc tab). */
export function parseStudentLines(text: string): ParsedStudent[] {
  const out: ParsedStudent[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const parts = line.split(/\s*[|;\t]\s*/).filter(Boolean);
    if (parts.length >= 2) out.push({ code: parts[0].toUpperCase(), name: parts.slice(1).join(' ') });
    else if (/^[A-Za-z]*\d[A-Za-z0-9._-]*$/.test(parts[0]) && !/\s/.test(parts[0])) out.push({ code: parts[0].toUpperCase(), name: parts[0].toUpperCase() });
    else out.push({ code: null, name: parts[0] });
  }
  return out;
}
