import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser, type SessionUser } from '@/lib/auth';
import { LogoutButton } from './LogoutButton';

export async function requirePageUser(role?: 'TEACHER' | 'STUDENT'): Promise<SessionUser> {
  const u = await getUser();
  if (!u) redirect('/login');
  if (role && u.role !== role) redirect(u.role === 'TEACHER' ? '/teacher' : '/student');
  return u;
}

export function Shell({ user, children, wide = false }: { user: SessionUser; children: React.ReactNode; wide?: boolean }) {
  const t = user.role === 'TEACHER';
  const links = t
    ? [{ href: '/teacher', label: 'Tiến độ' }, { href: '/teacher/classes', label: 'Lớp & nhóm' }, { href: '/teacher/projects', label: 'Dự án' }, { href: '/teacher/templates', label: 'Mẫu dự án' }]
    : [{ href: '/student', label: 'Việc của nhóm' }];
  return (
    <div className="min-h-screen">
      <header className="no-print border-b border-slate-300 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2">
          <Link href={t ? '/teacher' : '/student'} className="text-base font-bold text-brand-800">Xưởng STEM &amp; STEAM THPT</Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-slate-700 sm:inline">{user.displayName} · {t ? 'Giáo viên' : 'Học sinh'}</span>
            <LogoutButton />
          </div>
        </div>
        <nav aria-label="Điều hướng chính" className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-3 pb-2">
          {links.map((l) => <Link key={l.href} href={l.href} className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100">{l.label}</Link>)}
        </nav>
      </header>
      <main id="main" className={`mx-auto px-4 py-5 ${wide ? 'max-w-7xl' : 'max-w-5xl'}`}>{children}</main>
    </div>
  );
}
