import http from 'node:http';
import app from './app.js';
import config from './config/index.js';
import logger from './utils/logger.js';

const server = http.createServer(app);

server.listen(config.port, () => {
  logger.info(`Server running in ${config.env} mode on http://localhost:${config.port}`);
  logger.info(`Health check: http://localhost:${config.port}/api/health`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(`Port ${config.port} is already in use. Change PORT in .env`);
  } else {
    logger.error('Server error', error);
  }
  process.exit(1);
});

const shutdown = (signal) => {
  logger.info(`${signal} received, shutting down`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', reason);
});
