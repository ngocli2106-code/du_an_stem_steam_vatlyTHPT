'use client';

export class ApiError extends Error {
  constructor(public status: number, message: string, public data?: any) { super(message); }
}

/** Gọi API JSON. Lỗi mạng được chuyển thành ApiError(0) để giao diện giữ nội dung và cho thử lại. */
export async function api<T = any>(url: string, method: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method, credentials: 'same-origin',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Mất kết nối mạng. Nội dung của bạn vẫn còn trên màn hình, hãy thử lại khi có mạng.');
  }
  let data: any = null;
  try { data = await res.json(); } catch { /* không có thân JSON */ }
  if (!res.ok) throw new ApiError(res.status, data?.error ?? `Lỗi ${res.status}`, data);
  return data as T;
}
