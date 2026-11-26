import mongoose from 'mongoose';
import Contact from '../models/Contact.js';
import Interaction from '../models/Interaction.js';

/**
 * Contact statistics in ONE aggregation query: $facet runs several pipelines
 * over the same matched documents and returns all results together.
 */
export async function contactStats(userId, { monthStart, lastMonthStart, chartStart }) {
  const [stats] = await Contact.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              total: { $sum: { $cond: ['$isDeleted', 0, 1] } },
              favourites: { $sum: { $cond: [{ $and: [{ $not: '$isDeleted' }, '$isFavourite'] }, 1, 0] } },
              inTrash: { $sum: { $cond: ['$isDeleted', 1, 0] } },
              addedThisMonth: {
                $sum: { $cond: [{ $and: [{ $not: '$isDeleted' }, { $gte: ['$createdAt', monthStart] }] }, 1, 0] },
              },
              addedLastMonth: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $not: '$isDeleted' },
                        { $gte: ['$createdAt', lastMonthStart] },
                        { $lt: ['$createdAt', monthStart] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
            },
          },
        ],
        // Contacts added per month for the chart (last 6 months)
        byMonth: [
          { $match: { isDeleted: false, createdAt: { $gte: chartStart } } },
          { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ],
        topTags: [
          { $match: { isDeleted: false } },
          { $unwind: '$tags' },
          { $group: { _id: '$tags', count: { $sum: 1 } } },
          { $sort: { count: -1, _id: 1 } },
          { $limit: 5 },
        ],
        topCompanies: [
          { $match: { isDeleted: false, company: { $gt: '' } } },
          { $group: { _id: '$company', count: { $sum: 1 } } },
          { $sort: { count: -1, _id: 1 } },
          { $limit: 5 },
        ],
      },
    },
  ]);

  return stats;
}

/** Interaction counts by type, plus pending follow-ups that are due or overdue. */
export async function interactionStats(userId, { dueBefore, upcomingBefore }) {
  const [stats] = await Interaction.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $facet: {
        byType: [{ $group: { _id: '$type', count: { $sum: 1 } } }],
        followUps: [
          { $match: { followUpDone: false, followUpDate: { $ne: null } } },
          // Skip follow-ups of contacts that are in the trash
          { $lookup: { from: 'contacts', localField: 'contactId', foreignField: '_id', as: 'contact' } },
          { $match: { 'contact.isDeleted': false } },
          {
            $group: {
              _id: null,
              due: { $sum: { $cond: [{ $lt: ['$followUpDate', dueBefore] }, 1, 0] } },
              upcoming: {
                $sum: {
                  $cond: [
                    { $and: [{ $gte: ['$followUpDate', dueBefore] }, { $lt: ['$followUpDate', upcomingBefore] }] },
                    1,
                    0,
                  ],
                },
              },
            },
          },
        ],
      },
    },
  ]);

  return stats;
}

