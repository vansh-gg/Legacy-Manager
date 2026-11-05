import { useState } from 'react';
import { PenLine, Pencil, Trash2, Mail } from 'lucide-react';
import { useToast } from '../../context/ToastContext.jsx';
import { api } from '../../lib/api.js';
import { useApi } from '../../lib/useApi.js';
import { formatDate } from '../../lib/format.js';
import { Alert, Button, Card, EmptyState, ErrorState, Loading, PageHeader } from '../../components/ui.jsx';
import { ConfirmDialog } from '../../components/Dialog.jsx';

export default function Letters() {
  const toast = useToast();
  const { data, loading, error, reload } = useApi('/letters');
  const [deleting, setDeleting] = useState(null);

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const remove = async () => {
    try {
      await api(`/letters/${deleting.id}`, { method: 'DELETE' });
      toast('The letter was deleted.');
      setDeleting(null);
      reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <>
      <PageHeader
        title="Personal letters"
        intro="Words for the people you love. Each letter is sealed and delivered only if your vault is released."
        action={<Button to="/app/letters/new" icon={PenLine} size="lg">Write a letter</Button>}
      />
      <Alert tone="info" className="mb-6">Letters are encrypted. Nobody — not even the people running this website — can read them.</Alert>

      {data.letters.length === 0 ? (
        <EmptyState icon={Mail} title="No letters yet" action={<Button to="/app/letters/new" icon={PenLine} size="lg">Write your first letter</Button>}>
          A few words of love, advice or explanation can mean a great deal.
        </EmptyState>
      ) : (
        <ul className="space-y-4">
          {data.letters.map((l) => (
            <li key={l.id}>
              <Card as="article">
                <p className="text-base font-bold text-muted">For {l.nomineeName} · last changed {formatDate(l.updatedAt)}</p>
                <h2 className="text-2xl font-bold">{l.subject}</h2>
                <p className="mt-3 line-clamp-3 whitespace-pre-line text-lg">{l.body}</p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button variant="secondary" size="sm" icon={Pencil} to={`/app/letters/${l.id}/edit`}>Read or change</Button>
                  <Button variant="quiet" size="sm" icon={Trash2} onClick={() => setDeleting(l)}>Delete</Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog open={Boolean(deleting)} onClose={() => setDeleting(null)} onConfirm={remove} title="Delete this letter?" confirmLabel="Yes, delete" danger>
        <p>“{deleting?.subject}” will be permanently deleted.</p>
      </ConfirmDialog>
    </>
  );
}
