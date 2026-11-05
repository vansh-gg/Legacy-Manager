import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { AuthCard } from '../../components/PublicLayout.jsx';
import { PasswordField, PasswordRules, PASSWORD_RULES } from '../../components/PasswordField.jsx';
import { Alert, Button, TextField } from '../../components/ui.jsx';
import { safeNext } from '../../components/RequireAuth.jsx';

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const lockedEmail = params.get('email');
  const [form, setForm] = useState({ name: '', email: lockedEmail || '', phone: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={next} replace />;
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (form.name.trim().length < 2) errs.name = 'Please enter your full name.';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Please enter a valid email address.';
    if (!PASSWORD_RULES.every((r) => r.test(form.password))) errs.password = 'Please follow the password rules below.';
    if (form.password !== form.confirm) errs.confirm = 'The two passwords do not match.';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    setError('');
    try {
      await register({ name: form.name, email: form.email, phone: form.phone, password: form.password });
      navigate(next === '/app' ? '/app' : next, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard title="Create your free account" intro="It takes about two minutes. You can add everything else later, at your own pace.">
      <form onSubmit={submit} className="space-y-6" noValidate>
        {error && <Alert tone="danger">{error}</Alert>}
        <TextField label="Your full name" autoComplete="name" value={form.name} onChange={set('name')} error={errors.name} required />
        <TextField
          label="Email address"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={set('email')}
          error={errors.email}
          readOnly={Boolean(lockedEmail)}
          hint={lockedEmail ? 'This is the address your invitation was sent to.' : 'We will send reminders and important messages here.'}
          required
        />
        <TextField label="Mobile number" type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} optional />
        <div className="space-y-3">
          <PasswordField label="Choose a password" autoComplete="new-password" value={form.password} onChange={set('password')} error={errors.password} required />
          <PasswordRules password={form.password} />
        </div>
        <PasswordField label="Type the password again" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} required />
        <Button type="submit" size="lg" icon={UserPlus} loading={busy} className="w-full">Create my account</Button>
      </form>
      <p className="mt-7 text-lg">
        Already have an account?{' '}
        <Link to={`/login${params.toString() ? `?${params}` : ''}`} className="font-bold">Log in</Link>
      </p>
    </AuthCard>
  );
}
