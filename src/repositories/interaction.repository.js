import Interaction from '../models/Interaction.js';

const plain = (doc) => (doc ? doc.toObject() : null);

export async function findByContact(contactId) {
  const docs = await Interaction.find({ contactId }).sort({ date: -1, _id: -1 });
  return docs.map(plain);
}

export const findByIdForContact = async (id, contactId) =>
  plain(await Interaction.findOne({ _id: id, contactId }));

export const findByIdForUser = async (id, userId) => plain(await Interaction.findOne({ _id: id, userId }));

/**
 * Pending follow-ups in a date window, with the contact's name and photo
 * filled in by populate(). Follow-ups of contacts in the trash are left out.
 */
export async function findFollowUps(userId, { from, to }) {
  const filter = { userId, followUpDone: false, followUpDate: { $ne: null } };
  if (from) filter.followUpDate.$gte = from;
  if (to) filter.followUpDate.$lt = to;

  const docs = await Interaction.find(filter)
    .sort({ followUpDate: 1 })
    .populate({ path: 'contactId', select: 'firstName lastName company photoUrl isDeleted' });

  return docs
    .map(plain)
    .filter((item) => item.contactId && !item.contactId.isDeleted)
    .map(({ contactId: contact, ...item }) => ({ ...item, contactId: contact.id, contact }));
}

export const create = async (data) => plain(await Interaction.create(data));

export async function createMany(items) {
  const docs = await Interaction.insertMany(items);
  return docs.map(plain);
}

export const updateById = async (id, changes) =>
  plain(await Interaction.findByIdAndUpdate(id, changes, { returnDocument: 'after', runValidators: true }));

export const deleteById = (id) => Interaction.deleteOne({ _id: id });

export const deleteByContact = (contactId) => Interaction.deleteMany({ contactId });

export const clear = () => Interaction.deleteMany({});
