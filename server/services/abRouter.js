/**
 * A/B Router — deterministic variant assignment using SHA-256 hash.
 */

const crypto = require('crypto');

/**
 * Assign a variant index deterministically based on userId and runId.
 *
 * @param {string|number} userId
 * @param {string|number} runId
 * @param {number} variantCount - total number of variants
 * @returns {number} integer in [0, variantCount)
 */
function assignVariant(userId, runId, variantCount) {
  const hash = crypto
    .createHash('sha256')
    .update(String(userId) + String(runId))
    .digest('hex');

  const intVal = parseInt(hash.slice(0, 8), 16);
  return intVal % variantCount;
}

module.exports = { assignVariant };
