import { Navigate } from 'react-router-dom';
import { ClipboardList, Users, HeartPulse, Lock, Eye, BellRing, ShieldCheck, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { Button } from '../components/ui.jsx';

const STEPS = [
  {
    icon: ClipboardList,
    title: '1. Write down what matters',
    text: 'Bank accounts, email, insurance, property papers and your wishes for each — all in one safe place.',
  },
  {
    icon: Users,
    title: '2. Choose people you trust',
    text: 'Decide exactly who should receive each item. They get an invitation by email.',
  },
  {
    icon: HeartPulse,
    title: '3. Check in now and then',
    text: 'Once a month we ask "Are you well?". One click is enough. Logging in also counts.',
  },
];

const SAFETY = [
  { icon: Lock, title: 'Locked with strong encryption', text: 'Passwords, notes, letters and files are encrypted before they are saved.' },
  { icon: Eye, title: 'Nobody sees anything early', text: 'Your trusted people see nothing until you stop checking in for a long time.' },
  { icon: BellRing, title: 'Many warnings first', text: 'We remind you, then warn you urgently, and wait a grace period before anything is shared.' },
  { icon: ShieldCheck, title: 'You stay in control', text: 'Checking in at any time locks everything again — even after it was shared.' },
];

export default function Landing() {
  const { user } = useAuth();
  if (user) return <Navigate to="/app" replace />;

  return (
    <>
      <section className="bg-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.2fr_1fr] lg:py-20">
          <div>
            <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
              Put your affairs in order — <span className="text-brand">calmly and safely.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-xl text-muted">
              Digital Legacy Manager keeps a secure record of your accounts, documents and wishes, and passes them only to the
              people you trust, only when they truly need them.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button to="/register" size="lg">Create my free account</Button>
              <Button to="/login" size="lg" variant="secondary">I already have an account</Button>
            </div>
          </div>
          <div className="rounded-3xl bg-brand-soft p-7">
            <p className="text-lg font-bold text-brand-dark">Why this matters</p>
            <p className="mt-3 text-lg">
              When someone passes away, families often spend months searching for bank details, policies and passwords — at the
              hardest time of their lives.
            </p>
            <p className="mt-3 text-lg">A few minutes today can save your loved ones a great deal of worry.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h2 className="text-3xl font-bold">How it works</h2>
        <div className="mt-7 grid gap-5 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-line bg-white p-6">
              <Icon className="size-10 text-brand" aria-hidden />
              <h3 className="mt-4 text-2xl font-bold">{title}</h3>
              <p className="mt-2 text-lg text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="text-3xl font-bold">How we keep it safe</h2>
          <div className="mt-7 grid gap-5 sm:grid-cols-2">
            {SAFETY.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex gap-4 rounded-2xl border border-line p-6">
                <Icon className="size-9 shrink-0 text-ok" aria-hidden />
                <div>
                  <h3 className="text-xl font-bold">{title}</h3>
                  <p className="mt-1 text-lg text-muted">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="flex flex-col gap-4 rounded-2xl border-2 border-brand/30 bg-brand-soft p-7 sm:flex-row sm:items-center">
          <Mail className="size-10 shrink-0 text-brand" aria-hidden />
          <div>
            <h2 className="text-2xl font-bold">Did someone choose you as their trusted person?</h2>
            <p className="mt-1 text-lg">Open the invitation link in your email. It will guide you step by step.</p>
          </div>
        </div>
      </section>
    </>
  );
}
