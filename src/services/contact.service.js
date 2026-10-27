import config from '../config/index.js';
import { CONTACT_STATUS, PAGINATION, RECENTLY_VIEWED_LIMIT } from '../constants/index.js';
import * as contactRepository from '../repositories/contact.repository.js';
import * as interactionRepository from '../repositories/interaction.repository.js';
import { validateContactRow } from '../validators/contactRow.validator.js';
import AppError from '../utils/AppError.js';
import { omitUndefined } from '../utils/sanitize.js';
import { parseCsv } from './csv.service.js';
import { uploadImage } from './storage.service.js';
import { ACTIVITY, emitActivity } from '../events/activity.events.js';

const EDITABLE_FIELDS = [
  'firstName',
  'lastName',
  'email',
  'phone',
  'company',
  'designation',
  'tags',
  'notes',
  'isFavourite',
];

/** Shape of a contact document (the future Mongoose schema defaults). */
const CONTACT_DEFAULTS = Object.freeze({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  company: '',
  designation: '',
  tags: [],
  notes: '',
  photoUrl: '',
  isFavourite: false,
  isDeleted: false,
  deletedAt: null,
  lastViewedAt: null,
});

const pickEditable = (data) =>
  omitUndefined(Object.fromEntries(EDITABLE_FIELDS.map((field) => [field, data[field]])));

/* ------------------------------------------------------------------ */
/* Guards                                                              */
/* ------------------------------------------------------------------ */

/** Contact must exist and belong to the logged-in user (active or in trash). */
export async function findOwnedContact(userId, contactId) {
  const contact = await contactRepository.findByIdForUser(contactId, userId);
  if (!contact) throw AppError.notFound('Contact not found');
  return contact;
}

/** Contact must exist, belong to the user and not be in trash. */
export async function findActiveContact(userId, contactId) {
  const contact = await findOwnedContact(userId, contactId);
  if (contact.isDeleted) {
    throw AppError.badRequest('This contact is in trash. Restore it before making changes');
  }
  return contact;
}

function ensureReachable({ email, phone }) {
  if (!email && !phone) {
    throw AppError.validation([{ field: 'email', message: 'Either email or phone is required' }]);
  }
}

async function ensureNoDuplicate(userId, { email, phone }, excludeId) {
  const duplicate = await contactRepository.findDuplicate(userId, { email, phone }, excludeId);
  if (!duplicate) return;

  const field = email && duplicate.email === email ? 'email' : 'phone';
  const location = duplicate.isDeleted ? ' (in trash)' : '';

  throw AppError.conflict(`A contact with this ${field} already exists${location}`, {
    field,
    duplicateId: duplicate.id,
    inTrash: duplicate.isDeleted,
  });
}

/* ------------------------------------------------------------------ */
/* Queries                                                             */
/* ------------------------------------------------------------------ */

function buildListQuery(query) {
  return {
    filters: {
      status: query.status ?? CONTACT_STATUS.ACTIVE,
      search: query.search || undefined,
      tag: query.tag || undefined,
      company: query.company || undefined,
      favourite: query.favourite,
    },
    options: {
      sort: query.sort ?? '-createdAt',
      page: query.page ?? PAGINATION.DEFAULT_PAGE,
      limit: query.limit ?? PAGINATION.DEFAULT_LIMIT,
    },
  };
}

export function listContacts(userId, query) {
  const { filters, options } = buildListQuery(query);
  return contactRepository.findPaginated(userId, filters, options);
}

/** Same filters as the list, without pagination - "export the current view". */
export async function findContactsForExport(userId, query) {
  const { filters, options } = buildListQuery(query);
  const contacts = await contactRepository.findAllMatching(userId, filters, options);

  emitActivity(ACTIVITY.CONTACTS_EXPORTED, { userId, count: contacts.length });
  return contacts;
}

export function getRecentlyViewed(userId) {
  return contactRepository.findRecentlyViewed(userId, RECENTLY_VIEWED_LIMIT);
}

/** Returns one contact and records the view for the "recently viewed" list. */
export async function getContact(userId, contactId) {
  const contact = await findOwnedContact(userId, contactId);
  if (contact.isDeleted) return contact;

  return contactRepository.updateById(contactId, { lastViewedAt: new Date().toISOString() });
}

/* ------------------------------------------------------------------ */
/* Commands                                                            */
/* ------------------------------------------------------------------ */

