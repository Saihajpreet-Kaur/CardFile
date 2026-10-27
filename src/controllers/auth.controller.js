import { matchedData } from 'express-validator';
import * as authService from '../services/auth.service.js';

export async function register(req, res) {
  const { user, token } = await authService.register(matchedData(req));
  res.status(201).json({ success: true, message: 'Account created', data: { user, token } });
}

export async function login(req, res) {
  const { user, token } = await authService.login(matchedData(req));
  res.json({ success: true, message: 'Logged in', data: { user, token } });
}

export function getMe(req, res) {
  res.json({ success: true, data: req.user });
}
