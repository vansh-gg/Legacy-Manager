import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Button, TextField } from './ui.jsx';

/** Accessible modal built on the native <dialog> element (focus trap + Esc for free). */
export function Dialog({ open, onClose, title, children, wide }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className={`m-auto w-[calc(100%-2rem)] ${wide ? 'max-w-2xl' : 'max-w-lg'} rounded-2xl border-0 bg-white p-0 text-ink shadow-2xl`}
      aria-labelledby="dialog-title"
    >
      {open && (
        <div className="p-6 sm:p-8">
          <div className="mb-5 flex items-start justify-between gap-4">
            <h2 id="dialog-title" className="text-2xl font-bold leading-tight">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="flex min-h-11 items-center gap-1 rounded-lg px-3 text-base font-bold hover:bg-black/5 cursor-pointer"
            >
              <X className="size-5" aria-hidden /> Close
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

/** "Are you sure?" with plain-language consequences. */
export function ConfirmDialog({ open, onClose, onConfirm, title, children, confirmLabel = 'Yes, continue', danger }) {
  const [busy, setBusy] = useState(false);
  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <div className="text-lg">{children}</div>
      <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose}>No, go back</Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={confirm} loading={busy}>{confirmLabel}</Button>
      </div>
    </Dialog>
  );
}

/** Ask for the password again before showing something sensitive. */
export function PasswordDialog({ open, onClose, onSubmit, title = 'Please confirm it is you', description }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setPassword('');
      setError('');
    }
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onSubmit(password);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <form onSubmit={submit} className="space-y-5">
        <p className="text-lg text-muted">{description || 'For your safety, please type your password to see these private details.'}</p>
        <TextField
          label="Your password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={error}
          autoFocus
          required
        />
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={busy}>Show details</Button>
        </div>
      </form>
    </Dialog>
  );
}
