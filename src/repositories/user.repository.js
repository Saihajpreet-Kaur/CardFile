import User from '../models/User.js';

const plain = (doc) => (doc ? doc.toObject() : null);

export const findById = async (id) => plain(await User.findById(id));

/** Includes passwordHash (hidden by default) - only the login check needs it. */
export const findByEmail = async (email) => plain(await User.findByEmailWithPassword(email));

export const existsByEmail = async (email) => Boolean(await User.exists({ email: email.toLowerCase() }));

export async function findAll() {
  const docs = await User.find().sort({ createdAt: 1 });
  return docs.map(plain);
}

export const create = async (data) => plain(await User.create(data));

export const updateById = async (id, changes) =>
  plain(await User.findByIdAndUpdate(id, changes, { returnDocument: 'after', runValidators: true }));

export const clear = () => User.deleteMany({});
