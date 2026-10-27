import { icon } from './shared.js';
import {
  api,
  navigate,
  onUnauthorized,
  route,
  session,
  setBeforeEach,
  setNotFound,
  setSessionToken,
  startRouter,
  tokenStore,
} from './core.js';
import { focusQuickSearch, initMenus, mountAppShell, mountPage, toast, unmountAppShell } from './ui.js';
import { openContactForm, renderContacts, renderTrash } from './contacts.js';
import { renderContactDetail } from './contactDetail.js';
import { renderImport } from './import.js';
import { renderAdmin, renderSignIn, renderSignUp } from './pages.js';

function signOut(message) {
  setSessionToken(null);
  session.clear();
  unmountAppShell();
  navigate('/signin');
  if (message) toast(message, 'info');
}

const showShell = () => mountAppShell({ onSignOut: () => signOut('Signed out') });

/* ------------------------------------------------------------------ */
/* Routes                                                              */
/* ------------------------------------------------------------------ */

route('/', () => navigate(session.user ? '/contacts' : '/signin'), { public: true });
route('/signin', renderSignIn, { guestOnly: true });
route('/signup', renderSignUp, { guestOnly: true });
route('/contacts', renderContacts);
route('/contacts/:id', renderContactDetail);
route('/import', renderImport);
route('/trash', renderTrash);
route('/admin', renderAdmin, { adminOnly: true });

setBeforeEach(({ meta }) => {
  if (meta.public) return true;

  if (meta.guestOnly) {
    if (!session.user) return true;
    navigate('/contacts');
    return false;
  }

  if (!session.user) {
    navigate('/signin');
    return false;
  }

  if (meta.adminOnly && !session.isAdmin) {
    toast('Only admins can open that page', 'error');
    navigate('/contacts');
    return false;
  }

  showShell();
  return true;
});

setNotFound(() => {
  if (!session.user) return navigate('/signin');
  showShell();
  mountPage(`
    <div class="flex flex-col items-center py-24 text-center">
      <div class="grid h-14 w-14 place-items-center rounded-2xl bg-well text-muted">${icon('search', { size: 24 })}</div>
      <h1 class="mt-4 text-2xl font-extrabold tracking-tight">Page not found</h1>
      <p class="mt-1 text-muted">That card is not in the cardfile.</p>
      <a href="#/contacts" class="btn-primary mt-6">Go to contacts</a>
    </div>`);
});

/* ------------------------------------------------------------------ */
/* Keyboard shortcuts: Ctrl+K quick search, / search the page, N new   */
/* ------------------------------------------------------------------ */

document.addEventListener('keydown', (event) => {
  if (!session.user) return;

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    focusQuickSearch();
    return;
  }

  const isTyping = event.target.closest('input, textarea, select, [contenteditable="true"]');
  if (isTyping || event.ctrlKey || event.metaKey || event.altKey || document.querySelector('dialog[open]')) return;

  if (event.key === '/') {
    event.preventDefault();
    const pageSearch = document.querySelector('[data-page-search]');
    if (pageSearch) pageSearch.focus();
    else focusQuickSearch();
  } else if (event.key.toLowerCase() === 'n') {
    event.preventDefault();
    openContactForm();
  }
});

/* ------------------------------------------------------------------ */
/* Start                                                               */
/* ------------------------------------------------------------------ */

async function boot() {
  initMenus();
  onUnauthorized(() => signOut('Your session has ended, please sign in again'));

  // Restore the session from a saved token
  if (tokenStore.get()) {
    try {
      const { data } = await api.me();
      session.set(data);
    } catch {
      setSessionToken(null);
    }
  }

  startRouter();
}

boot();
