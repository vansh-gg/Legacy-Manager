import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Send } from 'lucide-react';
import { api } from '../../lib/api.js';
import { AuthCard } from '../../components/PublicLayout.jsx';
import { Alert, Button, TextField } from '../../components/ui.jsx';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/auth/forgot-password', { method: 'POST', body: { email } });
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard title="Forgot your password?" intro="No problem. We will email you a link to choose a new one.">
      {sent ? (
        <Alert tone="ok" title="Please check your email">
          If an account exists for <strong>{email}</strong>, we have sent a link. It works for one hour. Also look in your
          spam or junk folder.
        </Alert>
      ) : (
        <form onSubmit={submit} className="space-y-6">
          {error && <Alert tone="danger">{error}</Alert>}
          <TextField label="Your email address" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Button type="submit" size="lg" icon={Send} loading={busy} className="w-full">Send me a reset link</Button>
        </form>
      )}
      <p className="mt-7 text-lg"><Link to="/login" className="font-bold">← Back to log in</Link></p>
    </AuthCard>
  );
}
