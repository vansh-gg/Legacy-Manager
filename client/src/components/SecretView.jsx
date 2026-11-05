import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

function CopyButton({ value }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* clipboard blocked — the value is still visible */
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="flex min-h-11 items-center gap-1.5 rounded-lg border-2 border-line px-3 text-base font-bold hover:border-brand cursor-pointer"
    >
      {copied ? <Check className="size-5 text-ok" aria-hidden /> : <Copy className="size-5" aria-hidden />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

/** Shows decrypted private details in large, copyable rows. */
export function SecretView({ secret }) {
  if (!secret || !Object.values(secret).some(Boolean)) {
    return <p className="text-lg text-muted">No private details were saved for this item.</p>;
  }
  const rows = [
    ['Username / ID', secret.username],
    ['Password / PIN', secret.password],
    ['Private notes', secret.notes],
  ].filter(([, v]) => v);
  return (
    <dl className="space-y-4">
      {rows.map(([label, value]) => (
        <div key={label} className="rounded-xl bg-paper p-4">
          <dt className="text-base font-bold text-muted">{label}</dt>
          <dd className="mt-1 flex flex-wrap items-center justify-between gap-3">
            <span className="whitespace-pre-wrap break-all font-mono text-xl">{value}</span>
            {label !== 'Private notes' && <CopyButton value={value} />}
          </dd>
        </div>
      ))}
    </dl>
  );
}
