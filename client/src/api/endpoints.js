import api from './client';

// Every call returns the "data" part of the API's { success, data } response
const data = (request) => request.then((response) => response.data.data);

// Drops empty filters so URLs stay short: { search: '', page: 2 } -> { page: 2 }
const clean = (params) =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => value !== '' && value !== undefined && value !== null));

export const authApi = {
  login: (body) => data(api.post('/auth/login', body)),
  register: (body) => data(api.post('/auth/register', body)),
  me: () => data(api.get('/auth/me')),
};

export const contactsApi = {
  /** Returns { data, pagination } - the list endpoint also sends pagination details */
  list: (params) => api.get('/contacts', { params: clean(params) }).then((response) => response.data),
  get: (id) => data(api.get(`/contacts/${id}`)),
  create: (body) => data(api.post('/contacts', body)),
  update: (id, body) => data(api.put(`/contacts/${id}`, body)),
  trash: (id) => data(api.delete(`/contacts/${id}`)),
  restore: (id) => data(api.patch(`/contacts/${id}/restore`)),
  destroy: (id) => data(api.delete(`/contacts/${id}/permanent`)),
  toggleFavourite: (id) => data(api.patch(`/contacts/${id}/favourite`)),
  recent: () => data(api.get('/contacts/recent')),
  tags: () => data(api.get('/contacts/tags')),

  uploadPhoto: (id, file, onProgress) => {
    const form = new FormData();
    form.append('photo', file);
    return data(api.post(`/contacts/${id}/photo`, form, { onUploadProgress: progressHandler(onProgress) }));
  },

  importCsv: (file, onProgress) => {
    const form = new FormData();
    form.append('file', file);
    return data(api.post('/contacts/import', form, { onUploadProgress: progressHandler(onProgress) }));
  },

  /** Downloads the filtered view as a CSV file */
  exportCsv: async (params) => {
    const response = await api.get('/contacts/export', { params: clean(params), responseType: 'blob' });
    const match = /filename="([^"]+)"/.exec(response.headers['content-disposition'] ?? '');
    saveBlob(response.data, match?.[1] ?? 'contacts.csv');
  },
};

export const interactionsApi = {
  list: (contactId) => data(api.get(`/contacts/${contactId}/interactions`)),
  add: (contactId, body) => data(api.post(`/contacts/${contactId}/interactions`, body)),
  remove: (contactId, id) => data(api.delete(`/contacts/${contactId}/interactions/${id}`)),
  setFollowUpDone: (contactId, id, done) =>
    data(api.patch(`/contacts/${contactId}/interactions/${id}/follow-up`, { done })),
  followUps: (status) => data(api.get('/followups', { params: { status } })),
};

export const listsApi = {
  list: () => data(api.get('/lists')),
  create: (body) => data(api.post('/lists', body)),
  update: (id, body) => data(api.put(`/lists/${id}`, body)),
  remove: (id) => data(api.delete(`/lists/${id}`)),
  changeMembers: (id, action, contactIds) => data(api.patch(`/lists/${id}/contacts`, { action, contactIds })),
};

export const dashboardApi = {
  summary: () => data(api.get('/dashboard/summary')),
};

export const usersApi = {
  list: () => data(api.get('/users')),
  setRole: (id, role) => data(api.patch(`/users/${id}/role`, { role })),
};

function progressHandler(onProgress) {
  if (!onProgress) return undefined;
  return (event) => {
    if (event.total) onProgress(Math.round((event.loaded / event.total) * 100));
  };
}

function saveBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
