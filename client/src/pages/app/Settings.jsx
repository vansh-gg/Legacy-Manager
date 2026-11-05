import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, KeyRound, LogOut, Trash2, FlaskConical, Inbox } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { TEXT_SIZES, usePrefs } from '../../context/PrefsContext.jsx';
import { api } from '../../lib/api.js';
import { formatDate } from '../../lib/format.js';
import { Alert, Button, Card, PageHeader, SelectField, TextField } from '../../components/ui.jsx';
import { PasswordField, PasswordRules, PASSWORD_RULES } from '../../components/PasswordField.jsx';
import { ConfirmDialog, Dialog } from '../../components/Dialog.jsx';

const INTERVALS = [7, 14, 30, 60, 90, 180];
const GRACE = [3, 7, 14, 30];

function useSubmit(fn) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async (e) => {
    e?.preventDefault();
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run };
}

function Section({ title, intro, children }) {
  return (
    <Card>
      <h2 className="text-2xl font-bold">{title}</h2>
      {intro && <p className="mt-1 text-lg text-muted">{intro}</p>}
      <div className="mt-6">{children}</div>
    </Card>
  );
}

export default function Settings() {
  const { user, setUser, devTools } = useAuth();
  const { textSize, setTextSize } = usePrefs();
  const toast = useToast();
  const navigate = useNavigate();

  const [profile, setProfile] = useState({ name: user.name, phone: user.phone || '' });
  const saveProfile = useSubmit(async () => {
    const res = await api('/auth/me', { method: 'PATCH', body: profile });
    setUser(res.user);
    toast('Your details were saved.');
  });

  const [schedule, setSchedule] = useState({ checkInIntervalDays: user.checkInIntervalDays, gracePeriodDays: user.gracePeriodDays });
  const saveSchedule = useSubmit(async () => {
    const res = await api('/auth/me/check-in-settings', { method: 'PATCH', body: schedule });
    setUser(res.user);
    toast('Your check-in schedule was saved.');
  });

  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const changePassword = useSubmit(async () => {
    if (!PASSWORD_RULES.every((r) => r.test(pw.newPassword))) throw new Error('Please follow the password rules.');
    if (pw.newPassword !== pw.confirm) throw new Error('The two new passwords do not match.');
    await api('/auth/change-password', { method: 'POST', body: { currentPassword: pw.currentPassword, newPassword: pw.newPassword } });
    setPw({ currentPassword: '', newPassword: '', confirm: '' });
    toast('Your password was changed. Other devices have been signed out.');
  });

  const [confirmLogoutAll, setConfirmLogoutAll] = useState(false);
  const logoutAll = async () => {
    await api('/auth/logout-everywhere', { method: 'POST' });
    setUser(null);
    navigate('/login', { replace: true, state: { signedOut: true } });
  };

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePw, setDeletePw] = useState('');
  const deleteAccount = useSubmit(async () => {
    await api('/auth/me', { method: 'DELETE', body: { password: deletePw } });
    setUser(null);
    navigate('/', { replace: true });
  });

  const timeTravel = async (days) => {
    try {
      const res = await api('/dev/time-travel', { method: 'POST', body: { days } });
      setUser(res.user);
      toast(`Moved ${days} days ahead. Status is now: ${res.user.legacyStatus}.`);
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <>
      <PageHeader title="Settings" intro="Your details, check-in schedule and security." />
      <div className="max-w-3xl space-y-6">
        <Section title="Text size" intro="Choose what is most comfortable to read. This is remembered on this device.">
          <div className="flex flex-wrap gap-3" role="group" aria-label="Text size">
            {TEXT_SIZES.map((s) => (
              <Button key={s.value} variant={textSize === s.value ? 'primary' : 'secondary'} aria-pressed={textSize === s.value} onClick={() => setTextSize(s.value)}>
                {s.label}
              </Button>
            ))}
          </div>
        </Section>

        <Section title="Check-in schedule" intro="How often we ask whether you are well, and how long we wait before sharing anything.">
          <form onSubmit={saveSchedule.run} className="space-y-6">
            {saveSchedule.error && <Alert tone="danger">{saveSchedule.error}</Alert>}
            <SelectField
              label="Ask me every"
              value={schedule.checkInIntervalDays}
              onChange={(e) => setSchedule({ ...schedule, checkInIntervalDays: Number(e.target.value) })}
              options={INTERVALS.map((d) => ({ value: d, label: d < 30 ? `${d} days` : d === 30 ? '1 month (30 days)' : `${d / 30} months (${d} days)` }))}
            />
            <SelectField
              label="If I do not answer, wait this long before sharing"
              hint="During this time we keep trying to reach you, and let your trusted people know you are not responding."
              value={schedule.gracePeriodDays}
              onChange={(e) => setSchedule({ ...schedule, gracePeriodDays: Number(e.target.value) })}
              options={GRACE.map((d) => ({ value: d, label: `${d} days` }))}
            />
            <p className="text-lg">Your next check-in is due on <strong>{formatDate(user.nextCheckInDue)}</strong>.</p>
            <Button type="submit" icon={Check} loading={saveSchedule.busy}>Save schedule</Button>
          </form>
        </Section>

        <Section title="My details">
          <form onSubmit={saveProfile.run} className="space-y-6">
            {saveProfile.error && <Alert tone="danger">{saveProfile.error}</Alert>}
            <TextField label="Full name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} required />
            <TextField label="Email address" value={user.email} readOnly hint="Your email address cannot be changed here." />
            <TextField label="Mobile number" type="tel" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} optional />
            <Button type="submit" icon={Check} loading={saveProfile.busy}>Save my details</Button>
          </form>
        </Section>

        <Section title="Change password">
          <form onSubmit={changePassword.run} className="space-y-6">
            {changePassword.error && <Alert tone="danger">{changePassword.error}</Alert>}
            <PasswordField label="Current password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} required />
            <div className="space-y-3">
              <PasswordField label="New password" autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} required />
              <PasswordRules password={pw.newPassword} />
            </div>
            <PasswordField label="Type the new password again" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} required />
            <Button type="submit" icon={KeyRound} loading={changePassword.busy}>Change password</Button>
          </form>
        </Section>

        <Section title="Security" intro="If you think someone else may have used your account, sign out everywhere and change your password.">
          <Button variant="secondary" icon={LogOut} onClick={() => setConfirmLogoutAll(true)}>Sign out of all devices</Button>
        </Section>

        {devTools && (
          <Section title="Demonstration tools" intro="Only available in development. Pretend time has passed to see reminders and the release process.">
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" icon={FlaskConical} onClick={() => timeTravel(28)}>+28 days (reminder)</Button>
              <Button variant="secondary" icon={FlaskConical} onClick={() => timeTravel(user.checkInIntervalDays + 1)}>Miss the check-in</Button>
              <Button variant="secondary" icon={FlaskConical} onClick={() => timeTravel(user.gracePeriodDays + 1)}>End the waiting period</Button>
              <Button variant="quiet" icon={Inbox} to="/dev/mailbox">Open demo mailbox</Button>
            </div>
          </Section>
        )}

        <Section title="Delete my account" intro="This permanently deletes your vault, documents and letters. It cannot be undone.">
          <Button variant="danger" icon={Trash2} onClick={() => setDeleteOpen(true)}>Delete my account</Button>
        </Section>
      </div>

      <ConfirmDialog open={confirmLogoutAll} onClose={() => setConfirmLogoutAll(false)} onConfirm={logoutAll} title="Sign out everywhere?" confirmLabel="Yes, sign out">
        <p>You will be signed out on this device and every other device. You can log in again straight away.</p>
      </ConfirmDialog>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete your account permanently?">
        <form onSubmit={deleteAccount.run} className="space-y-5">
          <Alert tone="danger">Everything in your vault will be deleted. Your trusted people will not receive anything.</Alert>
          {deleteAccount.error && <Alert tone="danger">{deleteAccount.error}</Alert>}
          <TextField label="Type your password to confirm" type="password" value={deletePw} onChange={(e) => setDeletePw(e.target.value)} required />
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>No, keep my account</Button>
            <Button type="submit" variant="danger" loading={deleteAccount.busy}>Delete everything</Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
