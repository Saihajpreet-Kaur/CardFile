import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const REQUIRED_VARS = ['JWT_SECRET', 'MONGO_URI'];

for (const key of REQUIRED_VARS) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}. Copy .env.example to .env`);
  }
}

const rootDir = path.resolve(import.meta.dirname, '..', '..');
const megabytes = (value, fallback) => Number(value || fallback) * 1024 * 1024;
const list = (value) =>
  (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const env = process.env.NODE_ENV || 'development';

const config = Object.freeze({
  env,
  isProduction: env === 'production',
  isTest: env === 'test',
  port: Number(process.env.PORT) || 5000,

  paths: Object.freeze({
    root: rootDir,
    public: path.join(rootDir, 'public'),
    views: path.join(rootDir, 'views'),
    client: path.join(rootDir, 'client', 'dist'),
    uploads: path.join(rootDir, 'uploads'),
    logs: path.join(rootDir, 'logs'),
  }),

  db: Object.freeze({
    uri: process.env.MONGO_URI,
  }),

  // Browser origins allowed to call the API (the React app in development or on Vercel)
  cors: Object.freeze({
    origins: list(process.env.CLIENT_URL || 'http://localhost:5173'),
  }),

  // Where the "Open the app" buttons on the home page point to
  appUrl: process.env.APP_URL || '/app',

  // Optional: without REDIS_URL an in-memory cache is used
  redisUrl: process.env.REDIS_URL || '',

  // Winston levels: error < warn < info < http (request lines) < debug
  logLevel: process.env.LOG_LEVEL || (env === 'production' ? 'http' : 'debug'),

  jwt: Object.freeze({
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  }),

  uploads: Object.freeze({
    maxCsvSize: megabytes(process.env.MAX_CSV_SIZE_MB, 2),
    maxImageSize: megabytes(process.env.MAX_IMAGE_SIZE_MB, 2),
    maxImportRows: Number(process.env.MAX_IMPORT_ROWS) || 1000,
  }),

  cloudinary: Object.freeze({
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    enabled: Boolean(
      process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET,
    ),
  }),
});

export default config;
