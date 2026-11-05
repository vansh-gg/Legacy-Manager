import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, UserPlus } from 'lucide-react';
import { useToast } from '../../context/ToastContext.jsx';
import { api } from '../../lib/api.js';
import { RELATIONSHIPS } from '../../lib/meta.js';
import { Alert, Button, Card, Loading, PageHeader, TextField } from '../../components/ui.jsx';

export default function NomineeForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({ name: '', relationship: '', email: '', phone: '' });
  const [loading, setLoading] = useState(editing);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!editing) return;
    api('/nominees')
      .then(({ nominees }) => {
        const n = nominees.find((x) => x.id === id);
        if (!n) throw new Error('We could not find that person.');
        setForm({ name: n.name, relationship: n.relationship, email: n.email, phone: n.phone || '' });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [editing, id]);

  if (loading) return <Loading />;
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (editing) {
        await api(`/nominees/${id}`, { method: 'PUT', body: { name: form.name, relationship: form.relationship, phone: form.phone } });
        toast(`${form.name}'s details were updated.`);
      } else {
        await api('/nominees', { method: 'POST', body: form });
        toast(`${form.name} was added and an invitation email was sent.`);
      }
      navigate('/app/nominees');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title={editing ? `Change ${form.name}'s details` : 'Add a trusted person'}
        back={{ to: '/app/nominees', label: 'Back to trusted people' }}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <form onSubmit={submit} className="space-y-6">
            {error && <Alert tone="danger">{error}</Alert>}
            <TextField label="Their full name" value={form.name} onChange={set('name')} required autoFocus />
            <TextField
              label="How are they related to you?"
              value={form.relationship}
              onChange={set('relationship')}
              list="relationships"
              hint="For example: Daughter, Son, Wife, Friend"
              required
            />
            <datalist id="relationships">
              {RELATIONSHIPS.map((r) => <option key={r} value={r} />)}
            </datalist>
            <TextField
              label="Their email address"
              type="email"
              value={form.email}
              onChange={set('email')}
              readOnly={editing}
              hint={editing ? 'The email address cannot be changed. Remove and add the person again if needed.' : 'The invitation will be sent here.'}
              required
            />
            <TextField label="Their mobile number" type="tel" value={form.phone} onChange={set('phone')} optional />
            <Button type="submit" size="lg" icon={editing ? Check : UserPlus} loading={busy} className="w-full sm:w-auto">
              {editing ? 'Save changes' : 'Add and send invitation'}
            </Button>
          </form>
        </Card>
        {!editing && (
          <Card className="h-fit bg-brand-soft border-brand/30">
            <h2 className="text-xl font-bold">What happens next?</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-6 text-lg">
              <li>We email them an invitation explaining your wishes.</li>
              <li>They accept by creating their own account.</li>
              <li>They see <strong>nothing</strong> of yours unless your vault is released.</li>
            </ol>
          </Card>
        )}
      </div>
    </>
  );
}
