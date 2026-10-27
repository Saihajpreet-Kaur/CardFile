/* Account pages: sign in, sign up and the admin user list. */

import { $, $$, avatar, clearFieldErrors, esc, formatDate, icon, logo, showFieldErrors, withBusy } from './shared.js';
import { api, navigate, session, setSessionToken } from './core.js';
import { mountPage, toast, toastError, unmountAppShell } from './ui.js';

// ---------- auth ----------

// Seeded by `npm run seed` - local development only
const DEMO_ACCOUNT = { email: 'demo@crm.test', password: 'Demo@1234' };

const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (value) => value.length >= 8 },
  { label: 'An uppercase letter', test: (value) => /[A-Z]/.test(value) },
  { label: 'A lowercase letter', test: (value) => /[a-z]/.test(value) },
  { label: 'A number', test: (value) => /\d/.test(value) },
];

/* ------------------------------------------------------------------ */
/* Shared pieces                                                       */
/* ------------------------------------------------------------------ */

function illustration() {
  return `
    <div class="relative mx-auto h-[240px] w-full max-w-[380px]">
      <div class="index-card absolute inset-x-8 top-0 h-[190px] -rotate-[4deg] animate-deal-in"></div>
      <div class="index-card absolute inset-x-3 top-3 h-[190px] rotate-[2deg] animate-deal-in [animation-delay:.08s]"></div>
      <div class="index-card ruled absolute inset-x-0 top-7 text-ink shadow-pop animate-deal-in [animation-delay:.16s]">
        <div class="flex items-center gap-3 px-6 pt-7">
          ${avatar({ name: 'Meera Iyer', size: 'md' })}
          <div>
            <p class="font-bold">Meera Iyer</p>
            <p class="text-[13px] text-muted">Recruiter at Stellar Edu</p>
          </div>
        </div>
        <div class="px-6 pb-5 pt-3 text-[13px] leading-8 text-muted">
          <p>Follow up on Thursday about the demo</p>
          <p><span class="chip mr-2">#campus</span>Last call 3 days ago</p>
        </div>
      </div>
    </div>`;
}

function authLayout(formHtml) {
  return `
    <div class="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside class="hidden flex-col justify-between overflow-hidden bg-navy px-12 py-10 text-white lg:flex">
        <a href="/" class="self-start" title="Back to the home page">${logo({ inverted: true })}</a>
        <div class="py-10">
          ${illustration()}
          <h2 class="mt-24 max-w-md text-4xl font-extrabold leading-[1.1] tracking-tight">Every person you know, on one card.</h2>
          <p class="mt-4 max-w-md text-white/60">Keep details, tags and every call or meeting in one place, so you always know who to follow up with.</p>
        </div>
        <p class="text-xs text-white/40">Cardfile, a contact manager and mini CRM</p>
      </aside>

      <main class="flex items-center justify-center bg-paper px-5 py-12">
        <div class="w-full max-w-[400px] animate-fade-in">
          <a href="/" class="mb-10 inline-block lg:hidden" title="Back to the home page">${logo()}</a>
          ${formHtml}
        </div>
      </main>
    </div>`;
}

const textField = ({ name, label, type = 'text', autocomplete, placeholder = '' }) => `
  <label class="block">
    <span class="field-label">${label}</span>
    <input name="${name}" type="${type}" autocomplete="${autocomplete}" placeholder="${placeholder}" class="input h-11" />
    <p class="field-error" data-error-for="${name}"></p>
  </label>`;

const passwordField = ({ autocomplete }) => `
  <label class="block">
    <span class="field-label">Password</span>
    <span class="relative block">
      <input name="password" type="password" autocomplete="${autocomplete}" class="input h-11 pr-11" />
      <button type="button" class="btn-icon absolute right-1.5 top-1/2 h-8 w-8 -translate-y-1/2" data-toggle-password aria-label="Show password">
        ${icon('eye', { size: 16 })}
      </button>
    </span>
    <p class="mt-1.5 hidden items-center gap-1.5 text-[13px] font-semibold text-manila" data-caps-warning>
      ${icon('capsLock', { size: 15 })} Caps Lock is on
    </p>
    <p class="field-error" data-error-for="password"></p>
  </label>`;

