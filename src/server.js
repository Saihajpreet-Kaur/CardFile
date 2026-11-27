import http from 'node:http';
import app from './app.js';
import config from './config/index.js';
import { connectDB, disconnectDB } from './config/db.js';
import { closeCache, initCache } from './services/cache.service.js';
import logger from './utils/logger.js';

const server = http.createServer(app);

async function start() {
  // Connect first: the server only accepts requests once the database is ready
  await connectDB();
  await initCache();

  server.listen(config.port, () => {
    logger.info(`Server running in ${config.env} mode on http://localhost:${config.port}`);
    logger.info(`Health check: http://localhost:${config.port}/api/health`);
  });
}

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(`Port ${config.port} is already in use. Change PORT in .env`);
  } else {
    logger.error('Server error', error);
  }
  process.exit(1);
});

// Graceful shutdown: stop accepting new requests, let running ones finish, then close connections
const shutdown = (signal) => {
  logger.info(`${signal} received, shutting down`);
  server.close(async () => {
    await Promise.allSettled([disconnectDB(), closeCache()]);
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', reason);
});

start().catch((error) => {
  logger.error('Could not start the server', error);
  process.exit(1);
});
