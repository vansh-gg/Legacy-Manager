import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Download, Lock, Mail } from 'lucide-react';
import { useToast } from '../../context/ToastContext.jsx';
import { api, downloadFile } from '../../lib/api.js';
import { useApi } from '../../lib/useApi.js';
import { formatSize } from '../../lib/format.js';
import { ASSET_CATEGORIES, DOCUMENT_CATEGORIES } from '../../lib/meta.js';
import { Alert, Button, Card, ErrorState, Loading, PageHeader } from '../../components/ui.jsx';
import { Dialog, PasswordDialog } from '../../components/Dialog.jsx';
import { SecretView } from '../../components/SecretView.jsx';

/** What a released owner left for the signed-in nominee. */
export default function SharedVault() {
  const { nomineeId } = useParams();
  const toast = useToast();
  const { data, loading, error, reload } = useApi(`/shared/${nomineeId}`);
  const [revealing, setRevealing] = useState(null);
  const [revealed, setRevealed] = useState(null);

  if (loading) return <Loading />;
  if (error)
    return (
      <>
        <PageHeader title="Left for me" back={{ to: '/app/shared', label: 'Back' }} />
        {error.status === 403 ? <Alert tone="info">{error.message}</Alert> : <ErrorState error={error} onRetry={reload} />}
      </>
    );

  const reveal = async (password) => {
    const res = await api(`/shared/${nomineeId}/assets/${revealing.id}/reveal`, { method: 'POST', body: { password } });
    setRevealed({ asset: revealing, secret: res.secret });
    setRevealing(null);
  };

  return (
    <>
      <PageHeader
        title={`From ${data.ownerName}`}
        intro={`${data.ownerName} wanted you to have the following. Please take your time.`}
        back={{ to: '/app/shared', label: 'Back to Left for me' }}
      />

      {data.letters.length > 0 && (
        <section className="mb-10 space-y-4" aria-labelledby="letters-heading">
          <h2 id="letters-heading" className="text-2xl font-bold">Letters for you</h2>
          {data.letters.map((l) => (
            <Card key={l.id} as="article" className="bg-[#fffdf7]">
              <div className="flex items-center gap-3">
                <Mail className="size-7 text-brand" aria-hidden />
                <h3 className="text-2xl font-bold">{l.subject}</h3>
              </div>
              <p className="mt-4 whitespace-pre-line text-xl leading-relaxed">{l.body}</p>
            </Card>
          ))}
        </section>
      )}

      <section className="mb-10 space-y-4" aria-labelledby="assets-heading">
        <h2 id="assets-heading" className="text-2xl font-bold">Accounts and assets</h2>
        {data.assets.length === 0 && <p className="text-lg text-muted">No accounts were assigned to you.</p>}
        {data.assets.map((a) => {
          const meta = ASSET_CATEGORIES[a.category] || ASSET_CATEGORIES.OTHER;
          const Icon = meta.icon;
          return (
            <Card key={a.id} as="article">
              <div className="flex items-start gap-4">
                <Icon className="size-9 shrink-0 text-brand" aria-hidden />
                <div className="min-w-0">
                  <p className="text-base font-bold text-muted">{meta.label}</p>
                  <h3 className="text-2xl font-bold">{a.title}</h3>
                  {(a.institution || a.identifierHint) && <p className="text-lg text-muted">{[a.institution, a.identifierHint].filter(Boolean).join(' · ')}</p>}
                </div>
              </div>
              {a.instructions && (
                <div className="mt-4 rounded-xl bg-brand-soft p-4 text-lg">
                  <p className="font-bold">What {data.ownerName.split(' ')[0]} asked you to do:</p>
                  <p className="mt-1">{a.instructions}</p>
                </div>
              )}
              {a.hasSecret && (
                <Button variant="secondary" size="sm" icon={Lock} className="mt-4" onClick={() => setRevealing(a)}>Show login details</Button>
              )}
            </Card>
          );
        })}
      </section>

      <section className="space-y-4" aria-labelledby="docs-heading">
        <h2 id="docs-heading" className="text-2xl font-bold">Documents</h2>
        {data.documents.length === 0 && <p className="text-lg text-muted">No documents were shared with you.</p>}
        {data.documents.map((d) => {
          const meta = DOCUMENT_CATEGORIES[d.category] || DOCUMENT_CATEGORIES.OTHER;
          return (
            <Card key={d.id} as="article" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-xl font-bold">{d.title}</h3>
                <p className="text-base text-muted">{meta.label} · {formatSize(d.size)}</p>
              </div>
              <Button
                variant="secondary"
                icon={Download}
                onClick={() => downloadFile(`/shared/${nomineeId}/documents/${d.id}/download`, d.originalName).catch((err) => toast(err.message, 'error'))}
              >
                Download
              </Button>
            </Card>
          );
        })}
      </section>

      <PasswordDialog
        open={Boolean(revealing)}
        onClose={() => setRevealing(null)}
        onSubmit={reveal}
        description="For safety, please type your own password to see these login details."
      />
      <Dialog open={Boolean(revealed)} onClose={() => setRevealed(null)} title={revealed?.asset.title || ''}>
        {revealed && <SecretView secret={revealed.secret} />}
        <Button className="mt-6 w-full" onClick={() => setRevealed(null)}>Close and hide</Button>
      </Dialog>
    </>
  );
}