const errorBox = () => `
  <div class="hidden items-start gap-3 rounded-lg bg-danger/10 px-3.5 py-3 text-sm" role="alert" data-auth-error>
    ${icon('alert', { size: 18, className: 'mt-0.5 text-danger' })}
    <p class="font-semibold" data-auth-error-text></p>
  </div>`;

function bindPasswordField(form) {
  const input = form.elements.password;
  const toggle = $('[data-toggle-password]', form);
  const capsWarning = $('[data-caps-warning]', form);

  toggle.addEventListener('click', () => {
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    toggle.innerHTML = icon(show ? 'eyeOff' : 'eye', { size: 16 });
    toggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  });

  const detectCaps = (event) => {
    const on = Boolean(event.getModifierState?.('CapsLock'));
    capsWarning.classList.toggle('hidden', !on);
    capsWarning.classList.toggle('flex', on);
  };
  input.addEventListener('keydown', detectCaps);
  input.addEventListener('keyup', detectCaps);
  input.addEventListener('blur', () => capsWarning.classList.add('hidden'));
}

function showAuthError(form, message) {
  const box = $('[data-auth-error]', form);
  $('[data-auth-error-text]', form).textContent = message;
  box.classList.toggle('hidden', !message);
  box.classList.toggle('flex', Boolean(message));
}

/** Shared submit flow for both forms. */
function bindAuthForm(form, request) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFieldErrors(form);
    showAuthError(form, '');

    try {
      const { data } = await withBusy($('[type="submit"]', form), () =>
        request(Object.fromEntries(new FormData(form))),
      );
      setSessionToken(data.token);
      session.set(data.user);
      navigate('/contacts');
    } catch (error) {
      if (!showFieldErrors(form, error)) showAuthError(form, error.message);
    }
  });
}

/* ------------------------------------------------------------------ */
/* Pages                                                               */
/* ------------------------------------------------------------------ */

export function renderSignIn() {
  unmountAppShell();
  const app = document.getElementById('app');

  app.innerHTML = authLayout(`
    <h1 class="text-3xl font-extrabold tracking-tight">Sign in</h1>
    <p class="mt-2 text-muted">New to Cardfile? <a href="#/signup" class="link">Create an account</a></p>

    <form class="mt-8 space-y-5" novalidate>
      ${textField({ name: 'email', label: 'Email', type: 'email', autocomplete: 'email', placeholder: 'you@example.com' })}
      ${passwordField({ autocomplete: 'current-password' })}
      ${errorBox()}
      <button type="submit" class="btn-primary h-11 w-full">Sign in</button>
    </form>

    <p class="mt-6 text-[13px] text-muted">
      Ran <code class="rounded bg-well px-1 py-0.5 text-[12px]">npm run seed</code>?
      <button type="button" class="link" data-fill-demo>Fill in the demo account</button>
    </p>`);

  const form = $('form', app);
  bindPasswordField(form);
  bindAuthForm(form, ({ email, password }) => api.login({ email, password }));

  $('[data-fill-demo]', app).addEventListener('click', () => {
    form.elements.email.value = DEMO_ACCOUNT.email;
    form.elements.password.value = DEMO_ACCOUNT.password;
    $('[type="submit"]', form).focus();
  });

  form.elements.email.focus();
}

