import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { HeartPulse, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { useApi } from '../lib/useApi.js';
import { AuthCard } from '../components/PublicLayout.jsx';
import { Alert, Button, Loading } from '../components/ui.jsx';

/** Opened from the reminder email. One big button — no password needed. */
export default function CheckInLink() {
  const { token } = useParams();
  const { data, loading, error } = useApi(`/check-in/link/${token}`);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const confirm = async () => {
    setBusy(true);
    try {
      await api(`/check-in/link/${token}`, { method: 'POST' });
      setDone(true);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <AuthCard title="Check-in"><Loading /></AuthCard>;
  if (error)
    return (
      <AuthCard title="This link has expired">
        <Alert tone="warn">{error.message}</Alert>
        <Button to="/login" size="lg" className="mt-6 w-full">Log in instead</Button>
      </AuthCard>
    );

  if (done)
    return (
      <AuthCard title={`Thank you, ${data.name}!`}>
        <div className="flex flex-col items-center gap-4 text-center">
          <CheckCircle2 className="size-20 text-ok" aria-hidden />
          <p className="text-xl">We have noted that you are well. You do not need to do anything else.</p>
          <p className="text-lg text-muted">You can close this page now.</p>
        </div>
      </AuthCard>
    );

  return (
    <AuthCard title={`Hello ${data.name}, are you well?`} intro="Press the big green button to let us know. That is all.">
      {submitError && <Alert tone="danger" className="mb-6">{submitError}</Alert>}
      <Button variant="success" size="lg" icon={HeartPulse} onClick={confirm} loading={busy} className="w-full min-h-20 text-2xl">
        Yes, I am well
      </Button>
    </AuthCard>
  );
}
