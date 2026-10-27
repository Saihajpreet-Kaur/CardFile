
import {
  $,
  $$,
  DATA_CHANGED,
  avatar,
  clearFieldErrors,
  daysFromToday,
  esc,
  formatDate,
  formatDateTime,
  formatLongDate,
  formatPhone,
  fullName,
  icon,
  notifyDataChanged,
  relativeDay,
  showFieldErrors,
  todayInputValue,
  withBusy,
} from './shared.js';
import { api, navigate } from './core.js';
import { confirmDialog, mountPage, refreshSidebar, toast, toastError } from './ui.js';
import { openContactForm } from './contacts.js';



const TYPES = {
  call: { label: 'Call', plural: 'Calls', icon: 'phone', tint: 'bg-accent/10 text-accent', placeholder: 'What happened on this call?' },
  email: { label: 'Email', plural: 'Emails', icon: 'mail', tint: 'bg-leaf/10 text-leaf', placeholder: 'What was the email about?' },
  meeting: { label: 'Meeting', plural: 'Meetings', icon: 'meeting', tint: 'bg-manila/15 text-manila', placeholder: 'What did you discuss?' },
};

const DASH = '<span class="text-faint">—</span>';

function describeFollowUp(iso) {
  const days = daysFromToday(iso);
  if (days < 0) {
    const when = days === -1 ? 'yesterday' : days > -7 ? `${-days} days ago` : `on ${formatDate(iso)}`;
    return { text: `Follow-up was due ${when}`, short: relativeDay(iso), tone: 'danger' };
  }
  if (days === 0) return { text: 'Follow up today', short: 'Today', tone: 'manila' };
  return { text: `Follow up ${days === 1 ? 'tomorrow' : days < 7 ? `in ${days} days` : `on ${formatDate(iso)}`}`, short: relativeDay(iso), tone: 'muted' };
}

const TONES = {
  danger: 'bg-danger/10 text-danger',
  manila: 'bg-manila/15 text-manila',
  muted: 'bg-well text-muted',
};


function dateInputToIso(value) {
  const now = new Date();
  const date = new Date(`${value}T00:00`);
  date.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
  return date.toISOString();
}



function detailRow(iconName, label, value) {
  return `
    <div class="flex gap-3 py-3">
      ${icon(iconName, { size: 16, className: 'mt-0.5 text-faint' })}
      <div class="min-w-0">
        <dt class="text-xs text-muted">${label}</dt>
        <dd class="mt-0.5 break-words">${value || DASH}</dd>
      </div>
    </div>`;
}

function cardSection(contact) {
  const deleted = contact.isDeleted;
  const subtitle = [
    contact.designation && esc(contact.designation),
    contact.company && `<b class="font-semibold text-ink">${esc(contact.company)}</b>`,
  ]
    .filter(Boolean)
    .join(' at ');

  return `
    <section class="index-card">
      <div class="p-6">
        <div class="flex items-start justify-between gap-3">
          <div class="relative">
            ${avatar({ contact, size: 'xl' })}
            ${
              deleted
                ? ''
                : `<label class="absolute -bottom-1.5 -right-1.5 grid h-8 w-8 cursor-pointer place-items-center rounded-full border border-rule bg-card text-muted shadow-lift hover:text-ink" title="Upload photo">
                    ${icon('camera', { size: 15 })}
                    <input type="file" accept="image/jpeg,image/png,image/webp" class="hidden" data-photo-input />
                  </label>`
            }
          </div>
          ${
            deleted
              ? ''
              : `<div class="flex gap-0.5">
                  <button type="button" class="btn-icon ${contact.isFavourite ? 'text-manila hover:text-manila' : ''}" data-action="favourite" title="${contact.isFavourite ? 'Remove from favourites' : 'Add to favourites'}">
                    ${icon('star', { fill: contact.isFavourite ? 'currentColor' : 'none' })}
                  </button>
                  <button type="button" class="btn-icon" data-action="edit" title="Edit">${icon('pencil')}</button>
                  <button type="button" class="btn-icon hover:text-danger" data-action="trash" title="Move to trash">${icon('trash')}</button>
                </div>`
          }
        </div>

        <h1 class="mt-5 text-3xl font-extrabold leading-tight tracking-tight">${esc(fullName(contact))}</h1>
        ${subtitle ? `<p class="mt-1 text-muted">${subtitle}</p>` : ''}
        ${
          contact.tags.length
            ? `<div class="mt-3 flex flex-wrap gap-1.5">${contact.tags.map((tag) => `<span class="chip"><span class="text-faint">#</span>${esc(tag)}</span>`).join('')}</div>`
            : ''
        }

        <div class="mt-5 grid grid-cols-2 gap-2">
          ${
            contact.email
              ? `<a href="mailto:${esc(contact.email)}" class="btn-secondary h-10">${icon('mail', { size: 16 })} Email</a>`
              : `<span class="btn-secondary h-10 opacity-50">${icon('mail', { size: 16 })} Email</span>`
          }
          ${
            contact.phone
              ? `<a href="tel:${esc(contact.phone)}" class="btn-secondary h-10">${icon('phone', { size: 16 })} Call</a>`
              : `<span class="btn-secondary h-10 opacity-50">${icon('phone', { size: 16 })} Call</span>`
          }
        </div>
      </div>

      <dl class="divide-y divide-rule border-t border-rule px-6 py-1 text-[15px]">
        ${detailRow('mail', 'Email', esc(contact.email))}
        ${detailRow('phone', 'Phone', esc(formatPhone(contact.phone)))}
        ${detailRow('building', 'Company', esc(contact.company))}
        ${detailRow('briefcase', 'Designation', esc(contact.designation))}
        ${detailRow('calendar', 'Added', formatLongDate(contact.createdAt))}
        ${detailRow('history', 'Last updated', formatLongDate(contact.updatedAt))}
      </dl>
    </section>`;
}

