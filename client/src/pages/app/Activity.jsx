import { ShieldAlert, History } from 'lucide-react';
import { useApi } from '../../lib/useApi.js';
import { formatDateTime } from '../../lib/format.js';
import { Card, EmptyState, ErrorState, Loading, PageHeader } from '../../components/ui.jsx';

/** Events worth drawing attention to. */
const ATTENTION = new Set([
  'LOGIN_FAILED',
  'ACCOUNT_LOCKED',
  'SECRET_VIEW_DENIED',
  'GRACE_STARTED',
  'VAULT_RELEASED',
  'NOMINEE_SECRET_VIEWED',
  'NOMINEE_DOCUMENT_OPENED',
  'NOMINEE_DECLINED',
]);

export default function Activity() {
  const { data, loading, error, reload } = useApi('/activity');
  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <>
      <PageHeader
        title="Activity history"
        intro="A complete record of everything that happened in your vault — useful to spot anything unexpected."
      />
      {data.activity.length === 0 ? (
        <EmptyState icon={History} title="Nothing yet" />
      ) : (
        <Card className="p-0 sm:p-0">
          <ul className="divide-y divide-line">
            {data.activity.map((a) => {
              const alert = ATTENTION.has(a.action);
              return (
                <li key={a.id} className={`flex gap-4 px-5 py-4 sm:px-7 ${alert ? 'bg-warn-soft' : ''}`}>
                  {alert && <ShieldAlert className="mt-1 size-6 shrink-0 text-warn" aria-label="Needs attention" />}
                  <div>
                    <p className="text-lg">{a.detail}</p>
                    <p className="text-base text-muted">{formatDateTime(a.createdAt)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </>
  );
}
