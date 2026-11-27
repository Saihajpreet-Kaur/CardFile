import path from 'node:path';
import winston from 'winston';
import config from '../config/index.js';

const { combine, timestamp, errors, json, colorize, printf } = winston.format;

// Development: short coloured lines. Production: one JSON object per line (structured logging),
// which log platforms such as Render can search and filter.
const devFormat = printf(({ level, message, timestamp: time, stack, ...meta }) => {
  const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `[${time}] ${level} ${message}${extra}${stack ? `\n${stack}` : ''}`;
});

const transports = [
  new winston.transports.Console({
    silent: config.isTest,
    format: config.isProduction
      ? combine(timestamp(), errors({ stack: true }), json())
      : combine(colorize(), timestamp({ format: 'HH:mm:ss' }), errors({ stack: true }), devFormat),
  }),
];

// Log files in development. In Docker/Render set LOG_FILES=false: the platform collects console output.
if (!config.isTest && process.env.LOG_FILES !== 'false') {
  const fileFormat = combine(timestamp(), errors({ stack: true }), json());
  transports.push(
    new winston.transports.File({
      filename: path.join(config.paths.logs, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5 * 1024 * 1024,
      maxFiles: 3,
    }),
    new winston.transports.File({
      filename: path.join(config.paths.logs, 'combined.log'),
      format: fileFormat,
      maxsize: 5 * 1024 * 1024,
      maxFiles: 3,
    }),
  );
}

const winstonLogger = winston.createLogger({ level: config.logLevel, transports });

/** logger.error('message', error) - an Error passed as meta keeps its message and stack. */
const toMeta = (meta) => {
  if (meta instanceof Error) return { error: meta.message, stack: meta.stack };
  if (meta && typeof meta === 'object') return meta;
  return meta === undefined ? {} : { detail: meta };
};

const logger = {
  error: (message, meta) => winstonLogger.error(message, toMeta(meta)),
  warn: (message, meta) => winstonLogger.warn(message, toMeta(meta)),
  info: (message, meta) => winstonLogger.info(message, toMeta(meta)),
  http: (message) => winstonLogger.http(message),
  debug: (message, meta) => winstonLogger.debug(message, toMeta(meta)),
};

// Lets morgan write its request lines through Winston
export const morganStream = { write: (line) => logger.http(line.trim()) };

export default logger;
