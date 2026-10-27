/* Contacts feature: the contact list, the add/edit contact form and the trash. */

import {
  $,
  $$,
  DATA_CHANGED,
  avatar,
  clearFieldErrors,
  debounce,
  esc,
  formatDate,
  formatPhone,
  fullName,
  icon,
  notifyDataChanged,
  relativeDay,
  showFieldErrors,
  withBusy,
} from './shared.js';
import { api, navigate, replaceQuery } from './core.js';
import { confirmDialog, mountPage, openModal, toast, toastError } from './ui.js';

// ---------- contacts ----------

const VIEWS = [
  { value: 'all', label: 'All' },
  { value: 'favourites', label: 'Favourites' },
  { value: 'recent', label: 'Recent' },
];

const PAGE_SIZES = [10, 20, 50];

// Columns that can be sorted by clicking the header
const SORTABLE = { name: 'firstName', company: 'company', added: 'createdAt' };

const DASH = '<span class="text-faint">—</span>';

function readState(query) {
  const limit = Number(query.get('limit'));
  return {
    view: VIEWS.some((view) => view.value === query.get('view')) ? query.get('view') : 'all',
    search: query.get('search') ?? '',
    tag: query.get('tag') ?? '',
    sort: query.get('sort') ?? '-createdAt',
    page: Math.max(Number.parseInt(query.get('page'), 10) || 1, 1),
    limit: PAGE_SIZES.includes(limit) ? limit : 10,
  };
}

/** Query sent to GET /api/contacts (page/limit are left out for export). */
const apiQuery = ({ view, search, tag, sort, page, limit }) => ({
  search,
  tag,
  sort,
  page,
  limit,
  favourite: view === 'favourites' ? 'true' : undefined,
});

/* ------------------------------------------------------------------ */
/* Markup                                                              */
/* ------------------------------------------------------------------ */

function sortHeader(label, key, state, className = '') {
  const field = SORTABLE[key];
  const active = state.sort.replace(/^-/, '') === field;
  const descending = state.sort.startsWith('-');
  const arrow = active ? (descending ? '↓' : '↑') : '';

  return `
    <th class="px-4 py-3 font-semibold ${className}" aria-sort="${active ? (descending ? 'descending' : 'ascending') : 'none'}">
      <button type="button" class="inline-flex items-center gap-1 hover:text-ink ${active ? 'text-ink' : ''}" data-sort="${field}">
        ${label} <span class="w-3 text-xs">${arrow}</span>
      </button>
    </th>`;
}

function tagChips(tags, max = 3) {
  const shown = tags
    .slice(0, max)
    .map((tag) => `<span class="chip"><span class="text-faint">#</span>${esc(tag)}</span>`)
    .join('');
  const more = tags.length > max ? `<span class="chip">+${tags.length - max}</span>` : '';
  return `<div class="flex flex-wrap gap-1">${shown}${more}</div>`;
}

function row(contact) {
  const subtitle = contact.email || formatPhone(contact.phone);
  return `
    <tr class="group cursor-pointer transition-colors hover:bg-well/50" data-id="${contact.id}">
      <td class="px-4 py-3">
        <div class="flex items-center gap-3">
          ${avatar({ contact, size: 'md' })}
          <div class="min-w-0">
            <p class="flex items-center gap-1.5 font-semibold">
              <a href="#/contacts/${contact.id}" class="truncate hover:text-accent">${esc(fullName(contact))}</a>
              ${contact.isFavourite ? icon('star', { size: 13, fill: 'currentColor', className: 'text-manila' }) : ''}
            </p>
            <p class="truncate text-[13px] text-muted">${esc(subtitle)}</p>
          </div>
        </div>
      </td>
      <td class="hidden px-4 py-3 md:table-cell">
        <p>${esc(contact.company) || DASH}</p>
        <p class="text-[13px] text-muted">${esc(contact.designation)}</p>
      </td>
      <td class="hidden whitespace-nowrap px-4 py-3 tabular-nums lg:table-cell">${esc(formatPhone(contact.phone)) || DASH}</td>
      <td class="hidden px-4 py-3 sm:table-cell">${contact.tags.length ? tagChips(contact.tags) : DASH}</td>
      <td class="hidden whitespace-nowrap px-4 py-3 text-muted xl:table-cell">${formatDate(contact.createdAt)}</td>
      <td class="px-3 py-3">
        <div class="flex justify-end gap-0.5 transition-opacity lg:opacity-0 lg:focus-within:opacity-100 lg:group-hover:opacity-100">
          <button type="button" class="btn-icon h-8 w-8 ${contact.isFavourite ? 'text-manila hover:text-manila' : ''}" data-action="favourite"
            title="${contact.isFavourite ? 'Remove from favourites' : 'Add to favourites'}">
            ${icon('star', { size: 16, fill: contact.isFavourite ? 'currentColor' : 'none' })}
          </button>
          <button type="button" class="btn-icon h-8 w-8" data-action="edit" title="Edit">${icon('pencil', { size: 16 })}</button>
          <button type="button" class="btn-icon h-8 w-8 hover:text-danger" data-action="trash" title="Move to trash">${icon('trash', { size: 16 })}</button>
        </div>
      </td>
    </tr>`;
}

