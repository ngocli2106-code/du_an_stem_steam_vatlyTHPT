import Link from 'next/link';
import { STATUS_ICON, STATUS_LABEL, STATUS_STYLE, type StageStatus } from '@/lib/types';

export function StatusBadge({ status, overdue }: { status: StageStatus; overdue?: boolean }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span className={`badge ${STATUS_STYLE[status]}`}><span aria-hidden="true">{STATUS_ICON[status]}</span>{STATUS_LABEL[status]}</span>
      {overdue && <span className="badge border-red-700 bg-red-50 text-red-900"><span aria-hidden="true">!</span>Quá hạn</span>}
    </span>
  );
}

export function DemoBadge({ className = '' }: { className?: string }) {
  return <span className={`badge border-violet-500 bg-violet-50 text-violet-900 ${className}`}>Dữ liệu minh họa</span>;
}

export function PageHeader({ title, sub, actions }: { title: React.ReactNode; sub?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold leading-tight text-slate-900">{title}</h1>
        {sub && <div className="mt-1 text-sm text-slate-700">{sub}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-400 bg-white p-6 text-center">
      <p className="font-semibold text-slate-900">{title}</p>
      {children && <div className="mt-1 text-sm text-slate-700">{children}</div>}
    </div>
  );
}

export function Crumbs({ items }: { items: { href?: string; label: string }[] }) {
  return (
    <nav aria-label="Đường dẫn" className="no-print mb-3 text-sm text-slate-700">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-1">
            {i > 0 && <span aria-hidden="true">›</span>}
            {it.href ? <Link href={it.href} className="underline decoration-slate-400 hover:text-brand-700">{it.label}</Link> : <span aria-current="page" className="font-semibold">{it.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
