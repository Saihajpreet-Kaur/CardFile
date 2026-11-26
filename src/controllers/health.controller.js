import config from '../config/index.js';
import { isDbConnected } from '../config/db.js';
import { cacheBackend } from '../services/cache.service.js';

export function getHealth(_req, res) {
  const database = isDbConnected() ? 'connected' : 'disconnected';

  res.status(database === 'connected' ? 200 : 503).json({
    success: database === 'connected',
    data: {
      status: database === 'connected' ? 'ok' : 'degraded',
      environment: config.env,
      database,
      cache: cacheBackend(),
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    },
  });
}
