import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Camera,
  Check,
  Handshake,
  Mail,
  Pencil,
  Phone,
  Plus,
  RotateCcw,
  Star,
  StickyNote,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { contactsApi, interactionsApi, listsApi } from '../api/endpoints';
import ContactForm from '../components/ContactForm';
import { Avatar, ConfirmDialog, EmptyState, ErrorBanner, Modal, ProgressBar, Spinner, TagChips } from '../components/ui';
import { useToast } from '../context/ToastContext';
import { useApi } from '../hooks/useApi';
import { followUpState, formatDate, formatDateTime, fullName, LIST_COLORS, relativeDay, toDateInput } from '../utils/format';

const TYPES = [
  { value: 'call', label: 'Call', icon: Phone, dot: 'from-sky-400 to-blue-600' },
  { value: 'email', label: 'Email', icon: Mail, dot: 'from-violet-400 to-violet-600' },
  { value: 'meeting', label: 'Meeting', icon: Handshake, dot: 'from-emerald-400 to-emerald-600' },
];
const TYPE = Object.fromEntries(TYPES.map((type) => [type.value, type]));
const FOLLOW_UP_STYLE = {
  overdue: 'bg-red-100 text-red-700',
  today: 'bg-amber-100 text-amber-800',
  upcoming: 'bg-emerald-100 text-emerald-700',
};
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

