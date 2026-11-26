import { EventEmitter } from 'node:events';
import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { invalidate, userPrefix } from '../services/cache.service.js';

/**
 * Services emit an event after something important happens; listeners react to it.
 * The service does not need to know who is listening (here: an activity log file).
 */
export const ACTIVITY = Object.freeze({
  USER_REGISTERED: 'user:registered',
  USER_LOGGED_IN: 'user:loggedIn',
  CONTACT_CREATED: 'contact:created',
  CONTACT_UPDATED: 'contact:updated',
  CONTACT_DELETED: 'contact:deleted',
  CONTACT_RESTORED: 'contact:restored',
  CONTACT_PURGED: 'contact:purged',
  CONTACTS_IMPORTED: 'contacts:imported',
  CONTACTS_EXPORTED: 'contacts:exported',
  INTERACTION_ADDED: 'interaction:added',
  INTERACTION_DELETED: 'interaction:deleted',
  FOLLOW_UP_DONE: 'followUp:done',
  LIST_CREATED: 'list:created',
  LIST_UPDATED: 'list:updated',
  LIST_DELETED: 'list:deleted',
  LIST_MEMBERS_CHANGED: 'list:membersChanged',
});

// Events that do not change data the dashboard shows
const READ_ONLY_EVENTS = new Set([ACTIVITY.USER_REGISTERED, ACTIVITY.USER_LOGGED_IN, ACTIVITY.CONTACTS_EXPORTED]);

const activityEmitter = new EventEmitter();
const activityLogFile = path.join(config.paths.logs, 'activity.log');

async function writeActivity(event, payload) {
  const line = JSON.stringify({ at: new Date().toISOString(), event, ...payload });
  await mkdir(config.paths.logs, { recursive: true });
  await appendFile(activityLogFile, `${line}\n`, 'utf8');
}

for (const event of Object.values(ACTIVITY)) {
  // Listener 1: append the event to logs/activity.log
  activityEmitter.on(event, (payload) => {
    if (config.isTest) return;
    writeActivity(event, payload).catch((error) =>
      logger.error(`Could not write activity "${event}"`, error),
    );
  });

  // Listener 2: the user's data changed, so their cached dashboard is out of date
  if (!READ_ONLY_EVENTS.has(event)) {
    activityEmitter.on(event, (payload) => {
      if (payload.userId) invalidate(userPrefix(payload.userId));
    });
  }
}

export const emitActivity = (event, payload = {}) => activityEmitter.emit(event, payload);

export default activityEmitter;
