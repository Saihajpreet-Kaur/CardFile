import config from '../config/index.js';

const timestamp = () => new Date().toISOString();

const logger = {
  info: (message, ...meta) => console.log(`[${timestamp()}] INFO  ${message}`, ...meta),
  warn: (message, ...meta) => console.warn(`[${timestamp()}] WARN  ${message}`, ...meta),
  error: (message, ...meta) => console.error(`[${timestamp()}] ERROR ${message}`, ...meta),
  debug: (message, ...meta) => {
    if (!config.isProduction) console.debug(`[${timestamp()}] DEBUG ${message}`, ...meta);
  },
};

export default logger;
