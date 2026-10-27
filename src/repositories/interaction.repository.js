import JsonStore from './jsonStore.js';
import { sortRecords } from '../utils/listQuery.js';

const interactions = new JsonStore('interactions');

export const findByContact = async (contactId) => {
  const records = await interactions.find((interaction) => interaction.contactId === contactId);
  return sortRecords(records, '-date');
};

export const findByIdForContact = (id, contactId) =>
  interactions.findOne((interaction) => interaction.id === id && interaction.contactId === contactId);

export const create = (data) => interactions.insert(data);

export const createMany = (items) => interactions.insertMany(items);

export const deleteById = (id) => interactions.deleteById(id);

export const deleteByContact = (contactId) =>
  interactions.deleteMany((interaction) => interaction.contactId === contactId);

export const clear = () => interactions.clear();
