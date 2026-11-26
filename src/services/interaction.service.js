import * as interactionRepository from '../repositories/interaction.repository.js';
import AppError from '../utils/AppError.js';
import { findActiveContact, findOwnedContact } from './contact.service.js';
import { ACTIVITY, emitActivity } from '../events/activity.events.js';

const DAY_MS = 86_400_000;

export async function addInteraction(userId, contactId, { type, note, date, followUpDate }) {
  await findActiveContact(userId, contactId);

  const interaction = await interactionRepository.create({
    contactId,
    userId,
    type,
    note,
    date: date ?? new Date(),
    followUpDate: followUpDate ?? null,
  });

  emitActivity(ACTIVITY.INTERACTION_ADDED, { userId, contactId, interactionId: interaction.id });
  return interaction;
}

export async function listInteractions(userId, contactId) {
  await findOwnedContact(userId, contactId);
  return interactionRepository.findByContact(contactId);
}

export async function deleteInteraction(userId, contactId, interactionId) {
  await findOwnedContact(userId, contactId);

  const interaction = await interactionRepository.findByIdForContact(interactionId, contactId);
  if (!interaction) throw AppError.notFound('Interaction not found');

  await interactionRepository.deleteById(interactionId);
  emitActivity(ACTIVITY.INTERACTION_DELETED, { userId, contactId, interactionId });
}

/** Marks a follow-up as done (or not done again), so it leaves the "due" list. */
export async function setFollowUpDone(userId, contactId, interactionId, done) {
  await findOwnedContact(userId, contactId);

  const interaction = await interactionRepository.findByIdForContact(interactionId, contactId);
  if (!interaction) throw AppError.notFound('Interaction not found');
  if (!interaction.followUpDate) throw AppError.badRequest('This interaction has no follow-up date');

  const updated = await interactionRepository.updateById(interactionId, { followUpDone: done });
  emitActivity(ACTIVITY.FOLLOW_UP_DONE, { userId, contactId, interactionId, done });
  return updated;
}

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());


export function listFollowUps(userId, status = 'all', now = new Date()) {
  const today = startOfDay(now);
  const tomorrow = new Date(today.getTime() + DAY_MS);
  const windows = {
    overdue: { to: today },
    today: { from: today, to: tomorrow },
    upcoming: { from: tomorrow, to: new Date(tomorrow.getTime() + 7 * DAY_MS) },
    all: {},
  };
  return interactionRepository.findFollowUps(userId, windows[status]);
}
