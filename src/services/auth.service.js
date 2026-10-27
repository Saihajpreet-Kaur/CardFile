import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { ROLES } from '../constants/index.js';
import * as userRepository from '../repositories/user.repository.js';
import AppError from '../utils/AppError.js';
import { ACTIVITY, emitActivity } from '../events/activity.events.js';

const SALT_ROUNDS = 10;

/** Never send the password hash to the client. */
export const toPublicUser = ({ passwordHash: _passwordHash, ...user }) => user;

export const hashPassword = (password) => bcrypt.hash(password, SALT_ROUNDS);

const signToken = (user) =>
  jwt.sign({ sub: user.id, role: user.role }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });

export async function register({ name, email, password }) {
  const existing = await userRepository.findByEmail(email);
  if (existing) throw AppError.conflict('An account with this email already exists');

  const user = await userRepository.create({
    name,
    email,
    passwordHash: await hashPassword(password),
    role: ROLES.USER, // the client can never choose its own role
  });

  emitActivity(ACTIVITY.USER_REGISTERED, { userId: user.id });
  return { user: toPublicUser(user), token: signToken(user) };
}

export async function login({ email, password }) {
  const user = await userRepository.findByEmail(email);

  // Same message for "no such user" and "wrong password" so emails cannot be probed
  const passwordMatches = user && (await bcrypt.compare(password, user.passwordHash));
  if (!passwordMatches) throw AppError.unauthorized('Invalid email or password');

  emitActivity(ACTIVITY.USER_LOGGED_IN, { userId: user.id });
  return { user: toPublicUser(user), token: signToken(user) };
}

/** Verifies a JWT and returns the user it belongs to. */
export async function verifyToken(token) {
  let payload;
  try {
    payload = jwt.verify(token, config.jwt.secret);
  } catch (error) {
    const message =
      error.name === 'TokenExpiredError'
        ? 'Session expired, please log in again'
        : 'Invalid authentication token';
    throw AppError.unauthorized(message);
  }

  const user = await userRepository.findById(payload.sub);
  if (!user) throw AppError.unauthorized('The user for this token no longer exists');

  return toPublicUser(user);
}
