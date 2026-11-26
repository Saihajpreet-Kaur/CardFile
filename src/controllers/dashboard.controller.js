import * as dashboardService from '../services/dashboard.service.js';

export async function getSummary(req, res) {
  const { value, hit } = await dashboardService.getSummary(req.user.id);
  // X-Cache shows whether the answer came from the cache (HIT) or was computed (MISS)
  res.set('X-Cache', hit ? 'HIT' : 'MISS');
  res.json({ success: true, data: value });
}

