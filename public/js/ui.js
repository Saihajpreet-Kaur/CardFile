/* Reusable UI pieces: dialogs, menus, toasts and the app shell (layout). */

import { $, $$, DATA_CHANGED, avatar, debounce, esc, fullName, icon, logo } from './shared.js';
import { THEMES, api, getTheme, navigate, parseHash, session, setTheme } from './core.js';
import { openContactForm } from './contacts.js';

// ---------- dialog ----------

/**
 * Opens a modal built on the native <dialog> element (focus trap, Esc to close for free).
 * Returns { dialog, body, close }. The dialog removes itself from the page when closed.
 */
export function openModal({ title, content, width = 'max-w-lg', onClose }) {
  const dialog = document.createElement('dialog');
  dialog.className = `w-[calc(100%-2rem)] ${width} max-h-[90vh] overflow-y-auto scroll-thin rounded-2xl bg-card p-0 text-ink shadow-pop animate-slide-in`;
  dialog.innerHTML = `
    <div class="flex items-center justify-between px-6 pt-5">
      <h2 class="text-lg font-bold tracking-tight">${esc(title)}</h2>
      <button type="button" class="btn-icon -mr-2" data-close aria-label="Close">${icon('x')}</button>
    </div>
    <div data-body>${content}</div>`;

  document.body.append(dialog);

  const close = () => dialog.close();

  dialog.addEventListener('close', () => {
    dialog.remove();
    onClose?.();
  });
  dialog.addEventListener('click', (event) => {
    // A click on the dialog element itself means the backdrop was clicked
    if (event.target === dialog || event.target.closest('[data-close]')) close();
  });

  dialog.showModal();
  return { dialog, body: $('[data-body]', dialog), close };
}

/** await confirmDialog({ title, message, confirmLabel, danger }) -> true / false */
export function confirmDialog({ title, message, confirmLabel = 'Confirm', danger = false }) {
  return new Promise((resolve) => {
    let confirmed = false;

    const { dialog, close } = openModal({
      title,
      width: 'max-w-md',
      content: `
        <div class="px-6 pb-6 pt-2">
          <p class="text-sm leading-relaxed text-muted">${esc(message)}</p>
          <div class="mt-6 flex justify-end gap-2">
            <button type="button" class="btn-secondary" data-close>Cancel</button>
            <button type="button" class="${danger ? 'btn-danger' : 'btn-primary'}" data-confirm>${esc(confirmLabel)}</button>
          </div>
        </div>`,
      onClose: () => resolve(confirmed),
    });

    const confirmButton = $('[data-confirm]', dialog);
    confirmButton.focus();
    confirmButton.addEventListener('click', () => {
      confirmed = true;
      close();
    });
  });
}

// ---------- menu ----------

/**
 * Dropdown menus driven by data attributes - no per-menu JavaScript needed:
 *
 *   <div class="relative" data-menu>
 *     <button data-menu-trigger>...</button>
 *     <div class="menu-panel hidden" data-menu-panel>...items...</div>
 *   </div>
 *
 * A click on the trigger toggles the panel; a click outside, on an item, or Esc closes it.
 */
const closeAll = (except) => {
  for (const panel of $$('[data-menu-panel]:not(.hidden)')) {
    if (panel === except) continue;
    panel.classList.add('hidden');
    panel.closest('[data-menu]')?.querySelector('[data-menu-trigger]')?.setAttribute('aria-expanded', 'false');
  }
};

export function initMenus() {
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-menu-trigger]');

    if (trigger) {
      const panel = trigger.closest('[data-menu]').querySelector('[data-menu-panel]');
      const willOpen = panel.classList.contains('hidden');
      closeAll(panel);
      panel.classList.toggle('hidden', !willOpen);
      trigger.setAttribute('aria-expanded', String(willOpen));
      return;
    }

    const insidePanel = event.target.closest('[data-menu-panel]');
    if (!insidePanel || event.target.closest('button, a')) closeAll();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeAll();
  });
}

// ---------- toast ----------

const STYLES = {
  success: { icon: 'checkCircle', className: 'text-leaf' },
  error: { icon: 'alert', className: 'text-danger' },
  info: { icon: 'info', className: 'text-accent' },
};

/**
 * toast('Contact saved')
 * toast('Something failed', 'error')
 * toast('Moved to trash', 'success', { action: { label: 'Undo', onClick: restore } })
 */
