import { useState } from 'react';
import { Plus, Pencil, Trash2, Send, Users, Mail, Phone } from 'lucide-react';
import { useToast } from '../../context/ToastContext.jsx';
import { api } from '../../lib/api.js';
import { useApi } from '../../lib/useApi.js';
import { NOMINEE_STATUS } from '../../lib/meta.js';
import { Alert, Badge, Button, Card, EmptyState, ErrorState, Loading, PageHeader } from '../../components/ui.jsx';
import { ConfirmDialog } from '../../components/Dialog.jsx';

export default function Nominees() {
  const toast = useToast();
  const { data, loading, error, reload } = useApi('/nominees');
  const [deleting, setDeleting] = useState(null);
  const [resending, setResending] = useState(null);

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const resend = async (n) => {
    setResending(n.id);
    try {
      await api(`/nominees/${n.id}/resend`, { method: 'POST' });
      toast(`A new invitation was sent to ${n.name}.`);
      reload();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setResending(null);
    }
  };

  const remove = async () => {
    try {
      await api(`/nominees/${deleting.id}`, { method: 'DELETE' });
      toast(`${deleting.name} was removed.`);
      setDeleting(null);
      reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const list = data.nominees;
  return (
    <>
      <PageHeader
        title="Trusted people"
        intro="The family members or friends who should receive your items. Each person must accept an email invitation."
        action={<Button to="/app/nominees/new" icon={Plus} size="lg">Add a person</Button>}
      />

      {list.length === 0 ? (
        <EmptyState icon={Users} title="No trusted people yet" action={<Button to="/app/nominees/new" icon={Plus} size="lg">Add a trusted person</Button>}>
          Choose someone you trust completely — for example your son, daughter or spouse.
        </EmptyState>
      ) : (
        <>
          {list.some((n) => n.status === 'INVITED') && (
            <Alert tone="info" className="mb-6">
              People marked <strong>“Waiting for reply”</strong> have not yet accepted. Items are only released to people who
              have accepted.
            </Alert>
          )}
          <ul className="grid gap-5 xl:grid-cols-2">
            {list.map((n) => {
              const status = NOMINEE_STATUS[n.status];
              return (
                <li key={n.id}>
                  <Card as="article" className="flex h-full flex-col">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-2xl font-bold">{n.name}</h2>
                        <p className="text-lg text-muted">{n.relationship}</p>
                      </div>
                      <Badge tone={status.tone}>{status.label}</Badge>
                    </div>
                    <div className="mt-4 space-y-1 text-lg">
                      <p className="flex items-center gap-2 break-all"><Mail className="size-5 shrink-0 text-muted" aria-hidden /> {n.email}</p>
                      {n.phone && <p className="flex items-center gap-2"><Phone className="size-5 shrink-0 text-muted" aria-hidden /> {n.phone}</p>}
                      <p className="pt-2">
                        Will receive <strong>{n.counts.assets}</strong> item{n.counts.assets === 1 ? '' : 's'},{' '}
                        <strong>{n.counts.documents}</strong> document{n.counts.documents === 1 ? '' : 's'} and{' '}
                        <strong>{n.counts.letters}</strong> letter{n.counts.letters === 1 ? '' : 's'}.
                      </p>
                    </div>
                    <div className="mt-auto flex flex-wrap gap-3 pt-6">
                      {n.status !== 'ACCEPTED' && (
                        <Button variant="secondary" size="sm" icon={Send} onClick={() => resend(n)} loading={resending === n.id}>
                          Send invitation again
                        </Button>
                      )}
                      <Button variant="secondary" size="sm" icon={Pencil} to={`/app/nominees/${n.id}/edit`}>Change</Button>
                      <Button variant="quiet" size="sm" icon={Trash2} onClick={() => setDeleting(n)}>Remove</Button>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        title={`Remove ${deleting?.name}?`}
        confirmLabel="Yes, remove"
        danger
      >
        <p>
          {deleting?.name} will no longer receive anything from you. Letters written to them will also be deleted.
        </p>
      </ConfirmDialog>
    </>
  );
}
