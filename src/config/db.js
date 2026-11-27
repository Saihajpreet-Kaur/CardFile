import dns from 'node:dns';
import mongoose from 'mongoose';
import config from './index.js';
import logger from '../utils/logger.js';

// Every document sent to the client gets a string "id" instead of "_id", and
// referenced ObjectIds (userId, contactId, lists) become plain strings.
const toClient = {
  virtuals: true,
  versionKey: false,
  flattenObjectIds: true,
  transform: (_doc, ret) => {
    delete ret._id;
    return ret;
  },
};
mongoose.set('toJSON', toClient);
mongoose.set('toObject', toClient);

// Reject query filters on fields that are not in the schema
mongoose.set('strictQuery', true);

mongoose.connection.on('connected', () => logger.info('MongoDB connected'));
mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
mongoose.connection.on('error', (error) => logger.error('MongoDB error', error));

const PUBLIC_DNS = ['8.8.8.8', '1.1.1.1'];

// "mongodb+srv://" addresses need a DNS SRV lookup. Some PCs point Node at a local DNS
// (127.0.0.1) that refuses SRV queries - then we retry once with public DNS servers.
const isSrvLookupError = (error) =>
  /querySrv|queryTxt/.test(error.message) && /ECONNREFUSED|ETIMEOUT|ESERVFAIL/.test(error.message);

/** Opens the connection once at start-up. The server starts listening only after this resolves. */
export async function connectDB(uri = config.db.uri) {
  if (mongoose.connection.readyState === 1) return mongoose.connection;

  const options = { serverSelectionTimeoutMS: 10_000 };

  // Node is only using a local DNS (e.g. 127.0.0.1) - known to refuse SRV queries on some PCs
  const onlyLocalDns = dns.getServers().every((server) => server === '127.0.0.1' || server === '::1');
  if (uri.startsWith('mongodb+srv://') && onlyLocalDns) {
    logger.debug('Using public DNS servers for the MongoDB SRV lookup');
    dns.setServers(PUBLIC_DNS);
  }

  try {
    await mongoose.connect(uri, options);
  } catch (error) {
    if (!isSrvLookupError(error)) throw error;
    logger.warn(`DNS lookup for MongoDB failed (${error.message}); retrying with public DNS`);
    dns.setServers(PUBLIC_DNS);
    await mongoose.connect(uri, options);
  }
  // Build the indexes declared in the schemas (unique email per user, list filters, ...)
  await mongoose.connection.syncIndexes();
  return mongoose.connection;
}

export async function disconnectDB() {
  await mongoose.disconnect();
}

export const isDbConnected = () => mongoose.connection.readyState === 1;

