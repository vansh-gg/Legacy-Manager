import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { HeartHandshake, Check, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../lib/api.js';
import { useApi } from '../lib/useApi.js';
import { AuthCard } from '../components/PublicLayout.jsx';
import { Alert, Button, Loading } from '../components/ui.jsx';
import { ConfirmDialog } from '../components/Dialog.jsx';

/** Opened by a nominee from the invitation email. */
export default function Invite() {
  const { token } = useParams();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, loading, error } = useApi(`/invites/${token}`);
  const [busy, setBusy] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [actionError, setActionError] = useState('');

  if (loading) return <AuthCard title="Invitation"><Loading /></AuthCard>;
  if (error)
    return (
      <AuthCard title="This invitation is no longer valid">
        <Alert tone="warn">{error.message}</Alert>
        <p className="mt-5 text-lg">Please ask the person who invited you to send it again.</p>
      </AuthCard>
    );

  const { invite } = data;
  const here = `/invite/${token}`;
  const sameEmail = user && user.email === invite.email;

  const accept = async () => {
    setBusy(true);
    setActionError('');
    try {
      await api(`/invites/${token}/accept`, { method: 'POST' });
      toast(`Thank you. You are now ${invite.ownerName}'s trusted person.`);
      navigate('/app/shared');
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const decline = async () => {
    await api(`/invites/${token}/decline`, { method: 'POST' });
    setDeclining(false);
    setDeclined(true);
  };

  if (declined)
    return (
      <AuthCard title="You have declined">
        <p className="text-lg">We have let {invite.ownerName} know. Thank you for replying.</p>
      </AuthCard>
    );

  return (
    <AuthCard title={`${invite.ownerName} trusts you`}>
      <div className="space-y-4 text-lg">
        <HeartHandshake className="size-14 text-brand" aria-hidden />
        <p>
          Dear {invite.nomineeName}, <strong>{invite.ownerName}</strong> has chosen you as a trusted person in their digital will.
        </p>
        <Alert tone="info" title="What this means">
          <ul className="list-disc space-y-1 pl-5">
            <li>You will <strong>not</strong> see anything of theirs now.</li>
            <li>If {invite.ownerName} stops responding to regular check-ins for a long time, the items they chose for you will become available to you.</li>
            <li>You can decline if you prefer.</li>
          </ul>
        </Alert>
      </div>

      {actionError && <Alert tone="danger" className="mt-6">{actionError}</Alert>}

      <div className="mt-7 space-y-3">
        {sameEmail ? (
          <Button size="lg" variant="success" icon={Check} onClick={accept} loading={busy} className="w-full">Accept</Button>
        ) : user ? (
          <>
            <Alert tone="warn">
              You are logged in as <strong>{user.email}</strong>, but this invitation was sent to <strong>{invite.email}</strong>.
            </Alert>
            <Button size="lg" className="w-full" onClick={async () => { await logout(); navigate(`/login?next=${encodeURIComponent(here)}&email=${encodeURIComponent(invite.email)}`); }}>
              Log out and switch account
            </Button>
          </>
        ) : (
          <>
            <p className="text-lg">To accept, please create a free account (or log in) with <strong>{invite.email}</strong>.</p>
            <Button size="lg" className="w-full" to={`/register?next=${encodeURIComponent(here)}&email=${encodeURIComponent(invite.email)}`}>
              Create my account
            </Button>
            <Button size="lg" variant="secondary" className="w-full" to={`/login?next=${encodeURIComponent(here)}&email=${encodeURIComponent(invite.email)}`}>
              I already have an account
            </Button>
          </>
        )}
        <Button variant="quiet" icon={X} className="w-full" onClick={() => setDeclining(true)}>No thank you, decline</Button>
      </div>

      <ConfirmDialog open={declining} onClose={() => setDeclining(false)} onConfirm={decline} title="Decline this invitation?" confirmLabel="Yes, decline">
        <p>{invite.ownerName} will be told that you declined, so they can choose someone else.</p>
      </ConfirmDialog>
    </AuthCard>
  );
}
