import { RefreshCw, ExternalLink } from 'lucide-react';
import { useApi } from '../lib/useApi.js';
import { formatDateTime } from '../lib/format.js';
import { Alert, Button, Card, ErrorState, Loading, PageHeader } from '../components/ui.jsx';

/** Development only: every email the system "sent", so demos work without SMTP. */
export default function Mailbox() {
  const { data, loading, error, reload } = useApi('/dev/mailbox');

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <PageHeader
        title="Demo mailbox"
        intro="Every email the system sends appears here while running in development mode, so you can follow links without a real email server."
        action={<Button variant="secondary" icon={RefreshCw} onClick={reload}>Refresh</Button>}
      />
      {loading && !data ? (
        <Loading />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : data.emails.length === 0 ? (
        <Alert tone="info">No emails yet.</Alert>
      ) : (
        <ul className="space-y-4">
          {data.emails.map((m) => {
            const path = m.link ? new URL(m.link).pathname : null;
            return (
              <li key={m.id}>
                <Card as="article">
                  <p className="text-base text-muted">To <strong className="text-ink">{m.to}</strong> · {formatDateTime(m.createdAt)}</p>
                  <h2 className="mt-1 text-xl font-bold">{m.subject}</h2>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-lg font-bold text-brand">Read the email</summary>
                    <p className="mt-3 whitespace-pre-line text-lg">{m.text}</p>
                  </details>
                  {path && <Button to={path} icon={ExternalLink} size="sm" className="mt-4">Open the link in this email</Button>}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
