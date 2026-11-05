import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Lock } from 'lucide-react';
import { useToast } from '../../context/ToastContext.jsx';
import { api } from '../../lib/api.js';
import { useApi } from '../../lib/useApi.js';
import { joinNames } from '../../lib/format.js';
import { ASSET_CATEGORIES } from '../../lib/meta.js';
import { Alert, Button, Card, CheckboxList, ErrorState, Loading, PageHeader, TextField } from '../../components/ui.jsx';

const STEPS = ['What is it?', 'Details', 'Private login details', 'Who receives it?', 'Check and save'];
const EMPTY = {
  category: '',
  title: '',
  institution: '',
  identifierHint: '',
  instructions: '',
  nomineeIds: [],
  secret: { username: '', password: '', notes: '' },
};

/**
 * Step-by-step form: one simple question per screen, with the
 * ability to go back at any time. Used for both adding and editing.
 */
export default function AssetForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const nominees = useApi('/nominees');
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(EMPTY);
  const [changeSecret, setChangeSecret] = useState(!editing);
  const [hadSecret, setHadSecret] = useState(false);
  const [loading, setLoading] = useState(editing);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!editing) return;
    api('/assets')
      .then(({ assets }) => {
        const a = assets.find((x) => x.id === id);
        if (!a) throw new Error('We could not find that item.');
        setForm({ ...EMPTY, ...a, institution: a.institution || '', identifierHint: a.identifierHint || '', instructions: a.instructions || '' });
        setHadSecret(a.hasSecret);
        setStep(1);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [editing, id]);

  if (loading || nominees.loading) return <Loading />;
  if (nominees.error) return <ErrorState error={nominees.error} onRetry={nominees.reload} />;

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const setSecret = (key) => (e) => setForm({ ...form, secret: { ...form.secret, [key]: e.target.value } });
  const meta = ASSET_CATEGORIES[form.category];
  const people = nominees.data.nominees;

  const next = () => {
    setError('');
    if (step === 0 && !form.category) return setError('Please choose one of the options.');
    if (step === 1 && form.title.trim().length < 2) return setError('Please give this item a name.');
    setStep((s) => s + 1);
  };

  const save = async () => {
    setBusy(true);
    setError('');
    const body = {
      category: form.category,
      title: form.title,
      institution: form.institution,
      identifierHint: form.identifierHint,
      instructions: form.instructions,
      nomineeIds: form.nomineeIds,
      ...(changeSecret ? { secret: form.secret } : {}),
    };
    try {
      if (editing) await api(`/assets/${id}`, { method: 'PUT', body });
      else await api('/assets', { method: 'POST', body });
      toast(editing ? `"${form.title}" was updated.` : `"${form.title}" was added to your vault.`);
      navigate('/app/assets');
    } catch (err) {
      setError(err.message);
      if (err.data?.field === 'identifierHint' || err.data?.field === 'title') setStep(1);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title={editing ? `Change "${form.title}"` : 'Add an account or asset'}
        back={{ to: '/app/assets', label: 'Back to my accounts & assets' }}
      />

      <ol className="mb-6 flex flex-wrap gap-2" aria-label="Progress">
        {STEPS.map((label, i) => (
          <li
            key={label}
            aria-current={i === step ? 'step' : undefined}
            className={`rounded-full px-4 py-1.5 text-base font-bold ${
              i === step ? 'bg-brand text-white' : i < step ? 'bg-ok-soft text-ok' : 'bg-black/5 text-muted'
            }`}
          >
            {i < step && <Check className="mr-1 inline size-4" aria-hidden />}
            Step {i + 1}: {label}
          </li>
        ))}
      </ol>

      <Card className="max-w-3xl">
        {error && <Alert tone="danger" className="mb-6">{error}</Alert>}

        {step === 0 && (
          <fieldset>
            <legend className="text-2xl font-bold">What would you like to add?</legend>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {Object.entries(ASSET_CATEGORIES).map(([value, c]) => {
                const Icon = c.icon;
                const selected = form.category === value;
                return (
                  <label
                    key={value}
                    className={`flex min-h-20 cursor-pointer items-center gap-4 rounded-xl border-2 p-4 ${
                      selected ? 'border-brand bg-brand-soft' : 'border-line hover:border-brand'
                    }`}
                  >
                    <input
                      type="radio"
                      name="category"
                      value={value}
                      checked={selected}
                      onChange={() => setForm({ ...form, category: value })}
                      className="size-6 accent-[#1e40af]"
                    />
                    <Icon className="size-8 shrink-0 text-brand" aria-hidden />
                    <span>
                      <span className="block text-lg font-bold">{c.label}</span>
                      <span className="block text-base text-muted">{c.hint}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Tell us about it</h2>
            <TextField label="Name" hint={`For example: "${meta?.example}"`} value={form.title} onChange={set('title')} required autoFocus />
            <TextField label="Bank or company name" value={form.institution} onChange={set('institution')} optional hint="For example: State Bank of India, Google, LIC" />
            <TextField
              label="A hint to recognise it"
              value={form.identifierHint}
              onChange={set('identifierHint')}
              optional
              hint='Only the last 4 digits, for example "ending 4321". Never the full account number.'
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Private login details</h2>
            <Alert tone="info" title="These are locked away safely">
              They are encrypted before being saved. Only you can open them (with your password), and your chosen people only
              if your vault is released. You can skip this step.
            </Alert>
            {editing && hadSecret && (
              <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border-2 border-line px-4 text-lg font-bold">
                <input type="checkbox" className="size-7 accent-[#1e40af]" checked={changeSecret} onChange={(e) => setChangeSecret(e.target.checked)} />
                Replace the saved private details
              </label>
            )}
            {editing && hadSecret && !changeSecret ? (
              <p className="flex items-center gap-2 text-lg text-muted"><Lock className="size-5" aria-hidden /> The saved details will be kept as they are.</p>
            ) : (
              <>
                <TextField label="Username, customer ID or email" value={form.secret.username} onChange={setSecret('username')} optional autoComplete="off" />
                <TextField label="Password or PIN" value={form.secret.password} onChange={setSecret('password')} optional autoComplete="off" />
                <TextField label="Private notes" multiline value={form.secret.notes} onChange={setSecret('notes')} optional hint="For example: where the locker key is kept, or security question answers." />
              </>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Who should receive this?</h2>
            <CheckboxList
              legend="Choose one or more trusted people"
              options={people.map((n) => ({ value: n.id, label: n.name, description: n.relationship }))}
              value={form.nomineeIds}
              onChange={(v) => setForm({ ...form, nomineeIds: v })}
              emptyText="You have not added any trusted people yet. You can save this now and choose later."
            />
            <TextField
              label="What should they do with it?"
              multiline
              value={form.instructions}
              onChange={set('instructions')}
              optional
              hint='For example: "Close this account and share the money equally between my children."'
            />
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4 text-lg">
            <h2 className="text-2xl font-bold">Please check everything</h2>
            <dl className="divide-y divide-line rounded-xl border border-line">
              {[
                ['Type', meta?.label],
                ['Name', form.title],
                ['Bank / company', form.institution || '—'],
                ['Hint', form.identifierHint || '—'],
                [
                  'Private details',
                  changeSecret ? (Object.values(form.secret).some(Boolean) ? 'Will be saved securely' : 'None') : 'Kept as before',
                ],
                ['Goes to', joinNames(people.filter((n) => form.nomineeIds.includes(n.id)).map((n) => n.name)) || 'Nobody yet'],
                ['Your wishes', form.instructions || '—'],
              ].map(([k, v]) => (
                <div key={k} className="grid gap-1 p-4 sm:grid-cols-[12rem_1fr]">
                  <dt className="font-bold text-muted">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          {step > (editing ? 1 : 0) ? (
            <Button variant="secondary" icon={ArrowLeft} onClick={() => setStep((s) => s - 1)}>Back</Button>
          ) : (
            <Button variant="secondary" to="/app/assets">Cancel</Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button onClick={next} icon={ArrowRight}>{step === 2 && !Object.values(form.secret).some(Boolean) ? 'Skip this step' : 'Next'}</Button>
          ) : (
            <Button variant="success" icon={Check} onClick={save} loading={busy} size="lg">Save</Button>
          )}
        </div>
      </Card>
    </>
  );
}
