/**
 * Shared UI building blocks. Every control has a visible text label,
 * a minimum 48–56px touch target and high-contrast colours.
 */
import { useId } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Info, Loader2, XCircle } from 'lucide-react';

const cx = (...c) => c.filter(Boolean).join(' ');

const BUTTON_VARIANTS = {
  primary: 'bg-brand text-white hover:bg-brand-dark border-brand',
  secondary: 'bg-white text-brand border-brand hover:bg-brand-soft',
  danger: 'bg-danger text-white border-danger hover:bg-[#7f130c]',
  quiet: 'bg-transparent text-ink border-transparent hover:bg-black/5 underline underline-offset-4',
  success: 'bg-ok text-white border-ok hover:bg-[#0f3f22]',
};

export function Button({ variant = 'primary', size = 'md', icon: Icon, to, href, className, children, loading, ...props }) {
  const classes = cx(
    'inline-flex items-center justify-center gap-2.5 rounded-xl border-2 font-bold transition-colors cursor-pointer',
    'disabled:opacity-60 disabled:cursor-not-allowed text-center',
    size === 'lg' ? 'min-h-16 px-7 text-xl' : size === 'sm' ? 'min-h-11 px-4 text-base' : 'min-h-14 px-5 text-lg',
    BUTTON_VARIANTS[variant],
    className,
  );
  const content = (
    <>
      {loading ? <Loader2 className="size-6 animate-spin" aria-hidden /> : Icon && <Icon className="size-6 shrink-0" aria-hidden />}
      <span>{children}</span>
    </>
  );
  if (to) return <Link to={to} className={cx(classes, 'no-underline')} {...props}>{content}</Link>;
  if (href) return <a href={href} className={cx(classes, 'no-underline')} {...props}>{content}</a>;
  return (
    <button type="button" className={classes} disabled={loading || props.disabled} {...props}>
      {content}
    </button>
  );
}

export function Card({ className, children, as: Tag = 'section', ...props }) {
  return (
    <Tag className={cx('rounded-2xl border border-line bg-white p-5 sm:p-7 shadow-sm', className)} {...props}>
      {children}
    </Tag>
  );
}

export function PageHeader({ title, intro, action, back }) {
  return (
    <header className="mb-7">
      {back && (
        <Link to={back.to} className="mb-3 inline-flex items-center gap-2 text-lg font-bold">
          ← {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl">
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight">{title}</h1>
          {intro && <p className="mt-2 text-lg text-muted">{intro}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  );
}

const ALERT_TONES = {
  info: { cls: 'bg-brand-soft border-brand/40 text-brand-dark', icon: Info },
  ok: { cls: 'bg-ok-soft border-ok/40 text-ok', icon: CheckCircle2 },
  warn: { cls: 'bg-warn-soft border-warn/40 text-warn', icon: AlertTriangle },
  danger: { cls: 'bg-danger-soft border-danger/40 text-danger', icon: XCircle },
};

export function Alert({ tone = 'info', title, children, className, role }) {
  const { cls, icon: Icon } = ALERT_TONES[tone];
  return (
    <div className={cx('flex gap-3 rounded-xl border-2 p-4 text-lg', cls, className)} role={role || (tone === 'danger' ? 'alert' : 'status')}>
      <Icon className="mt-0.5 size-6 shrink-0" aria-hidden />
      <div>
        {title && <p className="font-bold">{title}</p>}
        {children && <div className="text-ink">{children}</div>}
      </div>
    </div>
  );
}

export function Badge({ tone = 'info', children }) {
  const tones = {
    info: 'bg-brand-soft text-brand-dark',
    ok: 'bg-ok-soft text-ok',
    warn: 'bg-warn-soft text-warn',
    danger: 'bg-danger-soft text-danger',
    neutral: 'bg-black/5 text-ink',
  };
  return <span className={cx('inline-block rounded-full px-3 py-1 text-base font-bold', tones[tone])}>{children}</span>;
}

function FieldShell({ id, label, hint, error, optional, children }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-lg font-bold">
        {label} {optional && <span className="font-normal text-muted">(optional)</span>}
      </label>
      {hint && <p id={`${id}-hint`} className="text-base text-muted">{hint}</p>}
      {children}
      {error && (
        <p id={`${id}-error`} className="flex items-center gap-2 text-base font-bold text-danger" role="alert">
          <XCircle className="size-5" aria-hidden /> {error}
        </p>
      )}
    </div>
  );
}

const inputClass = (error) =>
  cx(
    'w-full rounded-xl border-2 bg-white px-4 py-3 text-lg text-ink placeholder:text-[#6b7584]',
    error ? 'border-danger' : 'border-[#8b95a5] focus:border-brand',
  );

const describedBy = (id, hint, error) => [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;

export function TextField({ label, hint, error, optional, multiline, rows = 4, className, ...props }) {
  const id = useId();
  const Tag = multiline ? 'textarea' : 'input';
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} optional={optional}>
      <Tag
        id={id}
        className={cx(inputClass(error), multiline ? 'min-h-32' : 'min-h-14', className)}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy(id, hint, error)}
        rows={multiline ? rows : undefined}
        {...props}
      />
    </FieldShell>
  );
}

export function SelectField({ label, hint, error, optional, options, ...props }) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} optional={optional}>
      <select
        id={id}
        className={cx(inputClass(error), 'min-h-14 cursor-pointer')}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy(id, hint, error)}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </FieldShell>
  );
}

/** Large tick-box rows, e.g. for choosing nominees. */
export function CheckboxList({ legend, hint, options, value, onChange, emptyText }) {
  const toggle = (v) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <fieldset className="space-y-3">
      <legend className="text-lg font-bold">{legend}</legend>
      {hint && <p className="text-base text-muted">{hint}</p>}
      {options.length === 0 && <p className="text-lg text-muted">{emptyText}</p>}
      {options.map((o) => (
        <label
          key={o.value}
          className={cx(
            'flex min-h-14 cursor-pointer items-center gap-4 rounded-xl border-2 px-4 py-3 text-lg',
            value.includes(o.value) ? 'border-brand bg-brand-soft' : 'border-line bg-white hover:border-brand',
          )}
        >
          <input type="checkbox" className="size-7 accent-[#1e40af]" checked={value.includes(o.value)} onChange={() => toggle(o.value)} />
          <span>
            <span className="font-bold">{o.label}</span>
            {o.description && <span className="block text-base text-muted">{o.description}</span>}
          </span>
        </label>
      ))}
    </fieldset>
  );
}

export function Loading({ label = 'Loading…' }) {
  return (
    <div className="flex items-center gap-3 py-10 text-lg text-muted" role="status">
      <Loader2 className="size-7 animate-spin" aria-hidden /> {label}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <Alert tone="danger" title="Sorry, something went wrong">
      <p>{error?.message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
          Try again
        </Button>
      )}
    </Alert>
  );
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <Card className="text-center py-12">
      {Icon && <Icon className="mx-auto mb-4 size-14 text-brand" aria-hidden />}
      <h2 className="text-2xl font-bold">{title}</h2>
      {children && <p className="mx-auto mt-2 max-w-xl text-lg text-muted">{children}</p>}
      {action && <div className="mt-6">{action}</div>}
    </Card>
  );
}