export function toast(message, type = 'success', { action } = {}) {
  const style = STYLES[type] ?? STYLES.info;
  const element = document.createElement('div');

  element.setAttribute('role', type === 'error' ? 'alert' : 'status');
  element.className =
    'pointer-events-auto flex items-start gap-3 rounded-xl bg-card px-4 py-3 text-sm shadow-pop animate-slide-in transition-opacity duration-200';
  element.innerHTML = `
    ${icon(style.icon, { size: 18, className: `mt-0.5 ${style.className}` })}
    <p class="flex-1 font-medium leading-snug">${esc(message)}</p>
    ${action ? `<button type="button" class="link -my-0.5 text-sm" data-toast-action>${esc(action.label)}</button>` : ''}`;

  const dismiss = () => {
    element.classList.add('opacity-0');
    setTimeout(() => element.remove(), 200);
  };

  if (action) {
    element.querySelector('[data-toast-action]').addEventListener('click', () => {
      dismiss();
      action.onClick();
    });
  }

  document.getElementById('toasts').append(element);
  setTimeout(dismiss, action ? 6000 : 3500);
}

export const toastError = (error) => toast(error?.message || 'Something went wrong', 'error');

// ---------- layout ----------

/*
 * The signed-in app shell: navy sidebar on the left, sticky header on top
 * and <main id="page"> where each page renders itself.
 */

const NAV_MAIN = [
  // The public home page lives outside the app, so it is never the "current" link here
  { href: '/', label: 'Home', icon: 'home', isActive: () => false },
  {
    href: '#/contacts',
    label: 'Contacts',
    icon: 'users',
    isActive: ({ path, query }) => path.startsWith('/contacts') && query.get('view') !== 'favourites',
  },
  {
    href: '#/contacts?view=favourites',
    label: 'Favourites',
    icon: 'star',
    isActive: ({ path, query }) => path === '/contacts' && query.get('view') === 'favourites',
  },
];

const NAV_TOOLS = [
  { href: '#/import', label: 'Import CSV', icon: 'upload', isActive: ({ path }) => path === '/import' },
  { href: '#/trash', label: 'Trash', icon: 'trash', isActive: ({ path }) => path === '/trash' },
];

const NAV_ADMIN = [{ href: '#/admin', label: 'Admin', icon: 'shield', isActive: ({ path }) => path === '/admin' }];

let mounted = false;
let quickSearchRequest = 0;

const navItems = () => [...NAV_MAIN, ...NAV_TOOLS, ...(session.isAdmin ? NAV_ADMIN : [])];

const navLink = (item) => `
  <a href="${item.href}" class="nav-link" data-nav="${item.href}">
    ${icon(item.icon)}
    <span class="flex-1">${item.label}</span>
  </a>`;

const sectionLabel = (text) => `<p class="mb-1.5 px-3 text-xs font-semibold text-white/40">${text}</p>`;

function sidebar() {
  return `
    <div class="flex h-full flex-col bg-navy text-white dark:border-r dark:border-rule">
      <a href="/" class="flex h-16 items-center px-5" title="Home page">${logo({ inverted: true })}</a>
      <nav class="scroll-thin flex-1 space-y-6 overflow-y-auto pb-6 pl-3 pr-3 lg:pr-4" aria-label="Main">
        <div class="space-y-0.5">${NAV_MAIN.map(navLink).join('')}</div>

        <div class="hidden" data-recent-section>
          ${sectionLabel('Recently viewed')}
          <div class="space-y-0.5" data-recent-list></div>
        </div>

        <div class="space-y-0.5">${sectionLabel('Tools')}${NAV_TOOLS.map(navLink).join('')}</div>

        ${session.isAdmin ? `<div class="space-y-0.5">${sectionLabel('Account')}${NAV_ADMIN.map(navLink).join('')}</div>` : ''}
      </nav>
    </div>`;
}

function themeMenu() {
  const current = THEMES.find((theme) => theme.value === getTheme()) ?? THEMES[2];
  return `
    <div class="relative hidden sm:block" data-menu>
      <button type="button" class="btn-icon" data-menu-trigger aria-label="Theme" aria-expanded="false" data-theme-icon>
        ${icon(current.icon)}
      </button>
      <div class="menu-panel hidden w-48" data-menu-panel>
        ${THEMES.map(
          (theme) => `
          <button type="button" class="menu-item" data-theme="${theme.value}">
            ${icon(theme.icon, { size: 16, className: 'text-muted' })}
            <span class="flex-1">${theme.label}</span>
            <span class="h-1.5 w-1.5 rounded-full bg-accent ${theme.value === current.value ? '' : 'hidden'}" data-theme-dot></span>
          </button>`,
        ).join('')}
      </div>
    </div>`;
}

