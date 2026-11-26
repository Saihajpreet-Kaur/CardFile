import { ArchiveX, RotateCcw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { contactsApi } from '../api/endpoints';
import { Avatar, ConfirmDialog, EmptyState, ErrorBanner, PageHeader, Pagination, Spinner } from '../components/ui';
import { useToast } from '../context/ToastContext';
import { useApi } from '../hooks/useApi';
import { formatDate, fullName } from '../utils/format';

/** Trash page: restore soft-deleted contacts or delete them forever. */
export default function Trash() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const trash = useApi(() => contactsApi.list({ status: 'trash', page, limit: 20, sort: '-updatedAt' }), [page]);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const restore = async (contact) => {
    try {
      await contactsApi.restore(contact.id);
      toast.success(`${fullName(contact)} restored`);
      trash.reload();
    } catch (error) {
      toast.error(error);
    }
  };

  const destroy = async () => {
    setBusy(true);
    try {
      await contactsApi.destroy(deleting.id);
      toast.success(`${fullName(deleting)} permanently deleted`);
      trash.reload();
    } catch (error) {
      toast.error(error);
    }
    setBusy(false);
    setDeleting(null);
  };

  const rows = trash.data?.data ?? [];

  return (
    <>
      <PageHeader icon={Trash2} title="Trash" subtitle="Deleted contacts stay here until you restore them or delete them forever (soft delete)." />
      <ErrorBanner error={trash.error} onRetry={trash.reload} />

      <div className="card overflow-hidden">
        {trash.loading && !trash.data && <Spinner />}
        {trash.data && rows.length === 0 && <EmptyState icon={ArchiveX} title="The trash is empty" message="Contacts you delete will appear here." />}
        <ul className="divide-y divide-rule/60">
          {rows.map((contact) => (
            <li key={contact.id} className="row-hover flex animate-rise flex-wrap items-center gap-4 p-4">
              <Avatar contact={contact} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{fullName(contact)}</p>
                <p className="text-sm text-muted">
                  {contact.email || contact.phone} · deleted {formatDate(contact.deletedAt)}
                </p>
              </div>
              <button type="button" className="btn btn-secondary" onClick={() => restore(contact)}>
                <RotateCcw size={15} /> Restore
              </button>
              <button type="button" className="btn btn-danger" onClick={() => setDeleting(contact)}>
                <Trash2 size={15} /> Delete forever
              </button>
            </li>
          ))}
        </ul>
        {trash.data?.pagination.total > 0 && <Pagination pagination={trash.data.pagination} onPageChange={setPage} />}
      </div>

      {deleting && (
        <ConfirmDialog
          title="Delete forever?"
          message={`${fullName(deleting)} and their whole interaction history will be permanently deleted. This cannot be undone.`}
          confirmLabel="Delete forever"
          danger
          busy={busy}
          onClose={() => setDeleting(null)}
          onConfirm={destroy}
        />
      )}
    </>
  );
}
