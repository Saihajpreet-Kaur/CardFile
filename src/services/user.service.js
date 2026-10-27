import * as userRepository from '../repositories/user.repository.js';
import * as contactRepository from '../repositories/contact.repository.js';
import AppError from '../utils/AppError.js';
import { toPublicUser } from './auth.service.js';

export async function listUsers() {
  const users = await userRepository.findAll();

  return Promise.all(
    users.map(async (user) => ({
      ...toPublicUser(user),
      contactCount: await contactRepository.countForUser(user.id),
    })),
  );
}

export async function updateRole(currentUser, userId, role) {
  if (currentUser.id === userId) {
    throw AppError.badRequest('You cannot change your own role');
  }

  const user = await userRepository.updateById(userId, { role });
  if (!user) throw AppError.notFound('User not found');

  return toPublicUser(user);
}
