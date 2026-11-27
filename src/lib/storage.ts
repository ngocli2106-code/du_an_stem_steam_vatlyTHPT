import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { HttpError } from './auth';

/**
 * Giới hạn 4 MB: hàm Vercel nhận thân yêu cầu tối đa 4,5 MB (gồm cả phần bao multipart).
 * Ảnh lớn hơn được nén ngay trên trình duyệt trước khi gửi.
 */
export const MAX_UPLOAD = 4 * 1024 * 1024;

export type StorageDriver = 'local' | 'vercel-blob';

/** local: thư mục UPLOAD_DIR trên ổ đĩa. vercel-blob: kho Vercel Blob riêng tư (mặc định khi chạy trên Vercel). */
export function storageDriver(): StorageDriver {
  const d = process.env.STORAGE_DRIVER;
  if (d === 'local' || d === 'vercel-blob') return d;
  return process.env.VERCEL ? 'vercel-blob' : 'local';
}

export function uploadDir() {
  return path.resolve(process.cwd(), process.env.UPLOAD_DIR || './data/uploads');
}

const blobPath = (storedName: string) => `evidence/${storedName}`;
const NAME_RE = /^[0-9a-f-]{36}\.(png|jpg|webp|pdf)$/;

/** Nhận diện loại tệp bằng chữ kí đầu tệp, không tin vào phần mở rộng hay Content-Type do người dùng gửi. */
export function sniffMime(buf: Buffer): { mime: string; ext: string } | null {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: 'image/png', ext: 'png' };
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' };
  if (buf.length >= 12 && buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return { mime: 'image/webp', ext: 'webp' };
  if (buf.length >= 5 && buf.subarray(0, 5).toString('ascii') === '%PDF-') return { mime: 'application/pdf', ext: 'pdf' };
  return null;
}

export async function saveUpload(buf: Buffer, kind: { mime: string; ext: string }): Promise<string> {
  if (buf.length > MAX_UPLOAD) throw new HttpError(413, 'Tệp quá lớn (tối đa 4 MB).');
  const name = `${randomUUID()}.${kind.ext}`;
  if (storageDriver() === 'vercel-blob') {
    const { put } = await import('@vercel/blob');
    try {
      await put(blobPath(name), buf, { access: 'private', contentType: kind.mime, addRandomSuffix: false });
    } catch (e) {
      console.error('Vercel Blob put lỗi', e);
      throw new HttpError(503, 'Kho lưu tệp tạm thời không phản hồi. Hãy thử tải lại tệp sau ít phút.');
    }
    return name;
  }
  const dir = uploadDir();
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), buf);
  return name;
}

/** Đọc tệp đã lưu. Chỉ gọi SAU khi đã kiểm tra quyền truy cập hồ sơ nhóm. */
export async function readUpload(storedName: string): Promise<ReadableStream<Uint8Array> | Uint8Array> {
  if (!NAME_RE.test(storedName)) throw new HttpError(404, 'Không tìm thấy tệp.');
  if (storageDriver() === 'vercel-blob') {
    const { get } = await import('@vercel/blob');
    const r = await get(blobPath(storedName), { access: 'private' }).catch((e) => { console.error('Vercel Blob get lỗi', e); return null; });
    if (!r || r.statusCode !== 200 || !r.stream) throw new HttpError(404, 'Không tìm thấy tệp.');
    return r.stream;
  }
  try { return new Uint8Array(await readFile(path.join(uploadDir(), storedName))); }
  catch { throw new HttpError(404, 'Không tìm thấy tệp.'); }
}

export function safeFileName(name: string): string {
  const base = name.replace(/[\\/\u0000-\u001f]/g, '_').trim().slice(0, 120);
  return base || 'minh-chung';
}
