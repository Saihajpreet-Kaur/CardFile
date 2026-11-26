import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { auth, startTestServer } from './setup.js';

let api;
let stop;
let signUp;

before(async () => {
  ({ api, stop, signUp } = await startTestServer());
});

after(async () => {
  await stop();
});

describe('health and pages', () => {
  test('GET /api/health reports the database as connected', async () => {
    const res = await api.get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.database, 'connected');
    assert.equal(res.body.data.cache, 'memory');
  });

  test('GET / renders the EJS home page', async () => {
    const res = await api.get('/').set('Accept', 'text/html');
    assert.equal(res.status, 200);
    assert.match(res.text, /<html/);
  });

  test('unknown API route returns 404 JSON', async () => {
    const res = await api.get('/api/does-not-exist');
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
  });

  test('security headers and CORS are set', async () => {
    const res = await api.get('/api/health').set('Origin', 'http://localhost:5173');
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.equal(res.headers['access-control-allow-origin'], 'http://localhost:5173');

    const blocked = await api.get('/api/health').set('Origin', 'http://evil.example');
    assert.equal(blocked.headers['access-control-allow-origin'], undefined);
  });
});

describe('authentication', () => {
  test('register ignores a requested role and never returns the password hash', async () => {
    const res = await api
      .post('/api/auth/register')
      .send({ name: 'Role Test', email: 'role.test@crm.test', password: 'Test@1234', role: 'admin' });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.user.role, 'user');
    assert.equal(res.body.data.user.passwordHash, undefined);
    assert.ok(res.body.data.token);
    assert.ok(res.body.data.user.id);
  });

  test('duplicate email returns 409, invalid body returns 422', async () => {
    const dup = await api
      .post('/api/auth/register')
      .send({ name: 'Role Test', email: 'role.test@crm.test', password: 'Test@1234' });
    assert.equal(dup.status, 409);

    const bad = await api.post('/api/auth/register').send({ name: '', email: 'x', password: '1' });
    assert.equal(bad.status, 422);
    assert.ok(bad.body.details.length >= 2);
  });

  test('login works with the right password only', async () => {
    const ok = await api.post('/api/auth/login').send({ email: 'role.test@crm.test', password: 'Test@1234' });
    assert.equal(ok.status, 200);
    const wrong = await api.post('/api/auth/login').send({ email: 'role.test@crm.test', password: 'Wrong@1234' });
    assert.equal(wrong.status, 401);
  });

  test('protected routes need a valid token', async () => {
    assert.equal((await api.get('/api/auth/me')).status, 401);
    assert.equal((await api.get('/api/auth/me').set(auth('abc.def.ghi'))).status, 401);
  });
});