function notesSection(contact) {
  return `
    <section class="index-card">
      <div class="flex items-center justify-between px-5 pt-5">
        <h2 class="panel-title">Notes</h2>
        ${contact.isDeleted ? '' : `<button type="button" class="btn-ghost btn-sm" data-action="edit">${icon('pencil', { size: 14 })} Edit</button>`}
      </div>
      <div class="ruled whitespace-pre-line px-5 pb-4 pt-1 leading-8">${
        contact.notes ? esc(contact.notes) : '<span class="text-faint">No notes yet.</span>'
      }</div>
    </section>`;
}

function statsSection(interactions) {
  const now = Date.now();
  const past = interactions.filter((item) => new Date(item.date) <= now);
  const lastContacted = past[0]?.date; // list is sorted newest first

  const followUps = interactions.map((item) => item.followUpDate).filter(Boolean).sort();
  const upcoming = followUps.find((date) => daysFromToday(date) >= 0);
  const nextFollowUp = upcoming ?? followUps.at(-1);
  const followUp = nextFollowUp ? describeFollowUp(nextFollowUp) : null;

  const stat = (label, value, className = '') => `
    <div class="panel px-4 py-3.5">
      <p class="text-xs text-muted">${label}</p>
      <p class="mt-1 text-xl font-extrabold tracking-tight ${className}">${value}</p>
    </div>`;

  return `
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
      ${stat('Interactions', interactions.length, 'tabular-nums')}
      ${stat('Last contacted', lastContacted ? relativeDay(lastContacted) : 'Never')}
      ${stat('Next follow-up', followUp ? followUp.short : 'None', followUp?.tone === 'danger' ? 'text-danger' : followUp?.tone === 'manila' ? 'text-manila' : '')}
    </div>`;
}

function logSection() {
  return `
    <section class="panel p-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="panel-title">Log an interaction</h2>
        <div class="segmented" role="group" aria-label="Interaction type">
          ${Object.entries(TYPES)
            .map(
              ([value, type]) => `
              <button type="button" class="segment inline-flex items-center gap-1.5" data-type="${value}" aria-pressed="${value === 'call'}">
                ${icon(type.icon, { size: 15 })} ${type.label}
              </button>`,
            )
            .join('')}
        </div>
      </div>
      <form class="mt-4" novalidate data-log-form>
        <textarea name="note" rows="3" class="input" placeholder="${TYPES.call.placeholder}"></textarea>
        <p class="field-error" data-error-for="note"></p>
        <div class="mt-3 flex flex-wrap items-center gap-3">
          <label class="flex items-center gap-2 text-[13px] font-semibold">
            Date <input type="date" name="date" value="${todayInputValue()}" max="${todayInputValue()}" class="input h-9 w-auto" />
          </label>
          <label class="flex items-center gap-2 text-[13px] font-semibold">
            Follow up on <span class="font-normal text-faint">(optional)</span>
            <input type="date" name="followUpDate" min="${todayInputValue()}" class="input h-9 w-auto" />
          </label>
          <button type="submit" class="btn-primary ml-auto">Save</button>
        </div>
        <p class="field-error" data-error-for="followUpDate"></p>
      </form>
    </section>`;
}

