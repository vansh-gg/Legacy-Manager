import { useState } from 'react';
import { HeartPulse } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../lib/api.js';
import { formatDate } from '../lib/format.js';
import { Button } from './ui.jsx';

/** Shown on every page when the owner needs to check in. */
export function StatusBanner() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  if (!user || user.legacyStatus === 'ACTIVE') return null;

  const checkIn = async () => {
    setBusy(true);
    try {
      const res = await api('/check-in', { method: 'POST' });
      setUser(res.user);
      toast('Thank you! We have noted that you are well.');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const urgent = user.legacyStatus !== 'REMINDED';
  const message = {
    REMINDED: `Your check-in is due on ${formatDate(user.nextCheckInDue)}. Please let us know you are well.`,
    GRACE: `We have not heard from you. Unless you check in, your trusted people will receive access on ${formatDate(user.graceEndsAt)}.`,
    RELEASED: 'Your vault was released to your trusted people. Press the button to lock it again.',
  }[user.legacyStatus];

  return (
    <div
      role="alert"
      className={`mb-7 flex flex-col gap-4 rounded-2xl border-2 p-5 sm:flex-row sm:items-center sm:justify-between ${
        urgent ? 'border-danger bg-danger-soft' : 'border-warn bg-warn-soft'
      }`}
    >
      <p className="text-xl font-bold">{message}</p>
      <Button variant="success" size="lg" icon={HeartPulse} onClick={checkIn} loading={busy} className="shrink-0">
        I am well
      </Button>
    </div>
  );
}