const skeletonRows = () =>
  Array.from(
    { length: 6 },
    () => `
    <tr>
      <td class="px-4 py-3.5"><div class="flex items-center gap-3"><div class="skeleton h-10 w-10 rounded-lg"></div>
        <div class="space-y-2"><div class="skeleton h-3 w-32"></div><div class="skeleton h-2.5 w-44"></div></div></div></td>
      <td class="hidden px-4 md:table-cell"><div class="skeleton h-3 w-24"></div></td>
      <td class="hidden px-4 lg:table-cell"><div class="skeleton h-3 w-28"></div></td>
      <td class="hidden px-4 sm:table-cell"><div class="skeleton h-4 w-20"></div></td>
      <td class="hidden px-4 xl:table-cell"><div class="skeleton h-3 w-12"></div></td>
      <td></td>
    </tr>`,
  ).join('');

function emptyState(state) {
  const filtered = state.search || state.tag;
  const copy = filtered
    ? { title: 'No contacts match', text: 'Try a different search or clear the filters.' }
    : state.view === 'favourites'
      ? { title: 'No favourites yet', text: 'Star a contact to pin it here.' }
      : state.view === 'recent'
        ? { title: 'Nothing viewed yet', text: 'Contacts you open will show up here.' }
        : { title: 'Your cardfile is empty', text: 'Add your first contact or import a CSV from Excel or Google Sheets.' };

  const actions = filtered
    ? '<button type="button" class="btn-secondary" data-clear-filters>Clear filters</button>'
    : state.view === 'all'
      ? `<button type="button" class="btn-primary" data-new>${icon('plus', { size: 16 })} New contact</button>
         <a href="#/import" class="btn-secondary">${icon('upload', { size: 16 })} Import CSV</a>`
      : '';

  return `
    <tr><td colspan="6">
      <div class="flex flex-col items-center px-6 py-16 text-center">
        <div class="grid h-14 w-14 place-items-center rounded-2xl bg-accent/10 text-accent">${icon(filtered ? 'search' : 'inbox', { size: 26 })}</div>
        <p class="mt-4 text-lg font-bold">${copy.title}</p>
        <p class="mt-1 max-w-sm text-sm text-muted">${copy.text}</p>
        ${actions ? `<div class="mt-5 flex gap-2">${actions}</div>` : ''}
      </div>
    </td></tr>`;
}

