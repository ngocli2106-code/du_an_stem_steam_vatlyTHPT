'use client';

export const CLIENT_MAX_UPLOAD = 4 * 1024 * 1024;
const MAX_SIDE = 2000;

/**
 * Thu nhỏ ảnh chụp điện thoại (thường 3–8 MB) để vừa giới hạn tải lên.
 * Giữ nguyên tệp nếu đã nhỏ; PDF không bị đổi. Ảnh có nền trong suốt được phủ nền trắng.
 */
export async function shrinkImage(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  if (file.size <= 1.5 * 1024 * 1024) return file;
  let bmp: ImageBitmap;
  try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { return file; }
  const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  for (const q of [0.85, 0.75, 0.6]) {
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', q));
    if (blob && blob.size <= CLIENT_MAX_UPLOAD) {
      return new File([blob], file.name.replace(/\.(png|webp|jpe?g)$/i, '') + '.jpg', { type: 'image/jpeg' });
    }
  }
  return file;
}