export function renderSignUp() {
  unmountAppShell();
  const app = document.getElementById('app');

  app.innerHTML = authLayout(`
    <h1 class="text-3xl font-extrabold tracking-tight">Create your account</h1>
    <p class="mt-2 text-muted">Already have one? <a href="#/signin" class="link">Sign in</a></p>

    <form class="mt-8 space-y-5" novalidate>
      ${textField({ name: 'name', label: 'Full name', autocomplete: 'name', placeholder: 'Your name' })}
      ${textField({ name: 'email', label: 'Email', type: 'email', autocomplete: 'email', placeholder: 'you@example.com' })}
      ${passwordField({ autocomplete: 'new-password' })}
      <ul class="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[13px]" data-password-rules>
        ${PASSWORD_RULES.map(
          (rule, index) => `
          <li class="flex items-center gap-1.5 text-faint" data-rule="${index}">
            <span data-rule-icon>${icon('check', { size: 14 })}</span>${esc(rule.label)}
          </li>`,
        ).join('')}
      </ul>
      ${errorBox()}
      <button type="submit" class="btn-primary h-11 w-full">Create account</button>
    </form>`);

  const form = $('form', app);
  bindPasswordField(form);
  bindAuthForm(form, ({ name, email, password }) => api.register({ name, email, password }));

  // Live password checklist - mirrors the rules the API enforces
  form.elements.password.addEventListener('input', (event) => {
    for (const item of $$('[data-rule]', form)) {
      const passed = PASSWORD_RULES[item.dataset.rule].test(event.target.value);
      item.classList.toggle('text-leaf', passed);
      item.classList.toggle('font-semibold', passed);
      item.classList.toggle('text-faint', !passed);
    }
  });

  form.elements.name.focus();
}

// ---------- admin ----------

function row(user) {
  const isSelf = user.id === session.user.id;
  return `
    <tr data-id="${user.id}">
      <td class="px-5 py-3.5">
        <div class="flex items-center gap-3">
          ${avatar({ name: user.name, size: 'md' })}
          <div class="min-w-0">
            <p class="font-semibold">${esc(user.name)} ${isSelf ? '<span class="chip ml-1">You</span>' : ''}</p>
            <p class="truncate text-[13px] text-muted">${esc(user.email)}</p>
          </div>
        </div>
      </td>
      <td class="px-5 py-3.5">
        <select class="input h-9 w-32" data-role ${isSelf ? 'disabled title="You cannot change your own role"' : ''} aria-label="Role for ${esc(user.name)}">
          <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
          <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
        </select>
      </td>
      <td class="hidden px-5 py-3.5 tabular-nums sm:table-cell">${user.contactCount}</td>
      <td class="hidden px-5 py-3.5 text-muted md:table-cell">${formatDate(user.createdAt)}</td>
    </tr>`;
}

export async function renderAdmin() {
  const root = mountPage(`
    <div class="max-w-5xl">
      <div class="flex items-center gap-3">
        <span class="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent">${icon('shield', { size: 20 })}</span>
        <div>
          <h1 class="text-3xl font-extrabold tracking-tight">Admin</h1>
        </div>
      </div>
      <p class="mt-2 text-muted">Everyone with an account. Only admins can open this page (role-based access on the API).</p>

      <section class="panel mt-6 overflow-hidden">
        <div class="scroll-thin overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="border-b border-rule bg-well/60 text-[13px] text-muted">
              <tr>
                <th class="px-5 py-3 font-semibold">User</th>
                <th class="px-5 py-3 font-semibold">Role</th>
                <th class="hidden px-5 py-3 font-semibold sm:table-cell">Contacts</th>
                <th class="hidden px-5 py-3 font-semibold md:table-cell">Joined</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-rule" data-rows>
              <tr><td colspan="4" class="px-5 py-6"><div class="skeleton h-4 w-64"></div></td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>`);

  try {
    const { data: users } = await api.listUsers();
    $('[data-rows]', root).innerHTML = users.map(row).join('');
  } catch (error) {
    toastError(error);
  }

  root.addEventListener('change', async (event) => {
    const select = event.target.closest('[data-role]');
    if (!select) return;

    const previous = select.value === 'admin' ? 'user' : 'admin';
    try {
      const { message } = await api.updateUserRole(select.closest('[data-id]').dataset.id, select.value);
      toast(message);
    } catch (error) {
      select.value = previous;
      toastError(error);
    }
  });
}
