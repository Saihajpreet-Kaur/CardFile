import { EventEmitter } from 'node:events';
import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import config from '../config/index.js';
import logger from '../utils/logger.js';


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
});

const activityEmitter = new EventEmitter();
const activityLogFile = path.join(config.paths.logs, 'activity.log');

async function writeActivity(event, payload) {
  const line = JSON.stringify({ at: new Date().toISOString(), event, ...payload });
  await mkdir(config.paths.logs, { recursive: true });
  await appendFile(activityLogFile, `${line}\n`, 'utf8');
}

for (const event of Object.values(ACTIVITY)) {
  activityEmitter.on(event, (payload) => {
    writeActivity(event, payload).catch((error) =>
      logger.error(`Could not write activity "${event}"`, error),
    );
  });
}

export const emitActivity = (event, payload = {}) => activityEmitter.emit(event, payload);

export default activityEmitter;
