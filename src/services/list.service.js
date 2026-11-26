import * as listRepository from '../repositories/list.repository.js';
import * as contactRepository from '../repositories/contact.repository.js';
import { LIST_LIMITS } from '../constants/index.js';
import AppError from '../utils/AppError.js';
import { omitUndefined } from '../utils/sanitize.js';
import { ACTIVITY, emitActivity } from '../events/activity.events.js';

/** The list must exist and belong to the logged-in user. */
export async function findOwnedList(userId, listId) {
  const list = await listRepository.findByIdForUser(listId, userId);
  if (!list) throw AppError.notFound('List not found');
  return list;
}

export function getLists(userId) {
  return listRepository.findAllWithCounts(userId);
}

export async function createList(userId, { name, description, color }) {
  if ((await listRepository.countForUser(userId)) >= LIST_LIMITS.MAX_LISTS) {
    throw AppError.badRequest(`You can have at most ${LIST_LIMITS.MAX_LISTS} lists`);
  }

  const list = await listRepository.create(omitUndefined({ userId, name, description, color }));
  emitActivity(ACTIVITY.LIST_CREATED, { userId, listId: list.id });
  return list;
}

export async function updateList(userId, listId, { name, description, color }) {
  await findOwnedList(userId, listId);

  const list = await listRepository.updateById(listId, omitUndefined({ name, description, color }));
  emitActivity(ACTIVITY.LIST_UPDATED, { userId, listId });
  return list;
}

export async function deleteList(userId, listId) {
  await findOwnedList(userId, listId);
  await listRepository.deleteById(listId);
  emitActivity(ACTIVITY.LIST_DELETED, { userId, listId });
}

/** Adds or removes contacts to/from a list. Contacts of other users are silently ignored. */
export async function changeMembers(userId, listId, { contactIds, action }) {
  await findOwnedList(userId, listId);

  const changed = await contactRepository.updateListMembership(userId, contactIds, listId, action);
  emitActivity(ACTIVITY.LIST_MEMBERS_CHANGED, { userId, listId, action, changed });
  return { changed };
}