function footer(state, pagination) {
  if (state.view === 'recent') {
    return `<span class="text-muted">Your most recently opened contacts</span>`;
  }

  const { page, limit, total, totalPages, hasPrevPage, hasNextPage } = pagination;
  const first = total === 0 ? 0 : (page - 1) * limit + 1;
  const last = Math.min(page * limit, total);

  return `
    <span class="text-muted">Showing <b class="font-semibold text-ink">${first}–${last}</b> of <b class="font-semibold text-ink">${total}</b></span>
    <div class="flex items-center gap-2">
      <select class="input h-8 w-auto py-0 text-[13px]" data-limit aria-label="Rows per page">
        ${PAGE_SIZES.map((size) => `<option value="${size}" ${size === limit ? 'selected' : ''}>${size} / page</option>`).join('')}
      </select>
      <span class="hidden px-1 text-muted sm:inline">Page ${page} of ${totalPages}</span>
      <button type="button" class="btn-secondary btn-sm" data-page="${page - 1}" ${hasPrevPage ? '' : 'disabled'} aria-label="Previous page">${icon('chevronLeft', { size: 16 })}</button>
      <button type="button" class="btn-secondary btn-sm" data-page="${page + 1}" ${hasNextPage ? '' : 'disabled'} aria-label="Next page">${icon('chevronRight', { size: 16 })}</button>
    </div>`;
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function renderContacts({ query }) {
  const state = readState(query);
  let contacts = [];
  let latestRequest = 0;

  const root = mountPage(`
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-3xl font-extrabold tracking-tight" data-title></h1>
        <p class="mt-1 text-muted" data-count>&nbsp;</p>
      </div>
      <div class="flex gap-2">
        <button type="button" class="btn-secondary" data-export>${icon('download', { size: 16 })} Export view</button>
        <a href="#/import" class="btn-secondary">${icon('upload', { size: 16 })} Import</a>
      </div>
    </div>

    <div class="mt-6 flex flex-wrap items-center gap-2">
      <label class="flex h-10 w-full items-center gap-2.5 rounded-lg border border-rule bg-card px-3 text-sm transition focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/15 sm:w-72">
        ${icon('search', { size: 16, className: 'text-faint' })}
        <input type="search" data-page-search value="${esc(state.search)}" placeholder="Search name, email, phone, company…" class="min-w-0 flex-1 bg-transparent outline-none placeholder:text-faint" />
        <kbd class="kbd">/</kbd>
      </label>
      <label class="flex h-10 w-full items-center gap-2.5 rounded-lg border border-rule bg-card px-3 text-sm transition focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/15 sm:w-44">
        ${icon('tag', { size: 16, className: 'text-faint' })}
        <input data-tag-filter value="${esc(state.tag)}" placeholder="Filter by tag" class="min-w-0 flex-1 bg-transparent outline-none placeholder:text-faint" />
      </label>
      <div class="segmented" role="group" aria-label="View">
        ${VIEWS.map((view) => `<button type="button" class="segment" data-view="${view.value}">${view.label}</button>`).join('')}
      </div>
    </div>

    <div class="panel mt-4 overflow-hidden">
      <div class="scroll-thin overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-rule bg-well/60 text-[13px] text-muted" data-head></thead>
          <tbody class="divide-y divide-rule" data-rows>${skeletonRows()}</tbody>
        </table>
      </div>
      <div class="flex flex-wrap items-center justify-between gap-3 border-t border-rule px-4 py-3 text-sm" data-footer></div>
    </div>`);

  const renderHead = () => {
    $('[data-head]', root).innerHTML = `
      <tr>
        ${sortHeader('Name', 'name', state)}
        ${sortHeader('Company', 'company', state, 'hidden md:table-cell')}
        <th class="hidden px-4 py-3 font-semibold lg:table-cell">Phone</th>
        <th class="hidden px-4 py-3 font-semibold sm:table-cell">Tags</th>
        ${sortHeader('Added', 'added', state, 'hidden xl:table-cell')}
        <th class="w-px px-4 py-3"><span class="sr-only">Actions</span></th>
      </tr>`;
  };

  const renderChrome = () => {
    $('[data-title]', root).textContent = state.view === 'favourites' ? 'Favourites' : 'Contacts';
    for (const button of $$('[data-view]', root)) {
      button.setAttribute('aria-pressed', String(button.dataset.view === state.view));
    }
    renderHead();
  };

  const renderRows = () => {
    $('[data-rows]', root).innerHTML = contacts.length ? contacts.map(row).join('') : emptyState(state);
  };

  async function load() {
    replaceQuery({
      view: state.view === 'all' ? '' : state.view,
      search: state.search,
      tag: state.tag,
      sort: state.sort === '-createdAt' ? '' : state.sort,
      page: state.page === 1 ? '' : state.page,
      limit: state.limit === 10 ? '' : state.limit,
    });
    renderChrome();

    const requestId = ++latestRequest;
    try {
      let pagination;
      if (state.view === 'recent') {
        ({ data: contacts } = await api.recentContacts());
      } else {
        ({ data: contacts, pagination } = await api.listContacts(apiQuery(state)));
      }
      if (requestId !== latestRequest) return; // a newer request already started

      // e.g. the last contact on the last page was trashed - step back a page
      if (pagination && contacts.length === 0 && pagination.page > pagination.totalPages) {
        state.page = pagination.totalPages;
        return load();
      }

      const total = pagination?.total ?? contacts.length;
      const filtered = state.search || state.tag;
      $('[data-count]', root).textContent =
        `${total} ${total === 1 ? 'contact' : 'contacts'}${filtered ? ' match your filters' : ''}`;

      renderRows();
      $('[data-footer]', root).innerHTML = footer(state, pagination);
    } catch (error) {
      if (requestId === latestRequest) toastError(error);
    }
  }

  const setState = (changes) => {
    Object.assign(state, changes, { page: changes.page ?? 1 });
    load();
  };

  /* ---------- filters ---------- */
  const onSearch = debounce((value) => setState({ search: value.trim() }), 300);
  const onTag = debounce((value) => setState({ tag: value.trim() }), 300);
  $('[data-page-search]', root).addEventListener('input', (event) => onSearch(event.target.value));
  $('[data-tag-filter]', root).addEventListener('input', (event) => onTag(event.target.value));

  /* ---------- clicks ---------- */
  const ACTIONS = {
    async favourite(contact) {
      const { data, message } = await api.toggleFavourite(contact.id);
      Object.assign(contact, data);
      renderRows();
      toast(message);
      if (state.view === 'favourites') load();
    },
    // The form announces DATA_CHANGED after saving, which reloads this list
    edit: (contact) => openContactForm(contact),
    async trash(contact) {
      await api.trashContact(contact.id);
      notifyDataChanged();
      toast(`${fullName(contact)} moved to trash`, 'success', {
        action: {
          label: 'Undo',
          onClick: async () => {
            try {
              await api.restoreContact(contact.id);
              notifyDataChanged();
              toast(`${fullName(contact)} restored`);
            } catch (error) {
              toastError(error);
            }
          },
        },
      });
    },
  };

  root.addEventListener('click', async (event) => {
    const target = event.target;

    const viewButton = target.closest('[data-view]');
    if (viewButton) return setState({ view: viewButton.dataset.view });

    const sortButton = target.closest('[data-sort]');
    if (sortButton) {
      const field = sortButton.dataset.sort;
      const current = state.sort.replace(/^-/, '');
      const nextSort =
        current === field ? (state.sort.startsWith('-') ? field : `-${field}`) : field === 'createdAt' ? '-createdAt' : field;
      return setState({ sort: nextSort });
    }

    const pageButton = target.closest('[data-page]');
    if (pageButton && !pageButton.disabled) return setState({ page: Number(pageButton.dataset.page) });

    if (target.closest('[data-clear-filters]')) {
      $('[data-page-search]', root).value = '';
      $('[data-tag-filter]', root).value = '';
      return setState({ search: '', tag: '' });
    }

    if (target.closest('[data-new]')) return openContactForm();

    if (target.closest('[data-export]')) {
      const button = target.closest('[data-export]');
      try {
        const { page: _page, limit: _limit, ...filters } = apiQuery(state);
        await withBusy(button, async () => {
          const response = await api.exportCsv(filters);
          const fileName = response.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] ?? 'contacts.csv';
          const link = document.createElement('a');
          link.href = URL.createObjectURL(await response.blob());
          link.download = fileName;
          link.click();
          setTimeout(() => URL.revokeObjectURL(link.href), 1000);
        });
        toast('Export downloaded');
      } catch (error) {
        toastError(error);
      }
      return;
    }

    const rowElement = target.closest('tr[data-id]');
    if (!rowElement) return;
    const contact = contacts.find((item) => item.id === rowElement.dataset.id);

    const actionButton = target.closest('[data-action]');
    if (actionButton) {
      try {
        await ACTIONS[actionButton.dataset.action](contact);
      } catch (error) {
        toastError(error);
      }
      return;
    }

    if (!target.closest('a')) navigate(`/contacts/${contact.id}`);
  });

  root.addEventListener('change', (event) => {
    if (event.target.matches('[data-limit]')) setState({ limit: Number(event.target.value) });
  });

  window.addEventListener(DATA_CHANGED, load);
  load();

  return () => window.removeEventListener(DATA_CHANGED, load);
}