export async function createContact(userId, data) {
  const contact = { userId, ...CONTACT_DEFAULTS, ...pickEditable(data) };

  ensureReachable(contact);
  await ensureNoDuplicate(userId, contact);

  const created = await contactRepository.create(contact);
  emitActivity(ACTIVITY.CONTACT_CREATED, { userId, contactId: created.id });
  return created;
}

export async function updateContact(userId, contactId, data) {
  const existing = await findActiveContact(userId, contactId);
  const changes = pickEditable(data);
  const merged = { ...existing, ...changes };

  ensureReachable(merged);
  await ensureNoDuplicate(userId, merged, contactId);

  const updated = await contactRepository.updateById(contactId, changes);
  emitActivity(ACTIVITY.CONTACT_UPDATED, { userId, contactId, fields: Object.keys(changes) });
  return updated;
}

export async function toggleFavourite(userId, contactId) {
  const contact = await findActiveContact(userId, contactId);
  return contactRepository.updateById(contactId, { isFavourite: !contact.isFavourite });
}

export async function updatePhoto(userId, contactId, file) {
  await findActiveContact(userId, contactId);
  const photoUrl = await uploadImage(file);
  return contactRepository.updateById(contactId, { photoUrl });
}

/** Soft delete: the contact moves to trash and can be restored later. */
export async function moveToTrash(userId, contactId) {
  await findActiveContact(userId, contactId);

  const contact = await contactRepository.updateById(contactId, {
    isDeleted: true,
    deletedAt: new Date().toISOString(),
  });
  emitActivity(ACTIVITY.CONTACT_DELETED, { userId, contactId });
  return contact;
}

export async function restoreContact(userId, contactId) {
  const contact = await findOwnedContact(userId, contactId);
  if (!contact.isDeleted) throw AppError.badRequest('Contact is not in trash');

  const restored = await contactRepository.updateById(contactId, {
    isDeleted: false,
    deletedAt: null,
  });
  emitActivity(ACTIVITY.CONTACT_RESTORED, { userId, contactId });
  return restored;
}

/** Hard delete: only allowed from trash, and removes the contact's interactions too. */
export async function deletePermanently(userId, contactId) {
  const contact = await findOwnedContact(userId, contactId);
  if (!contact.isDeleted) {
    throw AppError.badRequest('Move the contact to trash before deleting it permanently');
  }

  await contactRepository.deleteById(contactId);
  await interactionRepository.deleteByContact(contactId);
  emitActivity(ACTIVITY.CONTACT_PURGED, { userId, contactId });
}

/**
 * Bulk import. Each row is validated on its own: valid rows are saved,
 * invalid rows are reported back with their line number and reasons.
 */
export async function importContacts(userId, file) {
  const rows = parseCsv(file.buffer);

  if (rows.length === 0) throw AppError.badRequest('The CSV file has no data rows');
  if (rows.length > config.uploads.maxImportRows) {
    throw AppError.badRequest(
      `A single import can contain at most ${config.uploads.maxImportRows} rows`,
    );
  }

  const existing = await contactRepository.findAllForUser(userId);
  const knownEmails = new Set(existing.map((contact) => contact.email).filter(Boolean));
  const knownPhones = new Set(existing.map((contact) => contact.phone).filter(Boolean));

  const contactsToCreate = [];
  const failedRows = [];

  for (const { line, data } of rows) {
    const { contact, errors } = validateContactRow(data);

    if (contact.email && knownEmails.has(contact.email)) {
      errors.push('duplicate email (already saved or repeated in this file)');
    }
    if (contact.phone && knownPhones.has(contact.phone)) {
      errors.push('duplicate phone (already saved or repeated in this file)');
    }

    if (errors.length > 0) {
      failedRows.push({ line, errors, data });
      continue;
    }

    if (contact.email) knownEmails.add(contact.email);
    if (contact.phone) knownPhones.add(contact.phone);
    contactsToCreate.push({ userId, ...CONTACT_DEFAULTS, ...contact });
  }

  const created = contactsToCreate.length
    ? await contactRepository.createMany(contactsToCreate)
    : [];

  emitActivity(ACTIVITY.CONTACTS_IMPORTED, {
    userId,
    imported: created.length,
    failed: failedRows.length,
  });

  return {
    totalRows: rows.length,
    imported: created.length,
    failed: failedRows.length,
    errors: failedRows,
  };
}
