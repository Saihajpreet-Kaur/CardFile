import { ArrowRight, Check, FolderKanban, FolderPlus, Pencil, Plus, Trash2, UsersRound } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { listsApi } from '../api/endpoints';
import { ConfirmDialog, EmptyState, ErrorBanner, Modal, PageHeader, Spinner } from '../components/ui';
import { useToast } from '../context/ToastContext';
import { useApi } from '../hooks/useApi';
import { LIST_DOTS } from '../utils/format';

const COLORS = Object.keys(LIST_DOTS);

function ListForm({ list, onSubmit, onCancel }) {
  const [values, setValues] = useState({ name: list?.name ?? '', description: list?.description ?? '', color: list?.color ?? 'blue' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!values.name.trim()) return setError('Give the list a name');
    setSaving(true);
    try {
      await onSubmit({ ...values, name: values.name.trim(), description: values.description.trim() });
    } catch (err) {
      setError(err.status === 409 ? 'You already have a list with this name' : err.message);
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <div>
        <label className="label" htmlFor="list-name">
          Name *
        </label>
        <input
          id="list-name"
          className={`input ${error ? 'input-error' : ''}`}
          maxLength={40}
          autoFocus
          value={values.name}
          onChange={(event) => {
            setValues({ ...values, name: event.target.value });
            setError('');
          }}
        />
        {error && <p className="field-error">{error}</p>}
      </div>
      <div>
        <label className="label" htmlFor="list-description">
          Description
        </label>
        <input id="list-description" className="input" maxLength={200} value={values.description} onChange={(event) => setValues({ ...values, description: event.target.value })} />
      </div>
      <div>
        <span className="label">Colour</span>
        <div className="flex gap-2">
          {COLORS.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={color}
              onClick={() => setValues({ ...values, color })}
              className={`flex size-8 items-center justify-center rounded-full text-white transition hover:scale-110 ${LIST_DOTS[color]} ${values.color === color ? 'ring-4 ring-brand-100 ring-offset-2' : ''}`}
            >
              {values.color === color && <Check size={15} strokeWidth={3} />}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-2 flex justify-end gap-2">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : list ? 'Save' : 'Create list'}
        </button>
      </div>
    </form>
  );
}

export default function Lists() {
  const toast = useToast();
  const lists = useApi(() => listsApi.list(), []);
  const [editing, setEditing] = useState(null); // null | 'new' | list
  const [deleting, setDeleting] = useState(null);

  const save = async (body) => {
    if (editing === 'new') await listsApi.create(body);
    else await listsApi.update(editing.id, body);
    toast.success(editing === 'new' ? 'List created' : 'List updated');
    setEditing(null);
    lists.reload();
  };

  return (
    <>
      <PageHeader
        icon={FolderKanban}
        title="Lists"
        subtitle="Group contacts your own way, e.g. “Key clients” or “Hiring network”. A contact can be in several lists."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>
            <Plus size={16} /> New list
          </button>
        }
      />
      <ErrorBanner error={lists.error} onRetry={lists.reload} />
      {lists.loading && !lists.data && <Spinner />}

      {lists.data?.length === 0 && (
        <div className="card">
          <EmptyState
            icon={FolderPlus}
            title="No lists yet"
            message="Create a list, then add contacts to it from the Contacts page (select rows) or a contact's page."
            action={
              <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>
                <Plus size={16} /> Create your first list
              </button>
            }
          />
        </div>
      )}

      <div className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {lists.data?.map((list) => (
          <div key={list.id} className="card spot group flex flex-col overflow-hidden">
            <div className={`h-1.5 ${LIST_DOTS[list.color]}`} />
            <div className="flex flex-1 flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <h2 className="flex items-center gap-2.5 text-lg font-bold">
                  <span className={`flex size-9 items-center justify-center rounded-xl text-white shadow-md ${LIST_DOTS[list.color]}`}>
                    <FolderKanban size={17} />
                  </span>
                  {list.name}
                </h2>
                <div className="flex gap-0.5 opacity-60 transition group-hover:opacity-100">
                  <button type="button" className="icon-btn" title="Edit" onClick={() => setEditing(list)}>
                    <Pencil size={16} />
                  </button>
                  <button type="button" className="icon-btn hover:bg-red-50 hover:text-danger" title="Delete" onClick={() => setDeleting(list)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              {list.description && <p className="mt-2 text-sm text-muted">{list.description}</p>}
              <div className="mt-5 flex items-end gap-2">
                <p className="text-4xl font-extrabold tracking-tight">{list.contactCount}</p>
                <p className="mb-1.5 flex items-center gap-1 text-sm text-muted">
                  <UsersRound size={14} /> contact{list.contactCount === 1 ? '' : 's'}
                </p>
              </div>
              <Link to={`/contacts?list=${list.id}`} className="group/link mt-5 inline-flex items-center gap-1 text-sm font-semibold text-brand-600">
                View contacts <ArrowRight size={15} className="transition group-hover/link:translate-x-1" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <Modal title={editing === 'new' ? 'New list' : `Edit “${editing.name}”`} onClose={() => setEditing(null)}>
          <ListForm list={editing === 'new' ? null : editing} onSubmit={save} onCancel={() => setEditing(null)} />
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          title={`Delete “${deleting.name}”?`}
          message="The list is deleted. Its contacts are NOT deleted - they are only removed from this list."
          confirmLabel="Delete list"
          danger
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            try {
              await listsApi.remove(deleting.id);
              toast.success('List deleted');
              lists.reload();
            } catch (error) {
              toast.error(error);
            }
            setDeleting(null);
          }}
        />
      )}
    </>
  );
}
