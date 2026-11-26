import mongoose from 'mongoose';
import ContactList from '../models/ContactList.js';

const plain = (doc) => (doc ? doc.toObject() : null);

/**
 * The user's lists with how many active contacts each one has.
 * $lookup joins the contacts collection inside one aggregation query.
 */
export async function findAllWithCounts(userId) {
  const rows = await ContactList.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $lookup: {
        from: 'contacts',
        let: { listId: '$_id' },
        pipeline: [
          { $match: { $expr: { $in: ['$$listId', '$lists'] }, isDeleted: false } },
          { $count: 'count' },
        ],
        as: 'stats',
      },
    },
    {
      $project: {
        _id: 0,
        id: { $toString: '$_id' },
        name: 1,
        description: 1,
        color: 1,
        createdAt: 1,
        contactCount: { $ifNull: [{ $first: '$stats.count' }, 0] },
      },
    },
    { $sort: { name: 1 } },
  ]).collation({ locale: 'en', strength: 2 });

  return rows;
}

export const findByIdForUser = async (id, userId) => plain(await ContactList.findOne({ _id: id, userId }));

export const countForUser = (userId) => ContactList.countDocuments({ userId });

export const create = async (data) => plain(await ContactList.create(data));

export const updateById = async (id, changes) =>
  plain(await ContactList.findByIdAndUpdate(id, changes, { returnDocument: 'after', runValidators: true }));

/** The model's findOneAndDelete middleware removes the list from every contact. */
export const deleteById = (id) => ContactList.findOneAndDelete({ _id: id });

export const clear = () => ContactList.deleteMany({});