describe('contacts', () => {
  let token;
  let other;
  let contactId;

  before(async () => {
    ({ token } = await signUp('Contact Owner'));
    other = await signUp('Someone Else');
  });

  test('create cleans the input (tags stripped, email lower-cased, phone normalized)', async () => {
    const res = await api
      .post('/api/contacts')
      .set(auth(token))
      .send({
        firstName: '<b>Zoya</b>',
        lastName: 'Khan',
        email: 'ZOYA.KHAN@Example.com',
        phone: '+91 98765 11111',
        company: 'Smoke Co',
        tags: 'VIP, lead; vip',
      });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.firstName, 'Zoya');
    assert.equal(res.body.data.email, 'zoya.khan@example.com');
    assert.equal(res.body.data.phone, '+919876511111');
    assert.deepEqual(res.body.data.tags, ['vip', 'lead']);
    assert.equal(res.body.data._id, undefined, 'documents expose "id", not "_id"');
    contactId = res.body.data.id;
  });

  test('duplicates by email or phone return 409', async () => {
    const byEmail = await api.post('/api/contacts').set(auth(token)).send({ firstName: 'Dup', email: 'zoya.khan@example.com' });
    assert.equal(byEmail.status, 409);
    const byPhone = await api.post('/api/contacts').set(auth(token)).send({ firstName: 'Dup', phone: '+919876511111' });
    assert.equal(byPhone.status, 409);
  });

  test('the same email is allowed for a different user', async () => {
    const res = await api.post('/api/contacts').set(auth(other.token)).send({ firstName: 'Zoya', email: 'zoya.khan@example.com' });
    assert.equal(res.status, 201);
  });

  test('two identical requests at the same time create only one contact (unique index)', async () => {
    const body = { firstName: 'Race', email: 'race@example.com' };
    const results = await Promise.all([
      api.post('/api/contacts').set(auth(token)).send(body),
      api.post('/api/contacts').set(auth(token)).send(body),
    ]);
    const statuses = results.map((res) => res.status).sort();
    assert.deepEqual(statuses, [201, 409]);
  });

  test('validation: missing first name, no email and no phone, bad id', async () => {
    assert.equal((await api.post('/api/contacts').set(auth(token)).send({ email: 'x@y.com' })).status, 422);
    assert.equal((await api.post('/api/contacts').set(auth(token)).send({ firstName: 'Nobody' })).status, 422);
    assert.equal((await api.get('/api/contacts/not-an-id').set(auth(token))).status, 422);
  });

  test("another user's contact is not found", async () => {
    const res = await api.get(`/api/contacts/${contactId}`).set(auth(other.token));
    assert.equal(res.status, 404);
  });

  test('update, favourite and recently viewed', async () => {
    const updated = await api.put(`/api/contacts/${contactId}`).set(auth(token)).send({ designation: 'CTO', company: '' });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.data.designation, 'CTO');
    assert.equal(updated.body.data.company, '');

    const fav = await api.patch(`/api/contacts/${contactId}/favourite`).set(auth(token));
    assert.equal(fav.body.data.isFavourite, true);

    await api.get(`/api/contacts/${contactId}`).set(auth(token));
    const recent = await api.get('/api/contacts/recent').set(auth(token));
    assert.equal(recent.body.data[0].id, contactId);
  });

  test('soft delete, restore and hard delete (with cascade to interactions)', async () => {
    await api.post(`/api/contacts/${contactId}/interactions`).set(auth(token)).send({ type: 'call', note: 'Hello' });

    assert.equal((await api.delete(`/api/contacts/${contactId}`).set(auth(token))).status, 200);
    const trash = await api.get('/api/contacts?status=trash').set(auth(token));
    assert.ok(trash.body.data.some((contact) => contact.id === contactId));

    assert.equal((await api.patch(`/api/contacts/${contactId}/restore`).set(auth(token))).status, 200);
    assert.equal((await api.delete(`/api/contacts/${contactId}/permanent`).set(auth(token))).status, 400);

    await api.delete(`/api/contacts/${contactId}`).set(auth(token));
    assert.equal((await api.delete(`/api/contacts/${contactId}/permanent`).set(auth(token))).status, 200);
    assert.equal((await api.get(`/api/contacts/${contactId}`).set(auth(token))).status, 404);

    const Interaction = (await import('../src/models/Interaction.js')).default;
    assert.equal(await Interaction.countDocuments({ contactId }), 0);
  });
});

