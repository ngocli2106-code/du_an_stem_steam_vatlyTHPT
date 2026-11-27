import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import { LoginForm } from './LoginForm';

export default async function LoginPage() {
  const u = await getUser();
  if (u) redirect(u.role === 'TEACHER' ? '/teacher' : '/student');
  return (
    <main id="main" className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-8">
      <h1 className="text-2xl font-bold text-brand-800">Xưởng STEM &amp; STEAM THPT</h1>
      <p className="mb-5 mt-1 text-slate-700">Hướng dẫn, theo dõi và đánh giá dự án Vật lí theo quy trình thiết kế kĩ thuật.</p>
      <LoginForm />
      <details className="card mt-4 text-sm">
        <summary className="cursor-pointer font-semibold">Tài khoản demo (bản chạy thử cục bộ)</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Giáo viên: <code>giaovien</code></li>
          <li>Học sinh Nhóm 1: <code>hs.an</code>, <code>hs.binh</code></li>
          <li>Học sinh Nhóm 2: <code>hs.chi</code>, <code>hs.dung</code></li>
        </ul>
        <p className="mt-2 text-slate-700">Mật khẩu chung là giá trị <code>DEMO_PASSWORD</code> trong tệp <code>.env</code> (xem README).</p>
      </details>
    </main>
  );
}
