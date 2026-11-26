import mongoose from 'mongoose';
import Contact from '../models/Contact.js';
import { CONTACT_STATUS } from '../constants/index.js';
import { paginationMeta, skipFor, sortWithTieBreaker } from '../utils/listQuery.js';
import { escapeRegex } from '../utils/sanitize.js';

const plain = (doc) => (doc ? doc.toObject() : null);

const SEARCHABLE_FIELDS = ['firstName', 'lastName', 'email', 'phone', 'company', 'designation'];

// Case-insensitive sorting where "Item 2" comes before "Item 10"
const COLLATION = { locale: 'en', strength: 2, numericOrdering: true };

/** Turns the list filters into a MongoDB filter object. Every query is scoped to the owner. */
function buildFilter(userId, { status, search, tag, company, favourite, list }) {
  const filter = { userId, isDeleted: status === CONTACT_STATUS.TRASH };

  if (favourite !== undefined) filter.isFavourite = favourite;
  if (tag) filter.tags = tag.toLowerCase();
  if (company) filter.company = new RegExp(escapeRegex(company), 'i');
  if (list) filter.lists = list;

  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    filter.$or = [...SEARCHABLE_FIELDS.map((field) => ({ [field]: pattern })), { tags: pattern }];

    // "aarav sharma" should also match firstName "Aarav" + lastName "Sharma"
    const [first, ...rest] = search.trim().split(/\s+/);
    if (rest.length > 0) {
      filter.$or.push({
        firstName: new RegExp(`^${escapeRegex(first)}`, 'i'),
        lastName: new RegExp(`^${escapeRegex(rest.join(' '))}`, 'i'),
      });
    }
  }
  return filter;
}

/** Paginated list: the database sorts, skips and limits, then counts the matches. */
export async function findPaginated(userId, filters, { sort, page, limit }) {
  const filter = buildFilter(userId, filters);

  const [docs, total] = await Promise.all([
    Contact.find(filter)
      .sort(sortWithTieBreaker(sort))
      .collation(COLLATION)
      .skip(skipFor({ page, limit }))
      .limit(limit),
    Contact.countDocuments(filter),
  ]);

  return { items: docs.map(plain), pagination: paginationMeta({ page, limit, total }) };
}

/** Every matching contact as a MongoDB cursor - CSV export streams it without loading all at once. */
export const streamMatching = (userId, filters, { sort }) =>
  Contact.find(buildFilter(userId, filters)).sort(sortWithTieBreaker(sort)).collation(COLLATION).cursor();

export const countMatching = (userId, filters) => Contact.countDocuments(buildFilter(userId, filters));

export const findByIdForUser = async (id, userId) => plain(await Contact.findOwned(userId, id));

/** One contact with its lists' names and colours filled in (populate). */
export const findByIdWithLists = async (id, userId) =>
  plain(await Contact.findOwned(userId, id).populate('lists', 'name color'));

/** Email/phone must be unique per user (across active and trashed contacts). */
export async function findDuplicate(userId, { email, phone }, excludeId) {
  const conditions = [];
  if (email) conditions.push({ email });
  if (phone) conditions.push({ phone });
  if (conditions.length === 0) return null;

  const filter = { userId, $or: conditions };
  if (excludeId) filter._id = { $ne: excludeId };
  return plain(await Contact.findOne(filter));
}

/** Emails and phones of all the user's contacts - used to spot duplicates during CSV import. */
export const findContactKeys = (userId) =>
  Contact.find({ userId }).select('email phone').lean();

export async function findRecentlyViewed(userId, limit) {
  const docs = await Contact.find({ userId, isDeleted: false, lastViewedAt: { $ne: null } })
    .sort({ lastViewedAt: -1 })
    .limit(limit);
  return docs.map(plain);
}

/** Active contacts per user, for the admin page: { userId: count } (aggregation). */
export async function countActiveByUser() {
  const rows = await Contact.aggregate([
    { $match: { isDeleted: false } },
    { $group: { _id: '$userId', count: { $sum: 1 } } },
  ]);
  return Object.fromEntries(rows.map((row) => [row._id.toString(), row.count]));
}

/** Distinct tags of the user's active contacts, most used first. */
export async function findTags(userId) {
  const rows = await Contact.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), isDeleted: false } },
    { $unwind: '$tags' },
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
  ]);
  return rows.map((row) => ({ tag: row._id, count: row.count }));
}

export const create = async (data) => plain(await Contact.create(data));

export async function createMany(items) {
  const docs = await Contact.insertMany(items);
  return docs.map(plain);
}

export const updateById = async (id, changes) =>
  plain(await Contact.findByIdAndUpdate(id, changes, { returnDocument: 'after', runValidators: true }));

/** Hard delete. The model's findOneAndDelete middleware also deletes the contact's interactions. */
export const deleteById = (id) => Contact.findOneAndDelete({ _id: id });

/** Adds or removes many contacts to/from a list in one query. */
export async function updateListMembership(userId, contactIds, listId, action) {
  const update = action === 'add' ? { $addToSet: { lists: listId } } : { $pull: { lists: listId } };
  const result = await Contact.updateMany({ _id: { $in: contactIds }, userId }, update);
  return result.modifiedCount;
}

export const clear = () => Contact.deleteMany({});
