import path from 'node:path';
import multer from 'multer';
import config from '../config/index.js';
import { ALLOWED_CSV_MIME_TYPES, ALLOWED_IMAGE_MIME_TYPES } from '../constants/index.js';
import AppError from '../utils/AppError.js';

// Files are kept in memory (never written to the server disk) and processed straight away.
const storage = multer.memoryStorage();

const csvFileFilter = (_req, file, callback) => {
  const isCsv =
    path.extname(file.originalname).toLowerCase() === '.csv' &&
    ALLOWED_CSV_MIME_TYPES.includes(file.mimetype);

  callback(isCsv ? null : new AppError('Only .csv files are allowed', 415), isCsv);
};

const imageFileFilter = (_req, file, callback) => {
  const isImage = Object.hasOwn(ALLOWED_IMAGE_MIME_TYPES, file.mimetype);
  callback(isImage ? null : new AppError('Only JPEG, PNG or WEBP images are allowed', 415), isImage);
};

const requireFile = (fieldName) => (req, _res, next) => {
  if (!req.file) throw AppError.badRequest(`Attach a file in the "${fieldName}" form field`);
  next();
};

export const uploadCsv = [
  multer({
    storage,
    fileFilter: csvFileFilter,
    limits: { fileSize: config.uploads.maxCsvSize, files: 1 },
  }).single('file'),
  requireFile('file'),
];

export const uploadImage = [
  multer({
    storage,
    fileFilter: imageFileFilter,
    limits: { fileSize: config.uploads.maxImageSize, files: 1 },
  }).single('photo'),
  requireFile('photo'),
];
