import { useState } from 'react';
import { Gift, Lock, Hourglass, HeartHandshake, Flag, FolderOpen } from 'lucide-react';
import { useToast } from '../../context/ToastContext.jsx';
import { api } from '../../lib/api.js';
import { useApi } from '../../lib/useApi.js';
import { firstName, formatDate } from '../../lib/format.js';
import { Alert, Badge, Button, Card, EmptyState, ErrorState, Loading, PageHeader, TextField } from '../../components/ui.jsx';
import { Dialog } from '../../components/Dialog.jsx';

const STATUS = {
  ACTIVE: { label: 'Checking in regularly', tone: 'ok', icon: Lock },
  GRACE: { label: 'Not responding', tone: 'warn', icon: Hourglass },
  RELEASED: { label: 'Items available to you', tone: 'info', icon: Gift },
};

function ReportDialog({ vault, onClose, onDone }) {
  const toast = useToast();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api(`/shared/${vault.id}/report`, { method: 'POST', body: { note } });
      toast(`Thank you. We will try to reach ${firstName(vault.ownerName)} urgently.`);
      onDone();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open onClose={onClose} title={`Report a concern about ${vault.ownerName}`} wide>
      <form onSubmit={submit} className="space-y-5 text-lg">
        <p>We are very sorry if you have lost someone close to you.</p>
        <Alert tone="info" title="What happens when you report">
          <ul className="list-disc space-y-1 pl-5">
            <li>We immediately email {firstName(vault.ownerName)} asking them to confirm they are well.</li>
            <li>If they do not respond within their waiting period, the items they left for you are released.</li>
            <li>Nothing is released straight away — this protects against mistakes.</li>
          </ul>
        </Alert>
        <TextField label="A short note" multiline rows={3} value={note} onChange={(e) => setNote(e.target.value)} optional maxLength={500} />
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" icon={Flag} loading={busy}>Send report</Button>
        </div>
      </form>
    </Dialog>
  );
}

export default function Shared() {
  const { data, loading, error, reload } = useApi('/shared');
  const [reporting, setReporting] = useState(null);

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <>
      <PageHeader title="Left for me" intro="People who have chosen you as their trusted person." />
      {data.vaults.length === 0 ? (
        <EmptyState icon={HeartHandshake} title="Nobody has chosen you yet">
          When someone adds you as a trusted person, you will receive an email invitation. After you accept, they will appear here.
        </EmptyState>
      ) : (
        <ul className="space-y-5">
          {data.vaults.map((v) => {
            const s = STATUS[v.ownerStatus];
            const Icon = s.icon;
            return (
              <li key={v.id}>
                <Card as="article">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-bold">{v.ownerName}</h2>
                      <p className="text-lg text-muted">You are listed as their {v.relationship.toLowerCase()}</p>
                    </div>
                    <Badge tone={s.tone}><Icon className="mr-1.5 inline size-5" aria-hidden />{s.label}</Badge>
                  </div>
                  <p className="mt-4 text-lg">
                    They have set aside <strong>{v.counts.assets}</strong> item{v.counts.assets === 1 ? '' : 's'},{' '}
                    <strong>{v.counts.documents}</strong> document{v.counts.documents === 1 ? '' : 's'} and{' '}
                    <strong>{v.counts.letters}</strong> letter{v.counts.letters === 1 ? '' : 's'} for you.
                  </p>
                  {v.ownerStatus === 'ACTIVE' && (
                    <p className="mt-2 text-lg text-muted">These stay private while {firstName(v.ownerName)} keeps checking in. There is nothing you need to do.</p>
                  )}
                  {v.ownerStatus === 'GRACE' && (
                    <Alert tone="warn" className="mt-4">
                      We are trying to reach {firstName(v.ownerName)}. If they do not respond, the items will become available on{' '}
                      <strong>{formatDate(v.graceEndsAt)}</strong>. If you can, please check on them.
                    </Alert>
                  )}
                  <div className="mt-5 flex flex-wrap gap-3">
                    {v.ownerStatus === 'RELEASED' && (
                      <Button to={`/app/shared/${v.id}`} icon={FolderOpen} size="lg">Open what was left for me</Button>
                    )}
                    {v.ownerStatus === 'ACTIVE' && (
                      <Button variant="secondary" icon={Flag} onClick={() => setReporting(v)}>Report that {firstName(v.ownerName)} has passed away</Button>
                    )}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
      {reporting && <ReportDialog vault={reporting} onClose={() => setReporting(null)} onDone={() => { setReporting(null); reload(); }} />}
    </>
  );
}
