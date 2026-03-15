const axios = require('axios');

/**
 * Lightweight helper to periodically trigger GenLoop feedback export and retraining.
 * Intended to be wired up by the process manager (PM2, node-cron, or external scheduler).
 */
async function runGenloopMaintenanceCycle() {
  const baseUrl = process.env.BACKEND_ORIGIN || 'http://localhost:5000';

  try {
    console.log('[GenLoop Cron] Starting maintenance cycle...');

    // 1. Export latest feedback from Mongo into the Python service
    const exportRes = await axios.post(`${baseUrl}/api/genloop/export-feedback`);
    console.log('[GenLoop Cron] Export feedback response:', exportRes.data);

    // 2. Trigger retraining of the engagement model
    const retrainRes = await axios.post(`${baseUrl}/api/genloop/retrain`);
    console.log('[GenLoop Cron] Retrain response:', retrainRes.data);

    console.log('[GenLoop Cron] Maintenance cycle completed.');
  } catch (err) {
    console.error('[GenLoop Cron] Maintenance cycle failed:', err.message);
  }
}

module.exports = {
  runGenloopMaintenanceCycle,
};

