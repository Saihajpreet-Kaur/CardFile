import * as dashboardRepository from '../repositories/dashboard.repository.js';
import { listFollowUps } from './interaction.service.js';
import { remember, userKey } from './cache.service.js';
import { INTERACTION_TYPES } from '../constants/index.js';

const CACHE_TTL_SECONDS = 60;
const DAY_MS = 86_400_000;

const monthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

/** The last 6 months, oldest first, with 0 for months without new contacts. */
function fillMonths(rows, chartStart) {
  const counts = Object.fromEntries(rows.map((row) => [row._id, row.count]));
  return Array.from({ length: 6 }, (_, i) => {
    const date = new Date(chartStart.getFullYear(), chartStart.getMonth() + i, 1);
    const key = monthKey(date);
    return { month: key, count: counts[key] ?? 0 };
  });
}

async function buildSummary(userId, now) {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const chartStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const [contacts, interactions, dueSoon] = await Promise.all([
    dashboardRepository.contactStats(userId, { monthStart, lastMonthStart, chartStart }),
    dashboardRepository.interactionStats(userId, {
      dueBefore: tomorrow,
      upcomingBefore: new Date(tomorrow.getTime() + 7 * DAY_MS),
    }),
    listFollowUps(userId, 'all', now),
  ]);

  const totals = contacts.totals[0] ?? { total: 0, favourites: 0, inTrash: 0, addedThisMonth: 0, addedLastMonth: 0 };
  const followUps = interactions.followUps[0] ?? { due: 0, upcoming: 0 };
  const byType = Object.fromEntries(interactions.byType.map((row) => [row._id, row.count]));

  return {
    totals: {
      contacts: totals.total,
      favourites: totals.favourites,
      inTrash: totals.inTrash,
      addedThisMonth: totals.addedThisMonth,
      addedLastMonth: totals.addedLastMonth,
      followUpsDue: followUps.due,
      followUpsUpcoming: followUps.upcoming,
    },
    contactsByMonth: fillMonths(contacts.byMonth, chartStart),
    topTags: contacts.topTags.map((row) => ({ tag: row._id, count: row.count })),
    topCompanies: contacts.topCompanies.map((row) => ({ company: row._id, count: row.count })),
    interactionsByType: INTERACTION_TYPES.map((type) => ({ type, count: byType[type] ?? 0 })),
    // The next follow-ups to show on the dashboard (overdue first)
    nextFollowUps: dueSoon.slice(0, 5),
    generatedAt: now.toISOString(),
  };
}

/** Cached for 60 seconds per user; any change to the user's data clears it (see activity.events.js). */
export async function getSummary(userId) {
  return remember(userKey(userId, 'dashboard'), CACHE_TTL_SECONDS, () => buildSummary(userId, new Date()));
}

