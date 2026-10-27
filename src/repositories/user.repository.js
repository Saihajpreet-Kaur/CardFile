import JsonStore from './jsonStore.js';

const users = new JsonStore('users');

export const findById = (id) => users.findById(id);

export const findByEmail = (email) => users.findOne((user) => user.email === email);

export const findAll = async () => {
  const records = await users.find();
  return records.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
};

export const create = (data) => users.insert(data);

export const updateById = (id, changes) => users.updateById(id, changes);

export const clear = () => users.clear();
