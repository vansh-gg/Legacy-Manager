import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useToast } from '../../context/ToastContext.jsx';
import { api } from '../../lib/api.js';
import { useApi } from '../../lib/useApi.js';
import { Alert, Button, Card, ErrorState, Loading, PageHeader, SelectField, TextField } from '../../components/ui.jsx';

export default function LetterForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const nominees = useApi('/nominees');
  const [form, setForm] = useState({ nomineeId: '', subject: '', body: '' });
  const [loading, setLoading] = useState(editing);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!editing) return;
    api('/letters')
      .then(({ letters }) => {
        const l = letters.find((x) => x.id === id);
        if (!l) throw new Error('We could not find that letter.');
        setForm({ nomineeId: l.nomineeId, subject: l.subject, body: l.body });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [editing, id]);

  if (loading || nominees.loading) return <Loading />;
  if (nominees.error) return <ErrorState error={nominees.error} onRetry={nominees.reload} />;
  const people = nominees.data.nominees;

  if (people.length === 0)
    return (
      <>
        <PageHeader title="Write a letter" back={{ to: '/app/letters', label: 'Back to letters' }} />
        <Alert tone="warn" title="Please add a trusted person first">
          A letter is delivered to one of your trusted people. Add someone first, then come back here.
        </Alert>
        <Button to="/app/nominees/new" className="mt-5">Add a trusted person</Button>
      </>
    );

  const submit = async (e) => {
    e.preventDefault();
    if (!form.nomineeId) return setError('Please choose who this letter is for.');
    setBusy(true);
    setError('');
    try {
      if (editing) await api(`/letters/${id}`, { method: 'PUT', body: form });
      else await api('/letters', { method: 'POST', body: form });
      toast('Your letter was sealed and saved.');
      navigate('/app/letters');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title={editing ? 'Your letter' : 'Write a letter'} back={{ to: '/app/letters', label: 'Back to letters' }} />
      <Card className="max-w-3xl">
        <form onSubmit={submit} className="space-y-6">
          {error && <Alert tone="danger">{error}</Alert>}
          <SelectField
            label="Who is this letter for?"
            value={form.nomineeId}
            onChange={(e) => setForm({ ...form, nomineeId: e.target.value })}
            options={[{ value: '', label: 'Please choose…' }, ...people.map((n) => ({ value: n.id, label: `${n.name} (${n.relationship})` }))]}
          />
          <TextField label="Title" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} hint='For example: "For my dear Priya"' required />
          <TextField
            label="Your message"
            multiline
            rows={14}
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            hint="Take your time. You can come back and change it whenever you like."
            required
          />
          <Button type="submit" size="lg" variant="success" icon={Check} loading={busy}>Seal and save the letter</Button>
        </form>
      </Card>
    </>
  );
}
