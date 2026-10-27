import { matchedData } from 'express-validator';
import * as userService from '../services/user.service.js';

export async function listUsers(_req, res) {
  const users = await userService.listUsers();
  res.json({ success: true, data: users });
}

export async function updateRole(req, res) {
  const { id, role } = matchedData(req);
  const user = await userService.updateRole(req.user, id, role);
  res.json({ success: true, message: `Role changed to ${role}`, data: user });
}
