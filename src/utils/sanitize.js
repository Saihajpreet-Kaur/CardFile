import { CONTACT_LIMITS } from '../constants/index.js';

/** Removes HTML tags so stored text can never carry markup or scripts. */
export const stripTags = (value) =>
  typeof value === 'string' ? value.replace(/<[^>]*>/g, '').trim() : value;

/** "+91 98765-43210" -> "+919876543210" so duplicates are detected regardless of formatting. */
export const normalizePhone = (value) =>
  typeof value === 'string' ? value.replace(/[^\d+]/g, '') : value;

export const normalizeEmail = (value) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

/**
 * Accepts an array or a delimited string ("vip, lead; client") and returns
 * a clean, de-duplicated, lowercase array of tags.
 */
export const normalizeTags = (value) => {
  if (value === undefined || value === null || value === '') return [];

  const rawTags = Array.isArray(value) ? value : String(value).split(/[,;|]/);

  const tags = rawTags
    .map((tag) => stripTags(String(tag)).toLowerCase())
    .filter(Boolean)
    .map((tag) => tag.slice(0, CONTACT_LIMITS.TAG_MAX));

  return [...new Set(tags)];
};

/** Returns a copy of the object without keys whose value is undefined. */
export const omitUndefined = (object) =>
  Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined));
