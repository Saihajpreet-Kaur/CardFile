import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { v2 as cloudinary } from 'cloudinary';
import config from '../config/index.js';
import { ALLOWED_IMAGE_MIME_TYPES } from '../constants/index.js';
import AppError from '../utils/AppError.js';
import logger from '../utils/logger.js';


if (config.cloudinary.enabled) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
    secure: true,
  });
}

function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'crm/contacts', resource_type: 'image' },
      (error, result) => (error ? reject(error) : resolve(result.secure_url)),
    );
    uploadStream.end(buffer);
  });
}

async function saveToLocalDisk(buffer, mimetype) {
  const fileName = `${randomUUID()}${ALLOWED_IMAGE_MIME_TYPES[mimetype]}`;

  await mkdir(config.paths.uploads, { recursive: true });
  await writeFile(path.join(config.paths.uploads, fileName), buffer);

  return `/uploads/${fileName}`;
}

export async function uploadImage({ buffer, mimetype }) {
  if (config.cloudinary.enabled) return uploadToCloudinary(buffer);

  if (config.isProduction) {
    throw new AppError('Photo storage is not configured on the server', 503);
  }

  logger.warn('Cloudinary is not configured - saving photo to local ./uploads (development only)');
  return saveToLocalDisk(buffer, mimetype);
}
