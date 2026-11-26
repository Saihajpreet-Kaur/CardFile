export const fullName = (contact) => [contact?.firstName, contact?.lastName].filter(Boolean).join(' ') || 'Unnamed';

export const initials = (contact) =>
  [contact?.firstName, contact?.lastName]
    .filter(Boolean)
    .map((part) => part[0].toUpperCase())
    .join('')
    .slice(0, 2) || '?';

export const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

export const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
    : '';

const DAY_MS = 86_400_000;
const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

/** "today", "tomorrow", "3 days ago", "in 5 days" */
export function relativeDay(value) {
  if (!value) return '';
  const days = Math.round((startOfDay(new Date(value)) - startOfDay(new Date())) / DAY_MS);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  return days > 0 ? `in ${days} days` : `${-days} days ago`;
}

/** "overdue" | "today" | "upcoming" for a follow-up date */
export function followUpState(value) {
  const days = Math.round((startOfDay(new Date(value)) - startOfDay(new Date())) / DAY_MS);
  if (days < 0) return 'overdue';
  if (days === 0) return 'today';
  return 'upcoming';
}

/** "2026-11-23" for <input type="date"> */
export const toDateInput = (value = new Date()) => {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};

export const LIST_COLORS = {
  blue: 'bg-blue-100 text-blue-800',
  green: 'bg-emerald-100 text-emerald-800',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-800',
  purple: 'bg-purple-100 text-purple-800',
  slate: 'bg-slate-200 text-slate-800',
};

export const LIST_DOTS = {
  blue: 'bg-blue-500',
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  purple: 'bg-purple-500',
  slate: 'bg-slate-500',
};
