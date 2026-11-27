import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { HttpError } from './auth';

export const MAX_UPLOAD = 5 * 1024 * 1024;

export function uploadDir() {
  return path.resolve(process.cwd(), process.env.UPLOAD_DIR || './data/uploads');
}

/** Nhận diện loại tệp bằng chữ kí đầu tệp, không tin vào phần mở rộng hay Content-Type do người dùng gửi. */
export function sniffMime(buf: Buffer): { mime: string; ext: string } | null {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: 'image/png', ext: 'png' };
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' };
  if (buf.length >= 12 && buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return { mime: 'image/webp', ext: 'webp' };
  if (buf.length >= 5 && buf.subarray(0, 5).toString('ascii') === '%PDF-') return { mime: 'application/pdf', ext: 'pdf' };
  return null;
}

export async function saveUpload(buf: Buffer, ext: string): Promise<string> {
  if (buf.length > MAX_UPLOAD) throw new HttpError(413, 'Tệp quá lớn (tối đa 5 MB).');
  const dir = uploadDir();
  await mkdir(dir, { recursive: true });
  const name = `${randomUUID()}.${ext}`;
  await writeFile(path.join(dir, name), buf);
  return name;
}

export async function readUpload(storedName: string): Promise<Buffer> {
  if (!/^[0-9a-f-]{36}\.(png|jpg|webp|pdf)$/.test(storedName)) throw new HttpError(404, 'Không tìm thấy tệp.');
  return readFile(path.join(uploadDir(), storedName));
}

export function safeFileName(name: string): string {
  const base = name.replace(/[\\/\u0000-\u001f]/g, '_').trim().slice(0, 120);
  return base || 'minh-chung';
}