describe('list query: pagination, sorting, search and filters run in MongoDB', () => {
  let token;

  before(async () => {
    ({ token } = await signUp('Pager'));
    const names = ['Item 10', 'Item 2', 'aarav', 'Bina', 'chetan', 'Dev', 'Esha', 'farhan', 'Gita', 'Hari', 'Isha', 'Jai'];
    for (const [i, firstName] of names.entries()) {
      await api
        .post('/api/contacts')
        .set(auth(token))
        .send({
          firstName,
          lastName: i === 2 ? 'Sharma' : 'Test',
          email: `p${i}@example.com`,
          company: i % 2 ? 'Infosys' : 'TCS',
          tags: i < 3 ? ['vip'] : ['lead'],
          isFavourite: i === 4,
        });
    }
  });

  test('pages do not overlap and report totals', async () => {
    const page1 = await api.get('/api/contacts?page=1&limit=5&sort=firstName').set(auth(token));
    const page3 = await api.get('/api/contacts?page=3&limit=5&sort=firstName').set(auth(token));
    assert.equal(page1.body.pagination.total, 12);
    assert.equal(page1.body.pagination.totalPages, 3);
    assert.equal(page1.body.pagination.hasNextPage, true);
    assert.equal(page3.body.data.length, 2);
    assert.equal(page3.body.pagination.hasNextPage, false);
  });

  test('sorting is case-insensitive and numeric-aware', async () => {
    const res = await api.get('/api/contacts?limit=100&sort=firstName').set(auth(token));
    const names = res.body.data.map((contact) => contact.firstName);
    assert.deepEqual(names.slice(0, 3), ['aarav', 'Bina', 'chetan']);
    assert.ok(names.indexOf('Item 2') < names.indexOf('Item 10'));
  });

  test('search matches name, company and full name', async () => {
    const byName = await api.get('/api/contacts?search=sharma').set(auth(token));
    assert.equal(byName.body.data.length, 1);
    const fullName = await api.get('/api/contacts?search=aarav%20sharma').set(auth(token));
    assert.equal(fullName.body.data.length, 1);
    const regexChars = await api.get('/api/contacts?search=.*').set(auth(token));
    assert.equal(regexChars.body.data.length, 0, 'search text is escaped, not run as a regex');
  });

  test('filters: tag, company, favourite', async () => {
    assert.equal((await api.get('/api/contacts?tag=vip').set(auth(token))).body.pagination.total, 3);
    assert.equal((await api.get('/api/contacts?company=infosys').set(auth(token))).body.pagination.total, 6);
    assert.equal((await api.get('/api/contacts?favourite=true').set(auth(token))).body.pagination.total, 1);
  });

  test('invalid query values return 422', async () => {
    assert.equal((await api.get('/api/contacts?limit=1000').set(auth(token))).status, 422);
    assert.equal((await api.get('/api/contacts?sort=password').set(auth(token))).status, 422);
  });

  test('tags endpoint counts tags with an aggregation', async () => {
    const res = await api.get('/api/contacts/tags').set(auth(token));
    assert.deepEqual(res.body.data[0], { tag: 'lead', count: 9 });
  });
});

describe('lists', () => {
  let token;
  let contactIds;
  let listId;

  before(async () => {
    ({ token } = await signUp('List Owner'));
    contactIds = [];
    for (const name of ['One', 'Two', 'Three']) {
      const res = await api.post('/api/contacts').set(auth(token)).send({ firstName: name, email: `${name}@list.example` });
      contactIds.push(res.body.data.id);
    }
  });

  test('create a list; duplicate names (any case) return 409', async () => {
    const res = await api.post('/api/lists').set(auth(token)).send({ name: 'Clients', color: 'green' });
    assert.equal(res.status, 201);
    listId = res.body.data.id;
    assert.equal((await api.post('/api/lists').set(auth(token)).send({ name: 'clients' })).status, 409);
  });

  test('add contacts, filter the contact list by list, and count members', async () => {
    const add = await api.patch(`/api/lists/${listId}/contacts`).set(auth(token)).send({ action: 'add', contactIds: contactIds.slice(0, 2) });
    assert.equal(add.body.data.changed, 2);

    const filtered = await api.get(`/api/contacts?list=${listId}`).set(auth(token));
    assert.equal(filtered.body.pagination.total, 2);

    const lists = await api.get('/api/lists').set(auth(token));
    assert.equal(lists.body.data[0].contactCount, 2);

    const detail = await api.get(`/api/contacts/${contactIds[0]}`).set(auth(token));
    assert.equal(detail.body.data.lists[0].name, 'Clients', 'lists are populated on the detail endpoint');
  });

  test('deleting a list removes it from its contacts', async () => {
    await api.delete(`/api/lists/${listId}`).set(auth(token));
    const detail = await api.get(`/api/contacts/${contactIds[0]}`).set(auth(token));
    assert.deepEqual(detail.body.data.lists, []);
  });
});

