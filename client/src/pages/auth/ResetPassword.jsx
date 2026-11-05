import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { api } from '../../lib/api.js';
import { AuthCard } from '../../components/PublicLayout.jsx';
import { PasswordField, PasswordRules, PASSWORD_RULES } from '../../components/PasswordField.jsx';
import { Alert, Button } from '../../components/ui.jsx';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!PASSWORD_RULES.every((r) => r.test(password))) return setError('Please follow the password rules.');
    if (password !== confirm) return setError('The two passwords do not match.');
    setBusy(true);
    setError('');
    try {
      await api('/auth/reset-password', { method: 'POST', body: { token, password } });
      navigate('/login', { replace: true, state: { passwordReset: true } });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard title="Choose a new password">
      <form onSubmit={submit} className="space-y-6">
        {error && <Alert tone="danger">{error}</Alert>}
        <div className="space-y-3">
          <PasswordField label="New password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <PasswordRules password={password} />
        </div>
        <PasswordField label="Type it again" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        <Button type="submit" size="lg" icon={KeyRound} loading={busy} className="w-full">Save new password</Button>
      </form>
    </AuthCard>
  );
}
