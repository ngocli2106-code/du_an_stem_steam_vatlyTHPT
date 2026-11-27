'use client';
import { useRouter } from 'next/navigation';

export function LogoutButton() {
  const r = useRouter();
  return (
    <button className="btn-secondary btn-sm btn" onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); r.push('/login'); r.refresh(); }}>
      Đăng xuất
    </button>
  );
}
