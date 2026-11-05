import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

export function Logo({ to = '/' }) {
  return (
    <Link to={to} className="flex items-center gap-3 text-ink no-underline">
      <span className="flex size-12 items-center justify-center rounded-xl bg-brand text-white">
        <ShieldCheck className="size-7" aria-hidden />
      </span>
      <span className="text-xl font-bold leading-tight">
        Digital Legacy
        <span className="block text-base font-normal text-muted">Manager</span>
      </span>
    </Link>
  );
}
