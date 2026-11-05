import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, HeartPulse, Wallet, FileText, Users, Mail, Gift, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { api } from '../../lib/api.js';
import { useApi } from '../../lib/useApi.js';
import { firstName, formatDate, formatDateTime, greeting, relativeDays } from '../../lib/format.js';
import { Button, Card, ErrorState, Loading } from '../../components/ui.jsx';

function CheckInCard({ user, onCheckedIn }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const checkIn = async () => {
    setBusy(true);
    try {
      const res = await api('/check-in', { method: 'POST' });
      onCheckedIn(res.user);
      toast('Thank you! We have noted that you are well.');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-2 border-ok/30 bg-ok-soft">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold">Your regular check-in</h2>
          <p className="mt-2 text-lg">
            Last check-in: <strong>{formatDate(user.lastCheckInAt)}</strong> ({relativeDays(user.lastCheckInAt)})
          </p>
          <p className="text-lg">
            Next check-in due: <strong>{formatDate(user.nextCheckInDue)}</strong> ({relativeDays(user.nextCheckInDue)})
          </p>
          <p className="mt-2 text-base text-muted">
            We will remind you by email before it is due. Logging in also counts as a check-in.
          </p>
        </div>
        <Button variant="success" size="lg" icon={HeartPulse} onClick={checkIn} loading={busy} className="shrink-0">
          I am well — check in now
        </Button>
      </div>
    </Card>
  );
}

const TILES = [
  { key: 'assets', label: 'Accounts & assets', to: '/app/assets', icon: Wallet },
  { key: 'documents', label: 'Documents', to: '/app/documents', icon: FileText },
  { key: 'nominees', label: 'Trusted people', to: '/app/nominees', icon: Users },
  { key: 'letters', label: 'Personal letters', to: '/app/letters', icon: Mail },
];

export default function Home() {
  const { user, setUser } = useAuth();
  const { data, loading, error, reload } = useApi('/dashboard');

  const onCheckedIn = (u) => {
    setUser(u);
    reload();
  };

  if (loading && !data) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const done = data.steps.filter((s) => s.done).length;
  const percent = Math.round((done / data.steps.length) * 100);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold sm:text-4xl">{greeting()}, {firstName(user.name)}</h1>
        <p className="mt-2 text-lg text-muted">Here is everything at a glance.</p>
      </header>

      {user.legacyStatus === 'ACTIVE' && <CheckInCard user={user} onCheckedIn={onCheckedIn} />}

      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-2xl font-bold">Your plan is {percent}% ready</h2>
          <p className="text-lg text-muted">{done} of {data.steps.length} steps done</p>
        </div>
        <div
          className="mt-4 h-4 overflow-hidden rounded-full bg-line"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Plan progress"
        >
          <div className="h-full rounded-full bg-ok" style={{ width: `${percent}%` }} />
        </div>
        <ul className="mt-6 space-y-2">
          {data.steps.map((s) => (
            <li key={s.key}>
              <Link
                to={s.to}
                className={`flex min-h-14 items-center gap-3 rounded-xl px-3 text-lg no-underline hover:bg-brand-soft ${
                  s.done ? 'text-muted' : 'font-bold text-ink'
                }`}
              >
                {s.done ? (
                  <CheckCircle2 className="size-7 shrink-0 text-ok" aria-hidden />
                ) : (
                  <Circle className="size-7 shrink-0 text-muted" aria-hidden />
                )}
                <span className={s.done ? 'line-through decoration-1' : ''}>{s.label}</span>
                <span className="sr-only">{s.done ? '(done)' : '(to do)'}</span>
                {!s.done && <ArrowRight className="ml-auto size-6 text-brand" aria-hidden />}
              </Link>
            </li>
          ))}
        </ul>
        {data.counts.unassignedAssets > 0 && (
          <p className="mt-4 text-lg text-warn">
            <strong>{data.counts.unassignedAssets}</strong> item{data.counts.unassignedAssets > 1 ? 's are' : ' is'} not yet assigned to anyone.
          </p>
        )}
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {TILES.map(({ key, label, to, icon: Icon }) => (
          <Link key={key} to={to} className="rounded-2xl border border-line bg-white p-5 text-ink no-underline shadow-sm hover:border-brand">
            <Icon className="size-8 text-brand" aria-hidden />
            <p className="mt-3 text-4xl font-bold">{data.counts[key]}</p>
            <p className="text-lg font-bold">{label}</p>
          </Link>
        ))}
      </div>

      {data.counts.sharedWithMe > 0 && (
        <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Gift className="size-10 shrink-0 text-brand" aria-hidden />
            <p className="text-lg">
              <strong>{data.counts.sharedWithMe}</strong> {data.counts.sharedWithMe === 1 ? 'person has' : 'people have'} chosen you as a trusted person.
            </p>
          </div>
          <Button to="/app/shared" variant="secondary">See details</Button>
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-bold">Recent activity</h2>
          <Link to="/app/activity" className="text-lg font-bold">See all</Link>
        </div>
        <ul className="mt-4 divide-y divide-line">
          {data.recentActivity.map((a) => (
            <li key={a.id} className="py-3">
              <p className="text-lg">{a.detail}</p>
              <p className="text-base text-muted">{formatDateTime(a.createdAt)}</p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
