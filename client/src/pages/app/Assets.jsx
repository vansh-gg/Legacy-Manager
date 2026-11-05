import { useState } from 'react';
import { Plus, Pencil, Trash2, Lock, Wallet, AlertTriangle } from 'lucide-react';
import { useToast } from '../../context/ToastContext.jsx';
import { api } from '../../lib/api.js';
import { useApi } from '../../lib/useApi.js';
import { joinNames } from '../../lib/format.js';
import { ASSET_CATEGORIES } from '../../lib/meta.js';
import { Button, Card, EmptyState, ErrorState, Loading, PageHeader } from '../../components/ui.jsx';
import { ConfirmDialog, Dialog, PasswordDialog } from '../../components/Dialog.jsx';
import { SecretView } from '../../components/SecretView.jsx';

export default function Assets() {
  const toast = useToast();
  const assets = useApi('/assets');
  const nominees = useApi('/nominees');
  const [revealing, setRevealing] = useState(null);
  const [revealed, setRevealed] = useState(null);
  const [deleting, setDeleting] = useState(null);

  if (assets.loading || nominees.loading) return <Loading />;
  if (assets.error) return <ErrorState error={assets.error} onRetry={assets.reload} />;

  const nameOf = Object.fromEntries((nominees.data?.nominees || []).map((n) => [n.id, n.name]));
  const list = assets.data.assets;

  const reveal = async (password) => {
    const res = await api(`/assets/${revealing.id}/reveal`, { method: 'POST', body: { password } });
    setRevealed({ asset: revealing, secret: res.secret });
    setRevealing(null);
  };

  const remove = async () => {
    try {
      await api(`/assets/${deleting.id}`, { method: 'DELETE' });
      toast(`"${deleting.title}" was removed.`);
      setDeleting(null);
      assets.reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <>
      <PageHeader
        title="My accounts & assets"
        intro="Bank accounts, online accounts, policies and property — and who should receive each one."
        action={<Button to="/app/assets/new" icon={Plus} size="lg">Add an item</Button>}
      />

      {list.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Nothing added yet"
          action={<Button to="/app/assets/new" icon={Plus} size="lg">Add your first item</Button>}
        >
          Start with something important, like your main bank account. We will guide you step by step.
        </EmptyState>
      ) : (
        <ul className="grid gap-5 xl:grid-cols-2">
          {list.map((a) => {
            const meta = ASSET_CATEGORIES[a.category] || ASSET_CATEGORIES.OTHER;
            const Icon = meta.icon;
            const recipients = a.nomineeIds.map((id) => nameOf[id]).filter(Boolean);
            return (
              <li key={a.id}>
                <Card as="article" className="flex h-full flex-col">
                  <div className="flex items-start gap-4">
                    <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                      <Icon className="size-8" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="text-base font-bold text-muted">{meta.label}</p>
                      <h2 className="text-2xl font-bold leading-snug">{a.title}</h2>
                      {(a.institution || a.identifierHint) && (
                        <p className="text-lg text-muted">{[a.institution, a.identifierHint].filter(Boolean).join(' · ')}</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-lg">
                    {recipients.length > 0 ? (
                      <p><strong>Goes to:</strong> {joinNames(recipients)}</p>
                    ) : (
                      <p className="flex items-center gap-2 font-bold text-warn">
                        <AlertTriangle className="size-5" aria-hidden /> Not assigned to anyone yet
                      </p>
                    )}
                    {a.instructions && (
                      <p><strong>Your wishes:</strong> {a.instructions}</p>
                    )}
                  </div>

                  <div className="mt-auto flex flex-wrap gap-3 pt-6">
                    {a.hasSecret && (
                      <Button variant="secondary" size="sm" icon={Lock} onClick={() => setRevealing(a)}>
                        Show private details
                      </Button>
                    )}
                    <Button variant="secondary" size="sm" icon={Pencil} to={`/app/assets/${a.id}/edit`}>Change</Button>
                    <Button variant="quiet" size="sm" icon={Trash2} onClick={() => setDeleting(a)}>Remove</Button>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <PasswordDialog
        open={Boolean(revealing)}
        onClose={() => setRevealing(null)}
        onSubmit={reveal}
        description={revealing && `To see the private details of "${revealing.title}", please type your password.`}
      />

      <Dialog open={Boolean(revealed)} onClose={() => setRevealed(null)} title={revealed?.asset.title || ''}>
        {revealed && <SecretView secret={revealed.secret} />}
        <p className="mt-5 text-base text-muted">For your safety, these details are hidden again when you close this box.</p>
        <Button className="mt-5 w-full" onClick={() => setRevealed(null)}>Close and hide</Button>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        title={`Remove "${deleting?.title}"?`}
        confirmLabel="Yes, remove it"
        danger
      >
        <p>This item and its private details will be deleted permanently. Your trusted people will not receive it.</p>
      </ConfirmDialog>
    </>
  );
}
