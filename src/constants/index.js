export const ROLES = Object.freeze({
  USER: 'user',
  ADMIN: 'admin',
});

export const INTERACTION_TYPES = Object.freeze(['call', 'email', 'meeting']);

export const CONTACT_STATUS = Object.freeze({
  ACTIVE: 'active',
  TRASH: 'trash',
});

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

export const PHONE_REGEX = /^\+?\d{7,15}$/;

export const RECENTLY_VIEWED_LIMIT = 5;

export const ALLOWED_CSV_MIME_TYPES = Object.freeze([
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel',
  'text/plain',
  'application/octet-stream', 
]);

export const ALLOWED_IMAGE_MIME_TYPES = Object.freeze({
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
});
