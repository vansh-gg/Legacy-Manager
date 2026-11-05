import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';

const ToastContext = createContext(null);

/** Large, slow-fading notifications announced to screen readers. */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const show = useCallback(
    (message, tone = 'ok') => {
      const id = crypto.randomUUID();
      setToasts((t) => [...t, { id, message, tone }]);
      setTimeout(() => dismiss(id), 7000);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-3 px-4" aria-live="polite" role="status">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex w-full max-w-xl items-center gap-3 rounded-2xl border-2 px-5 py-4 text-lg font-bold shadow-xl ${
              t.tone === 'ok' ? 'border-ok bg-ok-soft text-ok' : 'border-danger bg-danger-soft text-danger'
            }`}
          >
            {t.tone === 'ok' ? <CheckCircle2 className="size-7 shrink-0" aria-hidden /> : <XCircle className="size-7 shrink-0" aria-hidden />}
            <span className="flex-1 text-ink">{t.message}</span>
            <button type="button" onClick={() => dismiss(t.id)} className="flex min-h-11 items-center gap-1 rounded-lg px-2 text-base hover:bg-black/5 cursor-pointer">
              <X className="size-5" aria-hidden /> <span className="sr-only">Dismiss</span>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