function InteractionForm({ onAdd }) {
  const [form, setForm] = useState({ type: 'call', note: '', date: toDateInput(), followUpDate: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!form.note.trim()) return setError('Write a short note about the interaction');
    setSaving(true);
    setError('');
    try {
      // A date input gives "2026-11-23"; turn it into a local time so it doesn't show as 5:30 AM (UTC midnight)
      const date = form.date === toDateInput() ? new Date() : new Date(`${form.date}T12:00`);
      await onAdd({
        type: form.type,
        note: form.note.trim(),
        date: date.toISOString(),
        followUpDate: form.followUpDate ? new Date(`${form.followUpDate}T09:00`).toISOString() : undefined,
      });
      setForm((previous) => ({ ...previous, note: '', followUpDate: '' }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="card p-6">
      <h2 className="mb-4 font-bold">Log an interaction</h2>
      <div className="mb-3 inline-flex gap-1 rounded-xl bg-brand-50/80 p-1" role="group" aria-label="Interaction type">
        {TYPES.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            aria-pressed={form.type === value}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              form.type === value ? 'bg-white text-brand-700 shadow-sm' : 'text-muted hover:text-ink'
            }`}
            onClick={() => setForm((previous) => ({ ...previous, type: value }))}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>
      <textarea
        className={`input ${error ? 'input-error' : ''}`}
        rows={3}
        maxLength={1000}
        placeholder="What happened?"
        value={form.note}
        onChange={(event) => setForm((previous) => ({ ...previous, note: event.target.value }))}
      />
      {error && <p className="field-error">{error}</p>}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="label">Date</span>
          <input type="date" className="input" value={form.date} onChange={(event) => setForm((previous) => ({ ...previous, date: event.target.value }))} />
        </label>
        <label className="text-sm">
          <span className="label">Follow up on (optional)</span>
          <input
            type="date"
            className="input"
            value={form.followUpDate}
            min={toDateInput()}
            onChange={(event) => setForm((previous) => ({ ...previous, followUpDate: event.target.value }))}
          />
        </label>
      </div>
      <button type="submit" className="btn btn-primary mt-4" disabled={saving}>
        <Plus size={16} /> {saving ? 'Saving…' : 'Add to timeline'}
      </button>
    </form>
  );
}

function DetailRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
        <Icon size={15} />
      </span>
      <div className="min-w-0">
        <dt className="text-xs font-semibold text-faint">{label}</dt>
        <dd className="truncate text-sm font-medium">{children}</dd>
      </div>
    </div>
  );
}

export default function ContactDetail() {
  const { id } = useParams(); // route parameter from /contacts/:id
  const navigate = useNavigate();
  const toast = useToast();

  const contact = useApi(() => contactsApi.get(id), [id]);
  const interactions = useApi(() => interactionsApi.list(id), [id]);
  const lists = useApi(() => listsApi.list(), []);

  const [editing, setEditing] = useState(false);
  const [confirmTrash, setConfirmTrash] = useState(false);
  const [upload, setUpload] = useState(null); // null or a percentage 0-100
  const [timelineFilter, setTimelineFilter] = useState('all');
  const fileInput = useRef(null);

  if (contact.loading && !contact.data) return <Spinner />;
  if (contact.error) {
    return (
      <div className="flex flex-col gap-4">
        <ErrorBanner error={contact.error} />
        <Link to="/contacts" className="btn btn-secondary self-start">
          <ArrowLeft size={16} /> Back to contacts
        </Link>
      </div>
    );
  }

  const person = contact.data;
  const inTrash = person.isDeleted;
  const memberOf = new Set((person.lists ?? []).map((list) => list.id));
  const shown = (interactions.data ?? []).filter((item) => timelineFilter === 'all' || item.type === timelineFilter);

  const run = async (action, successMessage) => {
    try {
      await action();
      if (successMessage) toast.success(successMessage);
    } catch (error) {
      toast.error(error);
    }
  };

  const uploadPhoto = async (event) => {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return toast.error('Choose a JPEG, PNG or WEBP image');
    if (file.size > MAX_PHOTO_BYTES) return toast.error('The photo must be smaller than 2 MB');

    setUpload(0);
    await run(async () => {
      const updated = await contactsApi.uploadPhoto(id, file, setUpload);
      contact.setData((previous) => ({ ...previous, photoUrl: updated.photoUrl }));
    }, 'Photo updated');
    setUpload(null);
  };

  const toggleList = (listId) =>
    run(async () => {
      await listsApi.changeMembers(listId, memberOf.has(listId) ? 'remove' : 'add', [id]);
      await contact.reload();
    });

  return (
    <>
      <Link to="/contacts" className="group mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition hover:text-brand-700">
        <ArrowLeft size={16} className="transition group-hover:-translate-x-1" /> Back to contacts
      </Link>

      {inTrash && (
        <div className="mb-4 flex animate-pop items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm font-medium text-amber-900">
          <span className="flex items-center gap-2">
            <Trash2 size={16} /> This contact is in the trash.
          </span>
          <button
            type="button"
            className="btn btn-secondary py-1.5"
            onClick={() =>
              run(async () => {
                await contactsApi.restore(id);
                await contact.reload();
              }, 'Contact restored')
            }
          >
            <RotateCcw size={15} /> Restore
          </button>
        </div>
      )}

      <div className="stagger grid gap-6 lg:grid-cols-3">
        {/* Contact card */}
        <section className="card h-fit overflow-hidden">
          {/* Gradient header with the index-card red margin line */}
          <div className="relative h-24 bg-gradient-to-br from-brand-500 via-brand-600 to-violet-600">
            <div className="absolute inset-x-0 bottom-0 h-1 bg-danger/80" />
            {!inTrash && (
              <div className="absolute top-3 right-3 flex gap-1">
                <button
                  type="button"
                  className="flex size-9 items-center justify-center rounded-xl bg-white/15 text-white backdrop-blur transition hover:bg-white/25"
                  title={person.isFavourite ? 'Remove from favourites' : 'Add to favourites'}
                  onClick={() => run(async () => contact.setData({ ...person, ...(await contactsApi.toggleFavourite(id)), lists: person.lists }))}
                >
                  <Star size={17} className={person.isFavourite ? 'fill-amber-300 text-amber-300' : ''} />
                </button>
                <button type="button" className="flex size-9 items-center justify-center rounded-xl bg-white/15 text-white backdrop-blur transition hover:bg-white/25" title="Edit" onClick={() => setEditing(true)}>
                  <Pencil size={16} />
                </button>
                <button type="button" className="flex size-9 items-center justify-center rounded-xl bg-white/15 text-white backdrop-blur transition hover:bg-red-500/80" title="Move to trash" onClick={() => setConfirmTrash(true)}>
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>

          <div className="px-6 pb-6">
            <div className="relative -mt-12 mb-3 w-fit">
              <Avatar contact={person} size="size-24 ring-4" text="text-3xl" />
              {!inTrash && (
                <button
                  type="button"
                  className="absolute right-0 bottom-0 flex size-8 items-center justify-center rounded-full border border-rule bg-white text-muted shadow-md transition hover:scale-110 hover:text-brand-700"
                  onClick={() => fileInput.current.click()}
                  title="Upload photo"
                >
                  <Camera size={15} />
                </button>
              )}
              <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={uploadPhoto} />
            </div>

            {upload !== null && (
              <div className="mb-3">
                <ProgressBar value={upload} />
                <p className="mt-1 text-xs text-muted">Uploading… {upload}%</p>
              </div>
            )}

            <h1 className="text-2xl font-extrabold tracking-tight">{fullName(person)}</h1>
            <p className="text-sm text-muted">{person.designation || 'No designation'}</p>

            <dl className="mt-6 flex flex-col gap-4">
              <DetailRow icon={Mail} label="Email">
                {person.email ? <a className="text-brand-600 hover:underline" href={`mailto:${person.email}`}>{person.email}</a> : '—'}
              </DetailRow>
              <DetailRow icon={Phone} label="Phone">
                {person.phone ? <a className="text-brand-600 hover:underline" href={`tel:${person.phone}`}>{person.phone}</a> : '—'}
              </DetailRow>
              <DetailRow icon={Building2} label="Company">
                {person.company || '—'}
              </DetailRow>
              <DetailRow icon={CalendarDays} label="Added">
                {formatDate(person.createdAt)}
              </DetailRow>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <Tag size={15} />
                </span>
                <div>
                  <dt className="mb-1 text-xs font-semibold text-faint">Tags</dt>
                  <dd>
                    <TagChips tags={person.tags} onClick={(tag) => navigate(`/contacts?tag=${encodeURIComponent(tag)}`)} />
                  </dd>
                </div>
              </div>
            </dl>

            {person.notes && (
              <div className="mt-5 rounded-xl border-l-4 border-manila bg-amber-50/70 p-3 text-sm whitespace-pre-wrap">
                <p className="mb-1 flex items-center gap-1.5 text-xs font-bold text-amber-800">
                  <StickyNote size={13} /> Notes
                </p>
                {person.notes}
              </div>
            )}

            <div className="mt-6">
              <h2 className="mb-2 text-[11px] font-bold tracking-wider text-faint uppercase">Lists</h2>
              {(lists.data ?? []).length === 0 ? (
                <p className="text-sm text-muted">
                  No lists yet.{' '}
                  <Link to="/lists" className="font-semibold text-brand-600">
                    Create one
                  </Link>
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {lists.data.map((list) => {
                    const member = memberOf.has(list.id);
                    return (
                      <button
                        key={list.id}
                        type="button"
                        disabled={inTrash}
                        onClick={() => toggleList(list.id)}
                        className={`chip py-1 ${member ? LIST_COLORS[list.color] : 'border border-dashed border-rule bg-white/70 text-muted hover:border-brand-200 hover:text-brand-700'}`}
                        title={member ? 'Remove from list' : 'Add to list'}
                      >
                        {member ? <Check size={12} /> : <Plus size={12} />} {list.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Interactions */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {!inTrash && (
            <InteractionForm
              onAdd={async (body) => {
                const created = await interactionsApi.add(id, body);
                interactions.setData((items) => [created, ...(items ?? [])].sort((a, b) => new Date(b.date) - new Date(a.date)));
                toast.success('Interaction added');
              }}
            />
          )}

          <section className="card p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-bold">
                Timeline <span className="text-muted">({interactions.data?.length ?? 0})</span>
              </h2>
              <div className="inline-flex gap-1 rounded-xl bg-brand-50/80 p-1">
                {['all', ...TYPES.map((type) => type.value)].map((value) => {
                  const Icon = TYPE[value]?.icon;
                  return (
                    <button
                      key={value}
                      type="button"
                      className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition ${
                        timelineFilter === value ? 'bg-white text-brand-700 shadow-sm' : 'text-muted hover:text-ink'
                      }`}
                      onClick={() => setTimelineFilter(value)}
                    >
                      {Icon && <Icon size={13} />}
                      {value}
                    </button>
                  );
                })}
              </div>
            </div>

            <ErrorBanner error={interactions.error} onRetry={interactions.reload} />
            {interactions.loading && !interactions.data && <Spinner />}
            {interactions.data && shown.length === 0 && (
              <EmptyState icon={CalendarDays} title="No interactions yet" message="Log a call, email or meeting above to start the timeline." />
            )}

            <ol className="relative">
              {shown.map((item, index) => {
                const { icon: Icon, dot } = TYPE[item.type];
                return (
                  <li key={item.id} className="group relative flex animate-rise gap-4 pb-6" style={{ animationDelay: `${index * 50}ms` }}>
                    {/* Vertical line connecting the timeline dots */}
                    {index < shown.length - 1 && <span className="absolute top-10 bottom-0 left-[17px] w-px bg-gradient-to-b from-rule to-transparent" />}
                    <span className={`relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-white shadow-md ${dot}`}>
                      <Icon size={16} />
                    </span>
                    <div className="flex-1 rounded-xl border border-transparent p-3 transition group-hover:border-rule group-hover:bg-white/70">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold capitalize">
                          {item.type} <span className="font-medium text-faint normal-case">· {formatDateTime(item.date)}</span>
                        </p>
                        {!inTrash && (
                          <button
                            type="button"
                            className="icon-btn size-7 opacity-0 transition group-hover:opacity-100 hover:bg-red-50 hover:text-danger"
                            title="Delete interaction"
                            onClick={() =>
                              run(async () => {
                                await interactionsApi.remove(id, item.id);
                                interactions.setData((items) => items.filter((other) => other.id !== item.id));
                              }, 'Interaction deleted')
                            }
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                      <p className="mt-1 text-sm whitespace-pre-wrap text-ink/90">{item.note}</p>
                      {item.followUpDate && (
                        <div className="mt-2 flex items-center gap-2 text-xs">
                          {item.followUpDone ? (
                            <span className="chip bg-slate-100 text-muted line-through">Follow-up {formatDate(item.followUpDate)}</span>
                          ) : (
                            <span className={`chip ${FOLLOW_UP_STYLE[followUpState(item.followUpDate)]}`}>
                              <CalendarDays size={12} /> Follow up {relativeDay(item.followUpDate)}
                            </span>
                          )}
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:text-brand-700"
                            onClick={() =>
                              run(async () => {
                                const updated = await interactionsApi.setFollowUpDone(id, item.id, !item.followUpDone);
                                interactions.setData((items) => items.map((other) => (other.id === updated.id ? updated : other)));
                              })
                            }
                          >
                            {item.followUpDone ? (
                              <>
                                <RotateCcw size={12} /> Reopen
                              </>
                            ) : (
                              <>
                                <Check size={13} /> Mark done
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>
      </div>

      {editing && (
        <Modal title={`Edit ${fullName(person)}`} onClose={() => setEditing(false)} wide>
          <ContactForm
            contact={person}
            onCancel={() => setEditing(false)}
            onSubmit={async (body) => {
              await contactsApi.update(id, body);
              await contact.reload();
              setEditing(false);
              toast.success('Contact updated');
            }}
          />
        </Modal>
      )}

      {confirmTrash && (
        <ConfirmDialog
          title="Move to trash?"
          message={`${fullName(person)} will move to the trash. You can restore them from the Trash page.`}
          confirmLabel="Move to trash"
          danger
          onClose={() => setConfirmTrash(false)}
          onConfirm={() =>
            run(async () => {
              await contactsApi.trash(id);
              navigate('/contacts');
            }, `${fullName(person)} moved to trash`)
          }
        />
      )}
    </>
  );
}