function timelineItems(interactions, filter, readOnly) {
  const visible = filter === 'all' ? interactions : interactions.filter((item) => item.type === filter);

  if (visible.length === 0) {
    return `
      <div class="flex flex-col items-center py-10 text-center">
        <div class="grid h-12 w-12 place-items-center rounded-2xl bg-well text-muted">${icon('clock', { size: 22 })}</div>
        <p class="mt-3 font-semibold">${filter === 'all' ? 'No interactions yet' : `No ${TYPES[filter].plural.toLowerCase()} yet`}</p>
        <p class="mt-1 text-sm text-muted">${readOnly ? '' : 'Log the first call, email or meeting above.'}</p>
      </div>`;
  }

  return `
    <ol>
      ${visible
        .map((item, index) => {
          const type = TYPES[item.type] ?? TYPES.call;
          const followUp = item.followUpDate ? describeFollowUp(item.followUpDate) : null;
          const isLast = index === visible.length - 1;
          return `
            <li class="relative flex gap-4 ${isLast ? '' : 'pb-6'}" data-interaction="${item.id}">
              ${isLast ? '' : '<span class="absolute bottom-0 left-5 top-11 w-px bg-rule" aria-hidden="true"></span>'}
              <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl ${type.tint}">${icon(type.icon, { size: 18 })}</span>
              <div class="min-w-0 flex-1 pt-0.5">
                <p class="text-sm"><b class="font-bold">${type.label}</b> <span class="text-muted">on ${formatDateTime(item.date)}</span></p>
                <p class="mt-1 whitespace-pre-line">${esc(item.note)}</p>
                ${
                  followUp
                    ? `<p class="mt-2 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[13px] font-semibold ${TONES[followUp.tone]}">
                        ${icon('calendarClock', { size: 14 })} ${followUp.text}
                        <span class="font-normal opacity-75">${formatDate(item.followUpDate)}</span>
                      </p>`
                    : ''
                }
              </div>
              ${readOnly ? '' : `<button type="button" class="btn-icon h-8 w-8 shrink-0 hover:text-danger" data-delete-interaction title="Delete">${icon('trash', { size: 15 })}</button>`}
            </li>`;
        })
        .join('')}
    </ol>`;
}