// ---------- contactForm ----------

const MAX_TAGS = 10;
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const field = ({ name, label, type = 'text', placeholder = '', value = '', autocomplete = 'off' }) => `
  <label class="block">
    <span class="field-label">${label}</span>
    <input name="${name}" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}" autocomplete="${autocomplete}" class="input" />
    <p class="field-error" data-error-for="${name}"></p>
  </label>`;

/**
 * Opens the create / edit form. Resolves with the saved contact, or null if cancelled.
 *   await openContactForm()          -> new contact
 *   await openContactForm(contact)   -> edit
 */
export function openContactForm(contact = null) {
  const isEdit = Boolean(contact);
  const tags = [...(contact?.tags ?? [])];
  let photoFile = null;
  let savedContact = null;

  return new Promise((resolve) => {
    const { dialog, close } = openModal({
      title: isEdit ? 'Edit contact' : 'New contact',
      width: 'max-w-2xl',
      onClose: () => resolve(savedContact),
      content: `
        <form class="space-y-5 px-6 pb-6 pt-4" novalidate>
          <div class="flex gap-5">
            <div class="relative shrink-0 self-start" data-photo-preview>
              ${avatar({ contact, name: fullName(contact) || 'New Contact', size: 'lg' })}
              <label class="absolute -bottom-1.5 -right-1.5 grid h-7 w-7 cursor-pointer place-items-center rounded-full border border-rule bg-card text-muted shadow-lift hover:text-ink" title="Choose photo">
                ${icon('camera', { size: 14 })}
                <input type="file" accept="image/jpeg,image/png,image/webp" class="hidden" data-photo-input />
              </label>
            </div>
            <div class="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
              ${field({ name: 'firstName', label: 'First name', value: contact?.firstName })}
              ${field({ name: 'lastName', label: 'Last name', value: contact?.lastName })}
            </div>
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            ${field({ name: 'email', label: 'Email', type: 'email', value: contact?.email })}
            ${field({ name: 'phone', label: 'Phone', type: 'tel', placeholder: '+91 98765 43210', value: contact?.phone })}
            ${field({ name: 'company', label: 'Company', value: contact?.company })}
            ${field({ name: 'designation', label: 'Designation', placeholder: 'e.g. Product Manager', value: contact?.designation })}
          </div>
          <p class="-mt-2 text-[13px] text-muted">Add at least an email or a phone number.</p>

          <label class="flex h-10 cursor-pointer items-center gap-2.5 rounded-lg border border-rule px-3 text-sm font-semibold hover:bg-well sm:w-1/2">
            <input type="checkbox" name="isFavourite" class="h-4 w-4 accent-accent" ${contact?.isFavourite ? 'checked' : ''} />
            ${icon('star', { size: 16, className: 'text-manila' })} Favourite
          </label>

          <div>
            <span class="field-label">Tags</span>
            <div class="input flex h-auto min-h-10 flex-wrap items-center gap-1.5 py-1.5" data-tag-box>
              <span class="contents" data-tag-chips></span>
              <input data-tag-input class="min-w-[9rem] flex-1 bg-transparent text-sm outline-none placeholder:text-faint" placeholder="Add a tag and press Enter" />
            </div>
            <p class="field-hint">Press Enter or comma after each tag (up to ${MAX_TAGS}).</p>
            <p class="field-error" data-error-for="tags"></p>
          </div>

          <label class="block">
            <span class="field-label">Notes</span>
            <textarea name="notes" rows="4" class="input" placeholder="Where you met, what they need…">${esc(contact?.notes)}</textarea>
            <p class="field-error" data-error-for="notes"></p>
          </label>

          <p class="field-error rounded-lg bg-danger/10 px-3 py-2.5 font-medium" data-form-error></p>

          <div class="flex justify-end gap-2 border-t border-rule pt-5">
            <button type="button" class="btn-secondary" data-close>Cancel</button>
            <button type="submit" class="btn-primary">${isEdit ? 'Save changes' : 'Create contact'}</button>
          </div>
        </form>`,
    });

    const form = $('form', dialog);
    const tagInput = $('[data-tag-input]', form);

    /* ---------- tags ---------- */
    const renderTags = () => {
      $('[data-tag-chips]', form).innerHTML = tags
        .map(
          (tag, index) => `
          <span class="chip bg-accent/10 text-accent">
            # ${esc(tag)}
            <button type="button" class="ml-0.5 opacity-60 hover:opacity-100" data-remove-tag="${index}" aria-label="Remove ${esc(tag)}">${icon('x', { size: 12 })}</button>
          </span>`,
        )
        .join('');
    };

    const addTag = (raw) => {
      const tag = raw.trim().replace(/^#/, '').toLowerCase();
      if (!tag || tags.includes(tag)) return;
      if (tags.length >= MAX_TAGS) {
        toast(`A contact can have at most ${MAX_TAGS} tags`, 'error');
        return;
      }
      tags.push(tag.slice(0, 30));
      renderTags();
    };

    tagInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ',') {
        event.preventDefault();
        addTag(tagInput.value);
        tagInput.value = '';
      } else if (event.key === 'Backspace' && !tagInput.value && tags.length) {
        tags.pop();
        renderTags();
      }
    });
    tagInput.addEventListener('blur', () => {
      addTag(tagInput.value);
      tagInput.value = '';
    });
    form.addEventListener('click', (event) => {
      const removeButton = event.target.closest('[data-remove-tag]');
      if (removeButton) {
        tags.splice(Number(removeButton.dataset.removeTag), 1);
        renderTags();
      }
      if (event.target === $('[data-tag-box]', form)) tagInput.focus();
    });
    renderTags();

    /* ---------- photo ---------- */
    $('[data-photo-input]', form).addEventListener('change', (event) => {
      const [file] = event.target.files;
      if (!file) return;
      if (!PHOTO_TYPES.includes(file.type)) return toast('Choose a JPEG, PNG or WEBP image', 'error');
      if (file.size > MAX_PHOTO_BYTES) return toast('Photo must be 2 MB or smaller', 'error');

      photoFile = file;
      const preview = $('[data-photo-preview]', form);
      preview.firstElementChild.outerHTML = avatar({ src: URL.createObjectURL(file), size: 'lg' });
    });

    /* ---------- submit ---------- */
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      addTag(tagInput.value);
      tagInput.value = '';

      const values = Object.fromEntries(new FormData(form));
      const payload = {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone,
        company: values.company,
        designation: values.designation,
        notes: values.notes,
        tags,
        isFavourite: form.elements.isFavourite.checked,
      };

      const formError = $('[data-form-error]', form);
      clearFieldErrors(form);
      formError.textContent = '';

      try {
        await withBusy($('[type="submit"]', form), async () => {
          const { data } = isEdit
            ? await api.updateContact(contact.id, payload)
            : await api.createContact(payload);
          savedContact = data;

          // The contact is already saved here, so a failed photo upload must not undo it
          if (photoFile) {
            try {
              const { data: withPhoto } = await api.uploadPhoto(data.id, photoFile);
              savedContact = withPhoto;
            } catch (photoError) {
              toast(`Contact saved, but the photo was not uploaded: ${photoError.message}`, 'error');
            }
          }
        });

        toast(isEdit ? 'Contact updated' : `${fullName(savedContact)} added`);
        notifyDataChanged();
        close();
      } catch (error) {
        if (!showFieldErrors(form, error)) formError.textContent = error.message;
      }
    });

    form.elements.firstName.focus();
  });
}

