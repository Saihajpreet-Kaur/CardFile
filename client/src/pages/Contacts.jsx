import { ArrowDown, ArrowUp, Download, FolderKanban, Pencil, Plus, Search, SearchX, Star, Trash2, Upload, UsersRound, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { contactsApi, listsApi } from '../api/endpoints';
import ContactForm from '../components/ContactForm';
import { Avatar, EmptyState, ErrorBanner, Modal, PageHeader, Pagination, SkeletonRows, TagChips } from '../components/ui';
import { useToast } from '../context/ToastContext';
import { useApi } from '../hooks/useApi';
import { useDebounce } from '../hooks/useDebounce';
import { fullName, LIST_DOTS } from '../utils/format';

const DEFAULTS = { search: '', tag: '', list: '', favourite: '', sort: '-createdAt', page: '1', limit: '10' };
const PAGE_SIZES = ['10', '20', '50'];

const COLUMNS = [
  { key: 'firstName', label: 'Name' },
  { key: 'company', label: 'Company' },
  { key: null, label: 'Phone' },
  { key: null, label: 'Tags' },
  { key: 'createdAt', label: 'Added' },
];

/** Reads the filters from the URL, so a refresh, the Back button and shared links keep the same view. */
function useListParams() {
  const [searchParams, setSearchParams] = useSearchParams();
  const params = Object.fromEntries(Object.keys(DEFAULTS).map((key) => [key, searchParams.get(key) ?? DEFAULTS[key]]));

  const update = useCallback(
    (changes) => {
      const current = Object.fromEntries(Object.keys(DEFAULTS).map((key) => [key, searchParams.get(key) ?? DEFAULTS[key]]));
      const next = { ...current, ...changes };
      // Any filter change sends the user back to page 1
      if (!('page' in changes)) next.page = '1';
      const entries = Object.entries(next).filter(([key, value]) => value !== DEFAULTS[key] && value !== '');
      setSearchParams(Object.fromEntries(entries), { replace: 'search' in changes });
    },
    [searchParams, setSearchParams],
  );

  return [params, update];
}

export default function Contacts() {
  const [params, update] = useListParams();
  const navigate = useNavigate();
  const toast = useToast();

  // The search box updates immediately; the URL (and the API call) only after typing pauses
  const [searchText, setSearchText] = useState(params.search);
  const debouncedSearch = useDebounce(searchText, 350);
  const syncedSearch = useRef(params.search); // the last value the box and the URL agreed on

  // The URL changed from outside (top-bar quick search, Back button, a tag link): show it in the box
  useEffect(() => {
    if (params.search !== syncedSearch.current) {
      syncedSearch.current = params.search;
      setSearchText(params.search);
    }
  }, [params.search]);

  // Typing paused: put the box's text in the URL, which loads the results
  useEffect(() => {
    if (debouncedSearch !== syncedSearch.current) {
      syncedSearch.current = debouncedSearch;
      update({ search: debouncedSearch });
    }
  }, [debouncedSearch, update]);

  const query = { ...params, status: 'active' };
  const contacts = useApi(() => contactsApi.list(query), [JSON.stringify(query)]);
  const tags = useApi(() => contactsApi.tags(), []);
  const lists = useApi(() => listsApi.list(), []);

  const [selected, setSelected] = useState([]);
  const [editing, setEditing] = useState(null); // null | 'new' | contact
  const [exporting, setExporting] = useState(false);

  useEffect(() => setSelected([]), [contacts.data]);

  const rows = contacts.data?.data ?? [];
  const pagination = contacts.data?.pagination;
  const allSelected = rows.length > 0 && selected.length === rows.length;

  const toggleSort = (key) => update({ sort: params.sort === key ? `-${key}` : key });
  const sortMark = (key) =>
    params.sort === key ? <ArrowUp size={13} /> : params.sort === `-${key}` ? <ArrowDown size={13} /> : null;

  const refreshAll = () => {
    contacts.reload();
    tags.reload();
    lists.reload();
  };

  const save = async (body) => {
    if (editing === 'new') {
      const created = await contactsApi.create(body);
      toast.success(`${fullName(created)} added`);
    } else {
      await contactsApi.update(editing.id, body);
      toast.success('Contact updated');
    }
    setEditing(null);
    refreshAll();
  };

  const toggleFavourite = async (contact) => {
    try {
      const updated = await contactsApi.toggleFavourite(contact.id);
      contacts.setData((data) => ({ ...data, data: data.data.map((item) => (item.id === updated.id ? updated : item)) }));
    } catch (error) {
      toast.error(error);
    }
  };

  const moveToTrash = async (ids) => {
    try {
      await Promise.all(ids.map((id) => contactsApi.trash(id)));
      refreshAll();
      toast.success(`${ids.length} contact(s) moved to trash`, {
        label: 'Undo',
        onClick: async () => {
          await Promise.all(ids.map((id) => contactsApi.restore(id)));
          refreshAll();
        },
      });
    } catch (error) {
      toast.error(error);
    }
  };

  const changeListMembers = async (listId, action) => {
    try {
      const result = await listsApi.changeMembers(listId, action, selected);
      toast.success(`${result.changed} contact(s) ${action === 'add' ? 'added to' : 'removed from'} the list`);
      refreshAll();
    } catch (error) {
      toast.error(error);
    }
  };

  const exportView = async () => {
    setExporting(true);
    try {
      const { page: _page, limit: _limit, ...filters } = query;
      await contactsApi.exportCsv(filters);
    } catch (error) {
      toast.error(error);
    } finally {
      setExporting(false);
    }
  };

  const filtersActive = params.search || params.tag || params.list || params.favourite;

  return (
    <>
      <PageHeader
        icon={UsersRound}
        title="Contacts"
        subtitle={pagination ? `${pagination.total} contact${pagination.total === 1 ? '' : 's'}${filtersActive ? ' match your filters' : ''}` : ' '}
        actions={
          <>
            <button type="button" className="btn btn-secondary" onClick={exportView} disabled={exporting}>
              <Download size={16} /> {exporting ? 'Exporting…' : 'Export view'}
            </button>
            <Link to="/import" className="btn btn-secondary">
              <Upload size={16} /> Import
            </Link>
            <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>
              <Plus size={16} /> New contact
            </button>
          </>
        }
      />

      {/* Filters */}
      <div className="card mb-4 flex flex-wrap items-center gap-2 p-3">
        <div className="group relative w-full sm:w-72">
          <Search size={16} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-faint transition group-focus-within:text-brand-600" />
          <input
            type="search"
            className="input pl-10"
            placeholder="Search name, email, phone, company…"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            aria-label="Search contacts"
          />
        </div>
        <select className="input w-auto" value={params.tag} onChange={(event) => update({ tag: event.target.value })} aria-label="Filter by tag">
          <option value="">All tags</option>
          {(tags.data ?? []).map((row) => (
            <option key={row.tag} value={row.tag}>
              #{row.tag} ({row.count})
            </option>
          ))}
        </select>
        <select className="input w-auto" value={params.list} onChange={(event) => update({ list: event.target.value })} aria-label="Filter by list">
          <option value="">All lists</option>
          {(lists.data ?? []).map((list) => (
            <option key={list.id} value={list.id}>
              {list.name} ({list.contactCount})
            </option>
          ))}
        </select>
        <button
          type="button"
          aria-pressed={params.favourite === 'true'}
          onClick={() => update({ favourite: params.favourite === 'true' ? '' : 'true' })}
          className={`btn ${params.favourite === 'true' ? 'bg-amber-100 text-amber-800 ring-1 ring-amber-300' : 'btn-secondary'}`}
        >
          <Star size={15} className={params.favourite === 'true' ? 'fill-amber-400 text-amber-500' : ''} /> Favourites
        </button>
        {filtersActive && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setSearchText('');
              update({ search: '', tag: '', list: '', favourite: '' });
            }}
          >
            <X size={15} /> Clear filters
          </button>
        )}
      </div>

      {/* Bulk actions for selected rows */}
      {selected.length > 0 && (
        <div className="mb-3 flex animate-pop flex-wrap items-center gap-2 rounded-xl border border-brand-200 bg-brand-50/90 px-4 py-2 text-sm backdrop-blur">
          <b className="flex items-center gap-1.5">
            <FolderKanban size={16} className="text-brand-600" /> {selected.length} selected
          </b>
          <select
            className="input w-auto py-1"
            value=""
            onChange={(event) => {
              const [action, listId] = event.target.value.split(':');
              if (listId) changeListMembers(listId, action);
            }}
            aria-label="Add selected to a list"
          >
            <option value="">Add to / remove from list…</option>
            {(lists.data ?? []).map((list) => (
              <optgroup key={list.id} label={list.name}>
                <option value={`add:${list.id}`}>Add to “{list.name}”</option>
                <option value={`remove:${list.id}`}>Remove from “{list.name}”</option>
              </optgroup>
            ))}
          </select>
          <button type="button" className="btn btn-danger py-1" onClick={() => moveToTrash(selected)}>
            <Trash2 size={15} /> Move to trash
          </button>
          <button type="button" className="btn btn-ghost py-1" onClick={() => setSelected([])}>
            Clear selection
          </button>
        </div>
      )}

      <ErrorBanner error={contacts.error} onRetry={contacts.reload} />

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-rule/70 bg-white/50">
              <tr>
                <th className="th w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => setSelected(allSelected ? [] : rows.map((row) => row.id))}
                    aria-label="Select all on this page"
                  />
                </th>
                {COLUMNS.map((column) => (
                  <th key={column.label} className="th">
                    {column.key ? (
                      <button type="button" className="flex items-center gap-1 uppercase transition hover:text-ink" onClick={() => toggleSort(column.key)}>
                        {column.label} <span className="text-brand-600">{sortMark(column.key)}</span>
                      </button>
                    ) : (
                      column.label
                    )}
                  </th>
                ))}
                <th className="th w-24" />
              </tr>
            </thead>
            <tbody className={`divide-y divide-rule/60 transition-opacity ${contacts.loading ? 'opacity-50' : ''}`}>
              {rows.map((contact) => (
                <tr key={contact.id} className="row-hover group cursor-pointer" onClick={() => navigate(`/contacts/${contact.id}`)}>
                  <td className="td" onClick={(event) => event.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.includes(contact.id)}
                      onChange={() =>
                        setSelected((ids) => (ids.includes(contact.id) ? ids.filter((id) => id !== contact.id) : [...ids, contact.id]))
                      }
                      aria-label={`Select ${fullName(contact)}`}
                    />
                  </td>
                  <td className="td">
                    <div className="flex items-center gap-3">
                      <Avatar contact={contact} />
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 font-semibold transition group-hover:text-brand-700">
                          {fullName(contact)} {contact.isFavourite && <Star size={13} className="fill-amber-400 text-amber-400" />}
                        </p>
                        <p className="truncate text-xs text-muted">{contact.email || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="td">
                    <p>{contact.company || '—'}</p>
                    <p className="text-xs text-muted">{contact.designation}</p>
                  </td>
                  <td className="td whitespace-nowrap">{contact.phone || '—'}</td>
                  <td className="td" onClick={(event) => event.stopPropagation()}>
                    <TagChips tags={contact.tags} onClick={(tag) => update({ tag })} />
                  </td>
                  <td className="td whitespace-nowrap text-muted">
                    {new Date(contact.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </td>
                  <td className="td" onClick={(event) => event.stopPropagation()}>
                    <div className="flex justify-end gap-0.5">
                      <button type="button" className="icon-btn" title={contact.isFavourite ? 'Remove from favourites' : 'Add to favourites'} onClick={() => toggleFavourite(contact)}>
                        <Star size={16} className={contact.isFavourite ? 'fill-amber-400 text-amber-500' : ''} />
                      </button>
                      <button type="button" className="icon-btn" title="Edit" onClick={() => setEditing(contact)}>
                        <Pencil size={16} />
                      </button>
                      <button type="button" className="icon-btn hover:bg-red-50 hover:text-danger" title="Move to trash" onClick={() => moveToTrash([contact.id])}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!contacts.loading && rows.length === 0 && (
          <EmptyState
            icon={filtersActive ? SearchX : UsersRound}
            title={filtersActive ? 'No contacts match your filters' : 'Your cardfile is empty'}
            message={filtersActive ? 'Try a different search or clear the filters.' : 'Add your first contact or import a CSV file.'}
            action={
              !filtersActive && (
                <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>
                  <Plus size={16} /> Add a contact
                </button>
              )
            }
          />
        )}
        {contacts.loading && rows.length === 0 && <SkeletonRows rows={6} />}

        {pagination && (
          <div className="flex flex-wrap items-center justify-between">
            <div className="flex-1">
              <Pagination pagination={pagination} onPageChange={(page) => update({ page: String(page) })} />
            </div>
            <label className="flex items-center gap-2 px-4 py-3 text-sm text-muted">
              Per page
              <select className="input w-auto py-1" value={params.limit} onChange={(event) => update({ limit: event.target.value })}>
                {PAGE_SIZES.map((size) => (
                  <option key={size}>{size}</option>
                ))}
              </select>
            </label>
          </div>
        )}
      </div>

      {lists.data?.length > 0 && (
        <p className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted">
          Lists:
          {lists.data.map((list) => (
            <button key={list.id} type="button" className="flex items-center gap-1 hover:text-ink" onClick={() => update({ list: list.id })}>
              <span className={`size-2 rounded-full ${LIST_DOTS[list.color]}`} />
              {list.name}
            </button>
          ))}
        </p>
      )}

      {editing && (
        <Modal title={editing === 'new' ? 'New contact' : `Edit ${fullName(editing)}`} onClose={() => setEditing(null)} wide>
          <ContactForm contact={editing === 'new' ? null : editing} onSubmit={save} onCancel={() => setEditing(null)} />
        </Modal>
      )}
    </>
  );
}
