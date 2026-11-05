import { useState } from 'react';
import { Upload, Download, Pencil, Trash2, FileText, AlertTriangle } from 'lucide-react';
import { useToast } from '../../context/ToastContext.jsx';
import { api, downloadFile } from '../../lib/api.js';
import { useApi } from '../../lib/useApi.js';
import { formatDate, formatSize, joinNames } from '../../lib/format.js';
import { DOCUMENT_CATEGORIES } from '../../lib/meta.js';
import { Alert, Button, Card, CheckboxList, EmptyState, ErrorState, Loading, PageHeader, SelectField, TextField } from '../../components/ui.jsx';
import { ConfirmDialog, Dialog } from '../../components/Dialog.jsx';

const CATEGORY_OPTIONS = [{ value: '', label: 'Please choose…' }].concat(
  Object.entries(DOCUMENT_CATEGORIES).map(([value, c]) => ({ value, label: c.label })),
);

function DocumentForm({ initial, people, onSubmit, submitLabel, withFile }) {
  const [form, setForm] = useState(initial);
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (withFile && !file) return setError('Please choose a file from your computer or phone.');
    if (withFile && file.size > 10 * 1024 * 1024) return setError('That file is larger than 10 MB. Please choose a smaller one.');
    if (!form.category) return setError('Please choose a document type.');
    setBusy(true);
    setError('');
    try {
      await onSubmit(form, file);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      {error && <Alert tone="danger">{error}</Alert>}
      {withFile && (
        <div className="space-y-1.5">
          <label htmlFor="doc-file" className="block text-lg font-bold">Choose the file</label>
          <p className="text-base text-muted">PDF, photo (JPG, PNG) or Word document, up to 10 MB. A clear phone photo of a paper is fine.</p>
          <input
            id="doc-file"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,.txt"
            onChange={(e) => {
              const f = e.target.files?.[0] || null;
              setFile(f);
              if (f && !form.title) setForm((x) => ({ ...x, title: f.name.replace(/\.[^.]+$/, '') }));
            }}
            className="block w-full cursor-pointer rounded-xl border-2 border-dashed border-[#8b95a5] bg-paper p-5 text-lg file:mr-4 file:min-h-12 file:cursor-pointer file:rounded-lg file:border-0 file:bg-brand file:px-5 file:font-bold file:text-white"
          />
        </div>
      )}
      <TextField label="Name of the document" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
      <SelectField label="Type of document" options={CATEGORY_OPTIONS} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
      <CheckboxList
        legend="Who should receive a copy?"
        options={people.map((n) => ({ value: n.id, label: n.name, description: n.relationship }))}
        value={form.nomineeIds}
        onChange={(v) => setForm({ ...form, nomineeIds: v })}
        emptyText="Add trusted people first to share this document."
      />
      <Button type="submit" size="lg" loading={busy} icon={withFile ? Upload : undefined} className="w-full sm:w-auto">{submitLabel}</Button>
    </form>
  );
}

export default function Documents() {
  const toast = useToast();
  const docs = useApi('/documents');
  const nominees = useApi('/nominees');
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  if (docs.loading || nominees.loading) return <Loading />;
  if (docs.error) return <ErrorState error={docs.error} onRetry={docs.reload} />;

  const people = nominees.data?.nominees || [];
  const nameOf = Object.fromEntries(people.map((n) => [n.id, n.name]));
  const list = docs.data.documents;

  const upload = async (form, file) => {
    const data = new FormData();
    data.append('title', form.title);
    data.append('category', form.category);
    data.append('nomineeIds', JSON.stringify(form.nomineeIds));
    data.append('file', file);
    await api('/documents', { method: 'POST', form: data });
    toast(`"${form.title}" was uploaded and locked safely.`);
    setUploading(false);
    docs.reload();
  };

  const update = async (form) => {
    await api(`/documents/${editing.id}`, { method: 'PUT', body: { title: form.title, category: form.category, nomineeIds: form.nomineeIds } });
    toast('The document was updated.');
    setEditing(null);
    docs.reload();
  };

  const remove = async () => {
    try {
      await api(`/documents/${deleting.id}`, { method: 'DELETE' });
      toast(`"${deleting.title}" was deleted.`);
      setDeleting(null);
      docs.reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const download = async (d) => {
    try {
      await downloadFile(`/documents/${d.id}/download`, d.originalName);
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <>
      <PageHeader
        title="Documents"
        intro="Keep copies of your will, property papers, policies and ID proofs. Every file is encrypted before it is stored."
        action={<Button icon={Upload} size="lg" onClick={() => setUploading(true)}>Upload a document</Button>}
      />

      {list.length === 0 ? (
        <EmptyState icon={FileText} title="No documents yet" action={<Button icon={Upload} size="lg" onClick={() => setUploading(true)}>Upload your first document</Button>}>
          A copy of your will or property papers is a good place to start.
        </EmptyState>
      ) : (
        <ul className="space-y-4">
          {list.map((d) => {
            const meta = DOCUMENT_CATEGORIES[d.category] || DOCUMENT_CATEGORIES.OTHER;
            const Icon = meta.icon;
            const recipients = d.nomineeIds.map((id) => nameOf[id]).filter(Boolean);
            return (
              <li key={d.id}>
                <Card as="article" className="flex flex-col gap-4 lg:flex-row lg:items-center">
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                    <Icon className="size-8" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-bold">{d.title}</h2>
                    <p className="text-base text-muted">
                      {meta.label} · {formatSize(d.size)} · added {formatDate(d.createdAt)}
                    </p>
                    {recipients.length > 0 ? (
                      <p className="text-lg"><strong>Shared with:</strong> {joinNames(recipients)}</p>
                    ) : (
                      <p className="flex items-center gap-2 text-lg font-bold text-warn"><AlertTriangle className="size-5" aria-hidden /> Not shared with anyone yet</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button variant="secondary" size="sm" icon={Download} onClick={() => download(d)}>Open</Button>
                    <Button variant="secondary" size="sm" icon={Pencil} onClick={() => setEditing(d)}>Change</Button>
                    <Button variant="quiet" size="sm" icon={Trash2} onClick={() => setDeleting(d)}>Delete</Button>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={uploading} onClose={() => setUploading(false)} title="Upload a document" wide>
        {uploading && (
          <DocumentForm initial={{ title: '', category: '', nomineeIds: [] }} people={people} onSubmit={upload} submitLabel="Upload and lock" withFile />
        )}
      </Dialog>

      <Dialog open={Boolean(editing)} onClose={() => setEditing(null)} title="Change document details" wide>
        {editing && (
          <DocumentForm
            initial={{ title: editing.title, category: editing.category, nomineeIds: editing.nomineeIds }}
            people={people}
            onSubmit={update}
            submitLabel="Save changes"
          />
        )}
      </Dialog>

      <ConfirmDialog open={Boolean(deleting)} onClose={() => setDeleting(null)} onConfirm={remove} title={`Delete "${deleting?.title}"?`} confirmLabel="Yes, delete" danger>
        <p>The file will be permanently deleted from your vault.</p>
      </ConfirmDialog>
    </>
  );
}
