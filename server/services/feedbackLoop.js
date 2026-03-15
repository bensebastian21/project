/**
 * Feedback Loop — cron job that processes engagement metrics and updates
 * model weights + prompt optimizer outcomes.
 *
 * Runs every 5 minutes. Marks runs as completed when impressions >= 100,
 * and stale when older than 72h with zero impressions.
 * Also syncs real Analytics data into ContentVariant metrics.
 */

const cron = require('node-cron');
const ContentVariant = require('../models/ContentVariant');
const GenerationRun = require('../models/GenerationRun');
const Analytics = require('../models/Analytics');
const { updateWeights, extractFeatures } = require('./engagementPredictor');
const { recordOutcome } = require('./promptOptimizer');
const mongoose = require('mongoose');

const IMPRESSION_THRESHOLD = 100;
const STALE_HOURS = 72;

/**
 * Start the feedback loop cron job.
 */
function start() {
  cron.schedule('*/5 * * * *', () => {
    tick().catch((err) => {
      console.error('[FeedbackLoop] Unhandled error in tick:', err.message);
    });
  });
  console.log('[FeedbackLoop] Started');
}

/**
 * Sync real Analytics collection data into ContentVariant metrics.
 * This ensures the ML model trains on actual user interactions.
 */
async function syncAnalyticsToVariants() {
  try {
    // Get all active variants that have an eventId
    const variants = await ContentVariant.find({ status: { $in: ['active', 'winner'] } }).lean();

    for (const variant of variants) {
      if (!variant.eventId) continue;

      // Aggregate real analytics for this event
      const [impressions, clicks, registrations] = await Promise.all([
        Analytics.countDocuments({ eventId: variant.eventId, type: 'impression' }),
        Analytics.countDocuments({ eventId: variant.eventId, type: 'click' }),
        Analytics.countDocuments({ eventId: variant.eventId, type: 'registration' }),
      ]);

      const ctr = impressions > 0 ? clicks / impressions : 0;
      const registrationConversionRate = clicks > 0 ? registrations / clicks : 0;

      // Only update if real data differs meaningfully from stored
      const stored = variant.metrics;
      if (
        Math.abs((stored.impressions || 0) - impressions) > 0 ||
        Math.abs((stored.clicks || 0) - clicks) > 0
      ) {
        await ContentVariant.findOneAndUpdate(
          { variantId: variant.variantId },
          {
            $set: {
              'metrics.impressions': impressions,
              'metrics.clicks': clicks,
              'metrics.registrations': registrations,
              'metrics.ctr': ctr,
              'metrics.registrationConversionRate': registrationConversionRate,
            },
          }
        );
      }
    }
  } catch (err) {
    console.error('[FeedbackLoop] syncAnalyticsToVariants error:', err.message);
  }
}

/**
 * One tick of the feedback loop.
 */
async function tick() {
  try {
    // First sync real analytics data into variant metrics
    await syncAnalyticsToVariants();

    // Find all in_progress runs
    const activeRuns = await GenerationRun.find({ status: 'in_progress' });

    for (const run of activeRuns) {
      const variants = await ContentVariant.find({ runId: run.runId });
      const totalImpressions = variants.reduce(
        (sum, v) => sum + (v.metrics?.impressions || 0),
        0
      );

      if (totalImpressions >= IMPRESSION_THRESHOLD) {
        // Update weights for each variant using real CTR from Analytics
        for (const variant of variants) {
          const features = extractFeatures(variant.textCopy, variant.tone || 'Professional');
          // Use real CTR from synced metrics
          const realCTR = variant.metrics?.ctr || 0;
          updateWeights(features, realCTR);
        }

        // Find the best-performing variant by real CTR
        const bestVariant = variants.reduce((best, v) =>
          (v.metrics?.ctr || 0) > (best.metrics?.ctr || 0) ? v : best
        , variants[0]);

        if (bestVariant && run.promptTemplateId) {
          // Score based on composite: CTR * 50 + registrationConversionRate * 50
          const compositeScore =
            (bestVariant.metrics.ctr || 0) * 50 +
            (bestVariant.metrics.registrationConversionRate || 0) * 50;
          await recordOutcome(run.promptTemplateId, compositeScore);
        }

        run.status = 'completed';
        run.completedAt = new Date();
        await run.save();
        console.log(`[FeedbackLoop] Run ${run.runId} completed with ${totalImpressions} impressions`);
      }
    }

    // Mark stale runs
    const staleThreshold = new Date(Date.now() - STALE_HOURS * 60 * 60 * 1000);
    const oldRuns = await GenerationRun.find({
      status: 'in_progress',
      createdAt: { $lt: staleThreshold },
    });

    for (const run of oldRuns) {
      const variants = await ContentVariant.find({ runId: run.runId });
      const totalImpressions = variants.reduce(
        (sum, v) => sum + (v.metrics?.impressions || 0),
        0
      );
      if (totalImpressions === 0) {
        run.status = 'stale';
        await run.save();
      }
    }
  } catch (err) {
    console.error('[FeedbackLoop] tick error:', err.message);
  }
}

module.exports = { start, tick, syncAnalyticsToVariants };
