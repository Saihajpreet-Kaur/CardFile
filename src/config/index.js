import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const REQUIRED_VARS = ['JWT_SECRET'];

for (const key of REQUIRED_VARS) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}. Copy .env.example to .env`);
  }
}

const rootDir = path.resolve(import.meta.dirname, '..', '..');
const megabytes = (value, fallback) => Number(value || fallback) * 1024 * 1024;

const config = Object.freeze({
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT) || 5000,

  paths: Object.freeze({
    root: rootDir,
    public: path.join(rootDir, 'public'),
    views: path.join(rootDir, 'views'),
    data: path.resolve(rootDir, process.env.DATA_DIR || 'storage'),
    uploads: path.join(rootDir, 'uploads'),
    logs: path.join(rootDir, 'logs'),
  }),

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
