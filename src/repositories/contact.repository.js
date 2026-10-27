import JsonStore from './jsonStore.js';
import { CONTACT_STATUS } from '../constants/index.js';
import { paginate, sortRecords } from '../utils/listQuery.js';

const contacts = new JsonStore('contacts');

const SEARCHABLE_FIELDS = ['firstName', 'lastName', 'email', 'phone', 'company', 'designation'];

const matchesSearch = (contact, search) => {
  const term = search.toLowerCase();
  const fullName = `${contact.firstName} ${contact.lastName}`.toLowerCase();

  return (
    fullName.includes(term) ||
    SEARCHABLE_FIELDS.some((field) => contact[field]?.toLowerCase().includes(term)) ||
    contact.tags.some((tag) => tag.includes(term))
  );
};

/** Builds a single predicate from the list filters, like a MongoDB filter object. */
const buildFilter = (userId, { status, search, tag, company, favourite }) => (contact) => {
  if (contact.userId !== userId) return false;
  if (contact.isDeleted !== (status === CONTACT_STATUS.TRASH)) return false;
  if (favourite !== undefined && contact.isFavourite !== favourite) return false;
  if (tag && !contact.tags.includes(tag.toLowerCase())) return false;
  if (company && !contact.company?.toLowerCase().includes(company.toLowerCase())) return false;
  if (search && !matchesSearch(contact, search)) return false;
  return true;
};

/** Paginated list: returns { items, pagination }. */
export const findPaginated = async (userId, filters, { sort, page, limit }) => {
  const matching = await contacts.find(buildFilter(userId, filters));
  return paginate(sortRecords(matching, sort), { page, limit });
};

/** Every matching contact (no pagination) - used by CSV export. */
export const findAllMatching = async (userId, filters, { sort }) => {
  const matching = await contacts.find(buildFilter(userId, filters));
  return sortRecords(matching, sort);
};

export const findByIdForUser = (id, userId) =>
  contacts.findOne((contact) => contact.id === id && contact.userId === userId);

/** Email/phone must be unique per user (across active and trashed contacts). */
export const findDuplicate = (userId, { email, phone }, excludeId) =>
  contacts.findOne(
    (contact) =>
      contact.userId === userId &&
      contact.id !== excludeId &&
      ((email && contact.email === email) || (phone && contact.phone === phone)),
  );

export const findAllForUser = (userId) => contacts.find((contact) => contact.userId === userId);

export const findRecentlyViewed = async (userId, limit) => {
  const viewed = await contacts.find(
    (contact) => contact.userId === userId && !contact.isDeleted && contact.lastViewedAt,
  );
  return sortRecords(viewed, '-lastViewedAt').slice(0, limit);
};

export const countForUser = (userId) =>
  contacts.count((contact) => contact.userId === userId && !contact.isDeleted);

export const create = (data) => contacts.insert(data);

export const createMany = (items) => contacts.insertMany(items);

export const updateById = (id, changes) => contacts.updateById(id, changes);

export const deleteById = (id) => contacts.deleteById(id);

export const clear = () => contacts.clear();
