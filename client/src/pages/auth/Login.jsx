import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { AuthCard } from '../../components/PublicLayout.jsx';
import { PasswordField } from '../../components/PasswordField.jsx';
import { Alert, Button, TextField } from '../../components/ui.jsx';
import { safeNext } from '../../components/RequireAuth.jsx';

export default function Login() {
  const { user, login, devTools } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [form, setForm] = useState({ email: params.get('email') || '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={next} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(form.email, form.password);
      navigate(next, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard title="Log in" intro="Welcome back. Logging in also tells us you are well.">
      {location.state?.signedOut && (
        <Alert tone="ok" className="mb-6">You have been logged out safely.</Alert>
      )}
      {location.state?.passwordReset && (
        <Alert tone="ok" className="mb-6">Your password was changed. Please log in with your new password.</Alert>
      )}
      <form onSubmit={submit} className="space-y-6" noValidate>
        {error && <Alert tone="danger">{error}</Alert>}
        <TextField
          label="Email address"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <PasswordField
          autoComplete="current-password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
        <Button type="submit" size="lg" icon={LogIn} loading={busy} className="w-full">Log in</Button>
      </form>
      <div className="mt-7 space-y-3 text-lg">
        <p><Link to="/forgot-password" className="font-bold">I forgot my password</Link></p>
        <p>
          New here?{' '}
          <Link to={`/register${params.get('next') ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-bold">
            Create a free account
          </Link>
        </p>
      </div>
      {devTools && (
        <Alert tone="info" title="Demo accounts (development only)" className="mt-7">
          <p>Owner: <strong>ramesh@example.com</strong></p>
          <p>Trusted person: <strong>priya@example.com</strong></p>
          <p>Password for both: <strong>Demo@1234</strong></p>
        </Alert>
      )}
    </AuthCard>
  );
}
