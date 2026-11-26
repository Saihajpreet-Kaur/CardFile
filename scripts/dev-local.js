/**
 * Runs the API with a local MongoDB server - no Atlas account needed.
 *
 *   npm run dev:local
 *
 * mongodb-memory-server downloads a MongoDB binary once and starts it.
 * Data is kept in storage/mongo, so it survives restarts. On the first run the
 * database is filled with the demo data.
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { MongoMemoryServer } from 'mongodb-memory-server';

const dbPath = path.resolve(import.meta.dirname, '..', 'storage', 'mongo');
await mkdir(dbPath, { recursive: true });

const mongo = await MongoMemoryServer.create({
  instance: { dbPath, storageEngine: 'wiredTiger', port: 27018 },
});
process.env.MONGO_URI = mongo.getUri('crm');
console.log(`Local MongoDB running at ${process.env.MONGO_URI} (data in storage/mongo)`);

// Imported after MONGO_URI is set, because the config reads it on import
const { connectDB } = await import('../src/config/db.js');
const { default: User } = await import('../src/models/User.js');
const { seedDatabase } = await import('./seed.js');

await connectDB();
if ((await User.estimatedDocumentCount()) === 0) await seedDatabase();

const stopMongo = () => mongo.stop({ doCleanup: false });
process.on('SIGINT', stopMongo);
process.on('SIGTERM', stopMongo);

await import('../src/server.js');