describe('interactions, follow-ups and dashboard', () => {
  let token;
  let contactId;
  let interactionId;

  before(async () => {
    ({ token } = await signUp('Dash Owner'));
    const res = await api.post('/api/contacts').set(auth(token)).send({ firstName: 'Follow', email: 'follow@example.com', tags: ['client'] });
    contactId = res.body.data.id;
  });

  test('add interactions; invalid type returns 422', async () => {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString();
    const res = await api
      .post(`/api/contacts/${contactId}/interactions`)
      .set(auth(token))
      .send({ type: 'call', note: 'Intro call', followUpDate: yesterday });
    assert.equal(res.status, 201);
    interactionId = res.body.data.id;

    const bad = await api.post(`/api/contacts/${contactId}/interactions`).set(auth(token)).send({ type: 'fax', note: 'x' });
    assert.equal(bad.status, 422);
  });

  test('overdue follow-ups include the contact (populate)', async () => {
    const res = await api.get('/api/followups?status=overdue').set(auth(token));
    assert.equal(res.body.data.length, 1);
    assert.equal(res.body.data[0].contact.firstName, 'Follow');
  });

  test('dashboard summary is computed, then cached, then refreshed after a change', async () => {
    const first = await api.get('/api/dashboard/summary').set(auth(token));
    assert.equal(first.status, 200);
    assert.equal(first.headers['x-cache'], 'MISS');
    assert.equal(first.body.data.totals.contacts, 1);
    assert.equal(first.body.data.totals.addedThisMonth, 1);
    assert.equal(first.body.data.totals.followUpsDue, 1);
    assert.equal(first.body.data.contactsByMonth.length, 6);
    assert.deepEqual(first.body.data.topTags, [{ tag: 'client', count: 1 }]);

    const second = await api.get('/api/dashboard/summary').set(auth(token));
    assert.equal(second.headers['x-cache'], 'HIT');

    // Completing the follow-up changes the data, which clears the cached summary
    const done = await api.patch(`/api/contacts/${contactId}/interactions/${interactionId}/follow-up`).set(auth(token)).send({ done: true });
    assert.equal(done.status, 200);

    const third = await api.get('/api/dashboard/summary').set(auth(token));
    assert.equal(third.headers['x-cache'], 'MISS');
    assert.equal(third.body.data.totals.followUpsDue, 0);
  });
});

describe('CSV import and export', () => {
  let token;

  before(async () => {
    ({ token } = await signUp('Csv Owner'));
  });

  test('imports the sample file: 4 rows saved, 4 reported', async () => {
    const csv = await readFile(path.resolve(import.meta.dirname, '..', 'samples', 'contacts-import-sample.csv'));
    const res = await api.post('/api/contacts/import').set(auth(token)).attach('file', csv, { filename: 'contacts.csv', contentType: 'text/csv' });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.imported, 4);
    assert.equal(res.body.data.failed, 4);
    assert.ok(res.body.data.errors.every((error) => error.line && error.errors.length));
  });

  test('wrong file type returns 415, no file returns 400', async () => {
    const png = await api.post('/api/contacts/import').set(auth(token)).attach('file', Buffer.from('x'), { filename: 'x.png', contentType: 'image/png' });
    assert.equal(png.status, 415);
    assert.equal((await api.post('/api/contacts/import').set(auth(token))).status, 400);
  });

  test('export streams the filtered view as CSV', async () => {
    const res = await api.get('/api/contacts/export?sort=firstName').set(auth(token));
    assert.equal(res.status, 200);
    assert.match(res.headers['content-type'], /text\/csv/);
    const lines = res.text.trim().split('\n');
    assert.equal(lines.length, 5, 'header + 4 contacts');
    assert.match(lines[0], /First Name/);
  });
});

describe('admin', () => {
  test('normal users get 403; admins can list users and change roles', async () => {
    const normal = await signUp('Plain User');
    assert.equal((await api.get('/api/users').set(auth(normal.token))).status, 403);

    const User = (await import('../src/models/User.js')).default;
    const admin = await signUp('Admin Person');
    await User.updateOne({ email: admin.email }, { role: 'admin' });

    const users = await api.get('/api/users').set(auth(admin.token));
    assert.equal(users.status, 200);
    assert.ok(users.body.data.every((user) => typeof user.contactCount === 'number'));

    const changed = await api.patch(`/api/users/${normal.user.id}/role`).set(auth(admin.token)).send({ role: 'admin' });
    assert.equal(changed.status, 200);
    assert.equal(changed.body.data.role, 'admin');
  });
});

