import config from '../config/index.js';

export function getHealth(_req, res) {
  res.json({
    success: true,
    data: {
      status: 'ok',
      environment: config.env,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    },
  });
}
