import { matchedData } from 'express-validator';
import * as listService from '../services/list.service.js';

const validBody = (req) => matchedData(req, { locations: ['body'] });

export async function getLists(req, res) {
  const lists = await listService.getLists(req.user.id);
  res.json({ success: true, data: lists });
}

export async function createList(req, res) {
  const list = await listService.createList(req.user.id, validBody(req));
  res.status(201).json({ success: true, message: 'List created', data: list });
}

export async function updateList(req, res) {
  const list = await listService.updateList(req.user.id, req.params.id, validBody(req));
  res.json({ success: true, message: 'List updated', data: list });
}

export async function deleteList(req, res) {
  await listService.deleteList(req.user.id, req.params.id);
  res.json({ success: true, message: 'List deleted' });
}

export async function changeMembers(req, res) {
  const result = await listService.changeMembers(req.user.id, req.params.id, validBody(req));
  const verb = req.body.action === 'add' ? 'added to' : 'removed from';
  res.json({ success: true, message: `${result.changed} contact(s) ${verb} the list`, data: result });
}