function userMenu() {
  const { name, email, role } = session.user;
  return `
    <div class="relative" data-menu>
      <button type="button" class="rounded-lg transition hover:ring-4 hover:ring-well" data-menu-trigger aria-label="Account" aria-expanded="false">
        ${avatar({ name, size: 'sm' })}
      </button>
      <div class="menu-panel hidden w-64" data-menu-panel>
        <div class="px-2.5 py-2">
          <p class="truncate text-sm font-bold">${esc(name)}</p>
          <p class="truncate text-xs text-muted">${esc(email)}</p>
          <p class="mt-2"><span class="chip capitalize">${icon(role === 'admin' ? 'shield' : 'userCircle', { size: 12 })}${esc(role)}</span></p>
        </div>
        <div class="my-1 h-px bg-rule"></div>
        <p class="px-2.5 py-1.5 text-xs text-faint">Shortcuts: <kbd class="kbd">N</kbd> new contact, <kbd class="kbd">/</kbd> search</p>
        <div class="my-1 h-px bg-rule"></div>
        <button type="button" class="menu-item" data-sign-out>${icon('logOut', { size: 16, className: 'text-muted' })} Sign out</button>
      </div>
    </div>`;
}

function header() {
  return `
    <header class="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-rule/70 bg-paper/85 px-4 backdrop-blur sm:gap-3 sm:px-6 lg:px-8">
      <button type="button" class="btn-icon -ml-2 lg:hidden" data-open-nav aria-label="Open menu">${icon('menu', { size: 20 })}</button>
      <!-- On smaller screens the sidebar (with its Home link) is folded away, so Home sits here too -->
      <a href="/" class="btn-icon -ml-1 shrink-0 lg:hidden" aria-label="Home page" title="Home page">${icon('home', { size: 20 })}</a>

      <div class="relative min-w-0 max-w-md flex-1" data-quick-search>
        <label class="flex h-10 items-center gap-2.5 rounded-lg border border-rule bg-card px-3 text-sm transition focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/15">
          ${icon('search', { size: 16, className: 'text-faint' })}
          <input type="search" data-quick-input autocomplete="off" placeholder="Search contacts or jump to…"
            class="min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-faint" />
          <span class="hidden gap-1 sm:flex"><kbd class="kbd">Ctrl</kbd><kbd class="kbd">K</kbd></span>
        </label>
        <div class="menu-panel left-0 hidden w-full" data-quick-results></div>
      </div>

      <div class="hidden flex-1 sm:block"></div>

      <button type="button" class="btn-primary shrink-0 px-2.5 sm:px-3.5" data-new-contact title="New contact (N)">
        ${icon('plus', { size: 16, strokeWidth: 2.5 })}<span class="hidden sm:inline">New contact</span>
      </button>
      ${themeMenu()}
      ${userMenu()}
    </header>`;
}

/* ------------------------------------------------------------------ */
/* Behaviour                                                           */
/* ------------------------------------------------------------------ */

