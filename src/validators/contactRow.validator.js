import validator from 'validator';
import { CONTACT_LIMITS, PHONE_REGEX } from '../constants/index.js';
import {
  normalizeEmail,
  normalizePhone,
  normalizeTags,
  stripTags,
} from '../utils/sanitize.js';

export function validateContactRow(row) {
  const contact = {
    firstName: stripTags(row.firstName ?? ''),
    lastName: stripTags(row.lastName ?? ''),
    email: normalizeEmail(row.email ?? ''),
    phone: normalizePhone(row.phone ?? ''),
    company: stripTags(row.company ?? ''),
    designation: stripTags(row.designation ?? ''),
    tags: normalizeTags(row.tags),
    notes: stripTags(row.notes ?? ''),
  };

  const errors = [];

  if (!contact.firstName) errors.push('firstName is required');
  else if (contact.firstName.length > CONTACT_LIMITS.NAME_MAX) {
    errors.push(`firstName must be at most ${CONTACT_LIMITS.NAME_MAX} characters`);
  }
  if (contact.lastName.length > CONTACT_LIMITS.NAME_MAX) {
    errors.push(`lastName must be at most ${CONTACT_LIMITS.NAME_MAX} characters`);
  }
  if (!contact.email && !contact.phone) errors.push('email or phone is required');
  if (contact.email && !validator.isEmail(contact.email)) errors.push('email is not valid');
  if (contact.phone && !PHONE_REGEX.test(contact.phone)) {
    errors.push('phone must contain 7-15 digits (optional leading +)');
  }
  for (const field of ['company', 'designation']) {
    if (contact[field].length > CONTACT_LIMITS.TEXT_MAX) {
      errors.push(`${field} must be at most ${CONTACT_LIMITS.TEXT_MAX} characters`);
    }
  }
  if (contact.notes.length > CONTACT_LIMITS.NOTES_MAX) {
    errors.push(`notes must be at most ${CONTACT_LIMITS.NOTES_MAX} characters`);
  }
  if (contact.tags.length > CONTACT_LIMITS.TAGS_MAX_COUNT) {
    errors.push(`at most ${CONTACT_LIMITS.TAGS_MAX_COUNT} tags are allowed`);
  }

  return { contact, errors };
}
