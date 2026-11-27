export const ROLES = Object.freeze({
  USER: 'user',
  ADMIN: 'admin',
});

export const INTERACTION_TYPES = Object.freeze(['call', 'email', 'meeting']);

export const CONTACT_STATUS = Object.freeze({
  ACTIVE: 'active',
  TRASH: 'trash',
});

// Fields a client is allowed to sort the contact list by ("-" prefix = descending)
export const CONTACT_SORT_FIELDS = Object.freeze([
  'createdAt',
  'updatedAt',
  'firstName',
  'lastName',
  'email',
  'company',
]);

export const CONTACT_SORT_OPTIONS = Object.freeze(
  CONTACT_SORT_FIELDS.flatMap((field) => [field, `-${field}`]),
);

export const PAGINATION = Object.freeze({
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
});

export const CONTACT_LIMITS = Object.freeze({
  NAME_MAX: 50,
  TEXT_MAX: 100,
  NOTES_MAX: 1000,
  TAG_MAX: 30,
  TAGS_MAX_COUNT: 10,
});

export const LIST_COLORS = Object.freeze(['blue', 'green', 'amber', 'red', 'purple', 'slate']);

export const LIST_LIMITS = Object.freeze({
  NAME_MAX: 40,
  DESCRIPTION_MAX: 200,
  MAX_LISTS: 50,
});

// Follow-up windows for GET /api/followups?status=...
export const FOLLOW_UP_STATUS = Object.freeze(['overdue', 'today', 'upcoming', 'all']);

// Phone numbers are stored as digits with an optional leading "+", e.g. +919876543210
export const PHONE_REGEX = /^\+?\d{7,15}$/;

export const RECENTLY_VIEWED_LIMIT = 5;

export const ALLOWED_CSV_MIME_TYPES = Object.freeze([
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel', // Windows browsers report .csv files with this type
  'text/plain',
  'application/octet-stream', // sent when no app is registered for .csv (and by curl)
]);

export const ALLOWED_IMAGE_MIME_TYPES = Object.freeze({
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
});
