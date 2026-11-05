import { useState } from 'react';
import { Eye, EyeOff, Check, Circle } from 'lucide-react';
import { TextField } from './ui.jsx';

/** Password input with a clearly-labelled "Show password" button. */
export function PasswordField({ label = 'Password', ...props }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <TextField label={label} type={visible ? 'text' : 'password'} className="pr-36" {...props} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-2 flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-base font-bold text-brand hover:bg-brand-soft cursor-pointer"
        style={{ top: props.hint ? '5.2rem' : '2.65rem' }}
        aria-pressed={visible}
      >
        {visible ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
        {visible ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}

export const PASSWORD_RULES = [
  { test: (p) => p.length >= 8, label: 'At least 8 characters' },
  { test: (p) => /[A-Za-z]/.test(p), label: 'At least one letter' },
  { test: (p) => /[0-9]/.test(p), label: 'At least one number' },
];

export function PasswordRules({ password }) {
  return (
    <ul className="space-y-1" aria-label="Password requirements">
      {PASSWORD_RULES.map((r) => {
        const ok = r.test(password);
        return (
          <li key={r.label} className={`flex items-center gap-2 text-base ${ok ? 'font-bold text-ok' : 'text-muted'}`}>
            {ok ? <Check className="size-5" aria-hidden /> : <Circle className="size-5" aria-hidden />}
            {r.label}
            <span className="sr-only">{ok ? '(done)' : '(not yet)'}</span>
          </li>
        );
      })}
    </ul>
  );
}