function updateActiveNav() {
  const location = parseHash();
  const active = navItems().find((item) => item.isActive(location));
  for (const link of $$('[data-nav]')) {
    if (link.dataset.nav === active?.href) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
}

async function refreshRecent() {
  try {
    const { data } = await api.recentContacts();
    for (const section of $$('[data-recent-section]')) section.classList.toggle('hidden', data.length === 0);
    const html = data
      .map(
        (contact) => `
        <a href="#/contacts/${contact.id}" class="flex h-8 items-center gap-3 rounded-lg px-3 text-[13px] font-medium text-white/65 hover:bg-white/[0.06] hover:text-white">
          ${avatar({ contact, size: 'xs' })}
          <span class="truncate">${esc(fullName(contact))}</span>
        </a>`,
      )
      .join('');
    for (const list of $$('[data-recent-list]')) list.innerHTML = html;
  } catch {
    /* the sidebar section is optional */
  }
}

function closeQuickSearch() {
  $('[data-quick-results]')?.classList.add('hidden');
}

const runQuickSearch = debounce(async (term) => {
  const results = $('[data-quick-results]');
  if (!results) return;
  if (!term) {
    closeQuickSearch();
    return;
  }

  const requestId = ++quickSearchRequest;
  try {
    const { data, pagination } = await api.listContacts({ search: term, limit: 6 });
    if (requestId !== quickSearchRequest) return; // an older, slower response

    const items = data
      .map(
        (contact) => `
        <a href="#/contacts/${contact.id}" class="menu-item h-auto py-2">
          ${avatar({ contact, size: 'sm' })}
          <span class="min-w-0 flex-1">
            <span class="block truncate font-semibold">${esc(fullName(contact))}</span>
            <span class="block truncate text-xs text-muted">${esc([contact.company, contact.email || contact.phone].filter(Boolean).join(' · '))}</span>
          </span>
        </a>`,
      )
      .join('');

    const seeAll =
      pagination.total > data.length
        ? `<a href="#/contacts?search=${encodeURIComponent(term)}" class="menu-item text-accent">See all ${pagination.total} results</a>`
        : '';

    results.innerHTML = items
      ? items + seeAll
      : `<p class="px-3 py-3 text-sm text-muted">No contacts match “${esc(term)}”</p>`;
    results.classList.remove('hidden');
  } catch {
    closeQuickSearch();
  }
}, 250);

function bindShell(root, { onSignOut }) {
  const quickInput = $('[data-quick-input]', root);

  quickInput.addEventListener('input', () => runQuickSearch(quickInput.value.trim()));
  quickInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && quickInput.value.trim()) {
      navigate(`/contacts?search=${encodeURIComponent(quickInput.value.trim())}`);
      quickInput.value = '';
      quickInput.blur();
      closeQuickSearch();
    }
    if (event.key === 'Escape') {
      quickInput.blur();
      closeQuickSearch();
    }
  });
  $('[data-quick-results]', root).addEventListener('click', (event) => {
    if (event.target.closest('a')) {
      quickInput.value = '';
      closeQuickSearch();
    }
  });
  root.addEventListener('click', (event) => {
    const target = event.target;

    if (target.closest('[data-new-contact]')) openContactForm();
    if (target.closest('[data-sign-out]')) onSignOut();
    if (target.closest('[data-open-nav]')) $('[data-mobile-nav]', root).classList.remove('hidden');
    if (target.closest('[data-close-nav]') || target.closest('[data-mobile-nav] a')) {
      $('[data-mobile-nav]', root).classList.add('hidden');
    }

    const themeButton = target.closest('[data-theme]');
    if (themeButton) {
      const theme = THEMES.find((item) => item.value === themeButton.dataset.theme);
      setTheme(theme.value);
      $('[data-theme-icon]', root).innerHTML = icon(theme.icon);
      for (const button of $$('[data-theme]', root)) {
        $('[data-theme-dot]', button).classList.toggle('hidden', button !== themeButton);
      }
    }
  });
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export function mountAppShell({ onSignOut }) {
  if (mounted) return;
  mounted = true;

  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="min-h-screen lg:grid lg:grid-cols-[256px_1fr]">
      <aside class="sticky top-0 hidden h-screen lg:block">${sidebar()}</aside>

      <div class="fixed inset-0 z-40 hidden lg:hidden" data-mobile-nav>
        <div class="absolute inset-0 animate-fade-in bg-black/40" data-close-nav></div>
        <div class="absolute inset-y-0 left-0 w-[272px] animate-slide-in">
          ${sidebar()}
          <button type="button" class="absolute right-3 top-5 text-white/70 hover:text-white" data-close-nav aria-label="Close menu">${icon('x', { size: 20 })}</button>
        </div>
      </div>

      <div class="flex min-w-0 flex-col">
        ${header()}
        <main id="page" class="w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8"></main>
      </div>
    </div>`;

  bindShell(app, { onSignOut });
  refreshRecent();
}

export function unmountAppShell() {
  mounted = false;
  document.getElementById('app').innerHTML = '';
}

/** Replaces the page content and returns the new page root element. */
export function mountPage(html) {
  updateActiveNav();
  const root = document.createElement('div');
  root.className = 'animate-fade-in';
  root.innerHTML = html;
  $('#page').replaceChildren(root);
  window.scrollTo({ top: 0 });
  return root;
}

export const focusQuickSearch = () => $('[data-quick-input]')?.focus();

/** Re-reads the "Recently viewed" list (e.g. after opening a contact). */
export const refreshSidebar = () => {
  if (mounted) refreshRecent();
};

document.addEventListener('click', (event) => {
  if (!event.target.closest('[data-quick-search]')) closeQuickSearch();
});
window.addEventListener(DATA_CHANGED, () => {
  if (mounted) refreshRecent();
});
window.addEventListener('hashchange', () => {
  if (mounted) updateActiveNav();
});
