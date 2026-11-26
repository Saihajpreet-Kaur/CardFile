/**
 * Test helpers: an in-memory MongoDB, the Express app, and small request helpers.
 * Environment variables are set BEFORE the app is imported, because config reads them on import.
 */
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';

export async function startTestServer() {
  const mongo = await MongoMemoryServer.create();

  process.env.NODE_ENV = 'test';
  process.env.MONGO_URI = mongo.getUri('crm-test');
  process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-hs256';
  process.env.REDIS_URL = '';
  for (const key of ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']) {
    process.env[key] = '';
  }

  const { default: app } = await import('../src/app.js');
  const { connectDB, disconnectDB } = await import('../src/config/db.js');
  await connectDB();

  const api = request(app);

  async function stop() {
    await disconnectDB();
    await mongo.stop();
  }

  /** Registers a new user and returns { token, user }. */
  async function signUp(name = 'Test User') {
    const email = `${name.toLowerCase().replace(/\s+/g, '.')}.${Date.now()}${Math.random().toString(36).slice(2, 6)}@crm.test`;
    const res = await api.post('/api/auth/register').send({ name, email, password: 'Test@1234' });
    return { ...res.body.data, email };
  }

  return { api, app, stop, signUp };
}

export const auth = (token) => ({ Authorization: `Bearer ${token}` });