// ---------- trash ----------

const PAGE_SIZE = 20;

function trashRow(contact) {
  return `
    <li class="flex items-center gap-4 px-5 py-3.5" data-id="${contact.id}">
      ${avatar({ contact, size: 'md', className: 'opacity-70' })}
      <div class="min-w-0 flex-1">
        <a href="#/contacts/${contact.id}" class="block truncate font-semibold hover:text-accent">${esc(fullName(contact))}</a>
        <p class="truncate text-[13px] text-muted">${esc([contact.company, contact.email || contact.phone].filter(Boolean).join(' · '))}</p>
      </div>
      <p class="hidden text-[13px] text-muted sm:block" title="${formatDate(contact.deletedAt)}">Deleted ${relativeDay(contact.deletedAt).toLowerCase()}</p>
      <div class="flex gap-1.5">
        <button type="button" class="btn-secondary btn-sm" data-action="restore">${icon('restore', { size: 14 })} Restore</button>
        <button type="button" class="btn-ghost btn-sm hover:text-danger" data-action="purge" title="Delete forever">${icon('trashX', { size: 14 })}<span class="hidden sm:inline">Delete forever</span></button>
      </div>
    </li>`;
}

export function renderTrash() {
  let contacts = [];
  let page = 1;
  let pagination = null;

  const root = mountPage(`
    <div class="max-w-4xl">
      <h1 class="text-3xl font-extrabold tracking-tight">Trash</h1>
      <p class="mt-1 text-muted">Deleted contacts wait here. Restore them any time, or delete them forever.</p>
      <section class="panel mt-6 overflow-hidden">
        <ul class="divide-y divide-rule" data-list>
          ${'<li class="flex items-center gap-4 px-5 py-4"><div class="skeleton h-10 w-10 rounded-lg"></div><div class="skeleton h-3 w-48"></div></li>'.repeat(3)}
        </ul>
        <div class="flex items-center justify-between border-t border-rule px-5 py-3 text-sm" data-footer></div>
      </section>
    </div>`);

  async function load() {
    try {
      ({ data: contacts, pagination } = await api.listContacts({ status: 'trash', sort: '-updatedAt', page, limit: PAGE_SIZE }));
      if (contacts.length === 0 && page > pagination.totalPages) {
        page = pagination.totalPages;
        return load();
      }
    } catch (error) {
      toastError(error);
      return;
    }

    $('[data-list]', root).innerHTML = contacts.length
      ? contacts.map(trashRow).join('')
      : `<li class="flex flex-col items-center px-6 py-16 text-center">
          <div class="grid h-14 w-14 place-items-center rounded-2xl bg-well text-muted">${icon('trash', { size: 24 })}</div>
          <p class="mt-4 text-lg font-bold">Trash is empty</p>
          <p class="mt-1 text-sm text-muted">Contacts you delete will wait here.</p>
        </li>`;

    $('[data-footer]', root).innerHTML = `
      <span class="text-muted">${pagination.total} in trash</span>
      <div class="flex gap-2">
        <button type="button" class="btn-secondary btn-sm" data-page="${page - 1}" ${pagination.hasPrevPage ? '' : 'disabled'}>${icon('chevronLeft', { size: 16 })}</button>
        <button type="button" class="btn-secondary btn-sm" data-page="${page + 1}" ${pagination.hasNextPage ? '' : 'disabled'}>${icon('chevronRight', { size: 16 })}</button>
      </div>`;
  }

  root.addEventListener('click', async (event) => {
    const pageButton = event.target.closest('[data-page]');
    if (pageButton && !pageButton.disabled) {
      page = Number(pageButton.dataset.page);
      return load();
    }

    const actionButton = event.target.closest('[data-action]');
    if (!actionButton) return;
    const contact = contacts.find((item) => item.id === actionButton.closest('[data-id]').dataset.id);

    try {
      if (actionButton.dataset.action === 'restore') {
        await api.restoreContact(contact.id);
        toast(`${fullName(contact)} restored`);
      } else {
        const confirmed = await confirmDialog({
          title: 'Delete forever?',
          message: `${fullName(contact)} and their whole interaction history will be permanently deleted. This cannot be undone.`,
          confirmLabel: 'Delete forever',
          danger: true,
        });
        if (!confirmed) return;
        await api.deleteContactForever(contact.id);
        toast('Contact permanently deleted');
      }
      notifyDataChanged();
    } catch (error) {
      toastError(error);
    }
  });

  window.addEventListener(DATA_CHANGED, load);
  load();
  return () => window.removeEventListener(DATA_CHANGED, load);
}