export async function renderContactDetail({ params }) {
  const root = mountPage(`
    <a href="#/contacts" class="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-ink">${icon('arrowLeft', { size: 16 })} Back</a>
    <div data-content class="mt-5">
      <div class="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div class="skeleton h-[560px] rounded-xl"></div>
        <div class="space-y-6"><div class="skeleton h-32 rounded-xl"></div><div class="skeleton h-24 rounded-xl"></div><div class="skeleton h-64 rounded-xl"></div></div>
      </div>
    </div>`);

  let contact;
  let interactions = [];
  let selectedType = 'call';
  let timelineFilter = 'all';

  try {
    [{ data: contact }, { data: interactions }] = await Promise.all([
      api.getContact(params.id),
      api.listInteractions(params.id),
    ]);
  } catch (error) {
    $('[data-content]', root).innerHTML = `
      <div class="panel flex flex-col items-center px-6 py-16 text-center">
        <div class="grid h-14 w-14 place-items-center rounded-2xl bg-danger/10 text-danger">${icon('alert', { size: 26 })}</div>
        <p class="mt-4 text-lg font-bold">${error.status === 404 || error.status === 422 ? 'Contact not found' : 'Could not load this contact'}</p>
        <p class="mt-1 text-sm text-muted">${esc(error.message)}</p>
        <a href="#/contacts" class="btn-secondary mt-5">Back to contacts</a>
      </div>`;
    return undefined;
  }

  refreshSidebar(); 

  const content = $('[data-content]', root);
  content.innerHTML = `
    <div data-trash-banner></div>
    <div class="grid items-start gap-6 lg:grid-cols-[380px_1fr]">
      <div data-card></div>
      <div class="min-w-0 space-y-6">
        <div data-notes></div>
        <div data-stats></div>
        <div data-log></div>
        <section class="panel p-5">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h2 class="panel-title">Timeline</h2>
            <div class="segmented" role="group" aria-label="Filter timeline">
              <button type="button" class="segment" data-filter="all" aria-pressed="true">All</button>
              ${Object.entries(TYPES).map(([value, type]) => `<button type="button" class="segment" data-filter="${value}" aria-pressed="false">${type.plural}</button>`).join('')}
            </div>
          </div>
          <div class="mt-5" data-timeline></div>
        </section>
      </div>
    </div>`;

  const renderContact = () => {
    $('[data-trash-banner]', content).innerHTML = contact.isDeleted
      ? `<div class="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm">
          ${icon('trash', { size: 16, className: 'text-danger' })}
          <p class="flex-1"><b class="font-semibold">This contact is in trash.</b> Restore it to edit or log interactions.</p>
          <button type="button" class="btn-secondary btn-sm" data-action="restore">${icon('restore', { size: 14 })} Restore</button>
        </div>`
      : '';
    $('[data-card]', content).innerHTML = cardSection(contact);
    $('[data-notes]', content).innerHTML = notesSection(contact);

    // Rendered once, so a half-typed note survives re-renders of the card
    const log = $('[data-log]', content);
    if (contact.isDeleted) {
      log.innerHTML = '';
    } else if (!log.firstElementChild) {
      log.innerHTML = logSection();
      bindLogForm();
    }
  };

  const renderInteractions = () => {
    $('[data-stats]', content).innerHTML = statsSection(interactions);
    $('[data-timeline]', content).innerHTML = timelineItems(interactions, timelineFilter, contact.isDeleted);
  };

  const reloadInteractions = async () => {
    ({ data: interactions } = await api.listInteractions(contact.id));
    renderInteractions();
  };

  const reloadContact = async () => {
    try {
      ({ data: contact } = await api.getContact(contact.id));
      renderContact();
      renderInteractions();
    } catch {
      /* contact was deleted elsewhere - keep showing the last version */
    }
  };

  function bindLogForm() {
    const form = $('[data-log-form]', content);
    if (!form) return;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      clearFieldErrors(form);
      const { note, date, followUpDate } = Object.fromEntries(new FormData(form));

      try {
        await withBusy($('[type="submit"]', form), () =>
          api.addInteraction(contact.id, {
            type: selectedType,
            note,
            ...(date && { date: dateInputToIso(date) }),
            ...(followUpDate && { followUpDate: new Date(`${followUpDate}T09:00`).toISOString() }),
          }),
        );
        form.elements.note.value = '';
        form.elements.followUpDate.value = '';
        toast(`${TYPES[selectedType].label} logged`);
        await reloadInteractions();
      } catch (error) {
        if (!showFieldErrors(form, error)) toastError(error);
      }
    });
  }

  const ACTIONS = {
    async favourite() {
      const { data, message } = await api.toggleFavourite(contact.id);
      contact = data;
      renderContact();
      toast(message);
    },
   
    edit: () => openContactForm(contact),
    async trash() {
      const confirmed = await confirmDialog({
        title: 'Move to trash?',
        message: `${fullName(contact)} will move to Trash. You can restore the contact from there at any time.`,
        confirmLabel: 'Move to trash',
        danger: true,
      });
      if (!confirmed) return;
      await api.trashContact(contact.id);
      notifyDataChanged();
      toast(`${fullName(contact)} moved to trash`);
      navigate('/contacts');
    },
    async restore() {
      ({ data: contact } = await api.restoreContact(contact.id));
      notifyDataChanged();
      toast(`${fullName(contact)} restored`);
    },
  };

  content.addEventListener('click', async (event) => {
    const target = event.target;

    const actionButton = target.closest('[data-action]');
    if (actionButton) {
      try {
        await ACTIONS[actionButton.dataset.action]();
      } catch (error) {
        toastError(error);
      }
      return;
    }

    const typeButton = target.closest('[data-type]');
    if (typeButton) {
      selectedType = typeButton.dataset.type;
      for (const button of $$('[data-type]', content)) {
        button.setAttribute('aria-pressed', String(button === typeButton));
      }
      const note = $('[data-log-form] textarea', content);
      note.placeholder = TYPES[selectedType].placeholder;
      note.focus();
      return;
    }

    const filterButton = target.closest('[data-filter]');
    if (filterButton) {
      timelineFilter = filterButton.dataset.filter;
      for (const button of $$('[data-filter]', content)) {
        button.setAttribute('aria-pressed', String(button === filterButton));
      }
      renderInteractions();
      return;
    }

    const deleteButton = target.closest('[data-delete-interaction]');
    if (deleteButton) {
      const confirmed = await confirmDialog({
        title: 'Delete this interaction?',
        message: 'It will be removed from the timeline. This cannot be undone.',
        confirmLabel: 'Delete',
        danger: true,
      });
      if (!confirmed) return;
      try {
        await api.deleteInteraction(contact.id, deleteButton.closest('[data-interaction]').dataset.interaction);
        toast('Interaction deleted');
        await reloadInteractions();
      } catch (error) {
        toastError(error);
      }
    }
  });

  content.addEventListener('change', async (event) => {
    if (!event.target.matches('[data-photo-input]')) return;
    const [file] = event.target.files;
    if (!file) return;

    try {
      ({ data: contact } = await api.uploadPhoto(contact.id, file));
      renderContact();
      notifyDataChanged();
      toast('Photo updated');
    } catch (error) {
      toastError(error);
    }
  });

  renderContact();
  renderInteractions();

  window.addEventListener(DATA_CHANGED, reloadContact);
  return () => window.removeEventListener(DATA_CHANGED, reloadContact);
}
