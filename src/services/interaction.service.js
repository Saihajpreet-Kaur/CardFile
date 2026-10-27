import * as interactionRepository from '../repositories/interaction.repository.js';
import AppError from '../utils/AppError.js';
import { findActiveContact, findOwnedContact } from './contact.service.js';
import { ACTIVITY, emitActivity } from '../events/activity.events.js';

export async function addInteraction(userId, contactId, { type, note, date, followUpDate }) {
  await findActiveContact(userId, contactId);

  const interaction = await interactionRepository.create({
    contactId,
    userId,
    type,
    note,
    date: date ?? new Date().toISOString(),
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
}
