/* App core: API client, hash router, signed-in session and colour theme. */

// ---------- api ----------

/**
 * Small fetch wrapper around the CRM REST API.
 * Adds the JWT header, sends JSON or FormData and turns error responses into ApiError.
 */

const TOKEN_KEY = 'crm_token';

export const tokenStore = {
  get() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* storage unavailable (private mode) - user stays logged in until refresh */
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
};

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

let unauthorizedHandler = () => {};
export const onUnauthorized = (handler) => {
  unauthorizedHandler = handler;
};

let memoryToken = null;

async function request(path, { method = 'GET', body, formData, raw = false } = {}) {
  const token = memoryToken ?? tokenStore.get();
  const headers = {};
  let payload;

  if (token) headers.Authorization = `Bearer ${token}`;
  if (formData) {
    payload = formData; // the browser sets the multipart boundary itself
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const response = await fetch(`/api${path}`, { method, headers, body: payload });

  if (raw && response.ok) return response;

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && token) unauthorizedHandler();
    throw new ApiError(data.message || `Request failed (${response.status})`, response.status, data.details);
  }
  return data;
}

export const toQuery = (params) => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') query.set(key, value);
  }
  return query.toString();
};

export const setSessionToken = (token) => {
  memoryToken = token;
  if (token) tokenStore.set(token);
  else tokenStore.clear();
};

export const api = {
  login: (credentials) => request('/auth/login', { method: 'POST', body: credentials }),
  register: (details) => request('/auth/register', { method: 'POST', body: details }),
  me: () => request('/auth/me'),

  listContacts: (params) => request(`/contacts?${toQuery(params)}`),
  recentContacts: () => request('/contacts/recent'),
  getContact: (id) => request(`/contacts/${id}`),
  createContact: (contact) => request('/contacts', { method: 'POST', body: contact }),
  updateContact: (id, contact) => request(`/contacts/${id}`, { method: 'PUT', body: contact }),
  toggleFavourite: (id) => request(`/contacts/${id}/favourite`, { method: 'PATCH' }),
  trashContact: (id) => request(`/contacts/${id}`, { method: 'DELETE' }),
  restoreContact: (id) => request(`/contacts/${id}/restore`, { method: 'PATCH' }),
  deleteContactForever: (id) => request(`/contacts/${id}/permanent`, { method: 'DELETE' }),

  uploadPhoto: (id, file) => {
    const formData = new FormData();
    formData.append('photo', file);
    return request(`/contacts/${id}/photo`, { method: 'POST', formData });
  },

  importCsv: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request('/contacts/import', { method: 'POST', formData });
  },

  exportCsv: (params) => request(`/contacts/export?${toQuery(params)}`, { raw: true }),

  listInteractions: (contactId) => request(`/contacts/${contactId}/interactions`),
  addInteraction: (contactId, interaction) =>
    request(`/contacts/${contactId}/interactions`, { method: 'POST', body: interaction }),
  deleteInteraction: (contactId, interactionId) =>
    request(`/contacts/${contactId}/interactions/${interactionId}`, { method: 'DELETE' }),

  listUsers: () => request('/users'),
  updateUserRole: (userId, role) => request(`/users/${userId}/role`, { method: 'PATCH', body: { role } }),
};

// ---------- router ----------

/**
 * Tiny hash router: "#/contacts/42?tab=calls" -> { path: '/contacts/42', params: { id: '42' }, query }.
 * Hash URLs need no server configuration - Express only ever serves index.html.
 */

const routes = [];
let notFoundHandler = () => {};
let beforeEach = () => true;
let cleanup = null;
let renderCount = 0;

/** pattern like "/contacts/:id" */
export function route(pattern, handler, meta = {}) {
  const keys = [];
  const regex = new RegExp(
    `^${pattern.replace(/:(\w+)/g, (_, key) => {
      keys.push(key);
      return '([^/]+)';
    })}/?$`,
  );
  routes.push({ regex, keys, handler, meta });
}

export const setNotFound = (handler) => {
  notFoundHandler = handler;
};

/** Guard: return false (after redirecting) to stop a route from rendering. */
export const setBeforeEach = (guard) => {
  beforeEach = guard;
};

export function parseHash() {
  const raw = location.hash.slice(1) || '/';
  const [path, queryString = ''] = raw.split('?');
  return { path: path || '/', query: new URLSearchParams(queryString) };
}

export function navigate(path) {
  if (location.hash === `#${path}`) render();
  else location.hash = path;
}

/** Updates the query string without re-rendering the page (filters, pagination). */
export function replaceQuery(params) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') query.set(key, value);
  }
  const { path } = parseHash();
  const queryString = query.toString();
  history.replaceState(null, '', `#${path}${queryString ? `?${queryString}` : ''}`);
}

export async function render() {
  const { path, query } = parseHash();

  let match = null;
  for (const candidate of routes) {
    const result = candidate.regex.exec(path);
    if (result) {
      const params = Object.fromEntries(candidate.keys.map((key, index) => [key, decodeURIComponent(result[index + 1])]));
      match = { ...candidate, params };
      break;
    }
  }

  if (typeof cleanup === 'function') cleanup();
  cleanup = null;

  if (!match) {
    notFoundHandler({ path });
    return;
  }

  if (!beforeEach({ path, meta: match.meta })) return;

  const renderId = ++renderCount;
  const pageCleanup = await match.handler({ params: match.params, query, path });

  // The user already moved to another page while this one was loading
  if (renderId !== renderCount) {
    if (typeof pageCleanup === 'function') pageCleanup();
    return;
  }
  cleanup = pageCleanup;
}

export function startRouter() {
  window.addEventListener('hashchange', render);
  render();
}

// ---------- session ----------

/** The signed-in user, shared by the layout and the pages. */
let currentUser = null;

export const session = {
  get user() {
    return currentUser;
  },
  get isAdmin() {
    return currentUser?.role === 'admin';
  },
  set(user) {
    currentUser = user;
  },
  clear() {
    currentUser = null;
  },
};

// ---------- theme ----------

const STORAGE_KEY = 'cardfile-theme';
const media = window.matchMedia('(prefers-color-scheme: dark)');

export const THEMES = [
  { value: 'light', label: 'Light', icon: 'sun' },
  { value: 'dark', label: 'Dark', icon: 'moon' },
  { value: 'system', label: 'Match system', icon: 'monitor' },
];

export function getTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY) || 'system';
  } catch {
    return 'system';
  }
}

function applyTheme(theme) {
  const dark = theme === 'dark' || (theme === 'system' && media.matches);
  document.documentElement.classList.toggle('dark', dark);
}

export function setTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* storage unavailable - the theme still applies until reload */
  }
  applyTheme(theme);
}

// Follow the operating system when the user picked "Match system"
media.addEventListener('change', () => applyTheme(getTheme()));
