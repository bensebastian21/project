const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { authenticateToken: auth } = require('../utils/auth');
const { run } = require('../services/multiModalPipeline');
const { selectTemplate, recordOutcome } = require('../services/promptOptimizer');
const { retrain } = require('../services/engagementPredictor');
const { syncAnalyticsToVariants } = require('../services/feedbackLoop');
const ContentVariant = require('../models/ContentVariant');
const GenerationRun = require('../models/GenerationRun');
const Analytics = require('../models/Analytics');
const Event = require('../models/Event');
const { cloudinary } = require('../utils/cloudinary');

const VALID_SIGNALS = ['impression', 'click', 'share', 'registration'];

/**
 * @desc Generate content variants via multi-modal pipeline
 * @route POST /api/genloop/generate
 * @access Private
 */
router.post('/generate', auth, async (req, res) => {
  try {
    const { title, topic, targetAudience, venue, tone, variantCount, eventId,
            category, eventType, teamSize, eventDate, eventTime,
            registrationDeadline, capacity, imageStyle } = req.body;

    if (!title || !topic) {
      return res.status(400).json({ msg: 'Title and topic are required.' });
    }

    const count = Math.min(5, Math.max(1, parseInt(variantCount) || 1));

    const template = await selectTemplate({
      tone: tone || 'Professional',
      title,
      topic,
      targetAudience,
      venue,
    });

    const metadata = {
      title,
      topic,
      targetAudience: targetAudience || 'All Students',
      venue: venue || 'TBD',
      tone: tone || 'Professional',
      category: category || 'Hackathon',
      eventType: eventType || 'solo',
      teamSize: teamSize || null,
      eventDate: eventDate || null,
      eventTime: eventTime || null,
      registrationDeadline: registrationDeadline || null,
      capacity: capacity || 100,
      imageStyle: imageStyle || 'Vibrant',
      eventId: eventId ? new mongoose.Types.ObjectId(eventId) : new mongoose.Types.ObjectId(),
      hostId: req.user.id,
    };

    const { runId, loopIteration, variants } = await run(metadata, template, count);

    return res.json({
      runId,
      loopIteration,
      variants: variants.map((v) => ({
        variantId: v.variantId,
        posterUrl: v.posterUrl,
        imageFallback: v.imageFallback,
        textCopy: v.textCopy,
        predictedViralScore: v.predictedViralScore,
        status: v.status,
      })),
    });
  } catch (err) {
    console.error('[GenLoop] /generate error:', err.message);
    if (err.message && err.message.includes('LLM parse failed after retries')) {
      return res.status(503).json({ msg: err.message });
    }
    if (err.message && err.message.toLowerCase().includes('timed out')) {
      return res.status(504).json({ msg: err.message });
    }
    res.status(500).json({ msg: 'Generation failed', error: err.message });
  }
});

/**
 * @desc Upload a generated poster to Cloudinary (called on publish)
 * @route POST /api/genloop/upload-poster/:variantId
 * @access Private
 */
router.post('/upload-poster/:variantId', auth, async (req, res) => {
  try {
    const { variantId } = req.params;
    const variant = await ContentVariant.findOne({ variantId });

    if (!variant) {
      return res.status(404).json({ msg: 'Variant not found.' });
    }

    const { posterUrl, imageFallback } = variant;

    // If already a Cloudinary URL or a placeholder, return as-is
    if (!posterUrl || imageFallback || posterUrl.startsWith('http')) {
      return res.json({ cloudinaryUrl: posterUrl });
    }

    // posterUrl is a relative path like /uploads/genloop/xxx.png
    const localPath = path.join(__dirname, '..', posterUrl);

    if (!fs.existsSync(localPath)) {
      return res.status(404).json({ msg: 'Local image file not found.' });
    }

    const result = await cloudinary.uploader.upload(localPath, {
      folder: 'student-events/genloop',
      resource_type: 'image',
    });

    const cloudinaryUrl = result.secure_url;

    // Update the variant's posterUrl to the Cloudinary URL
    await ContentVariant.findOneAndUpdate(
      { variantId },
      { $set: { posterUrl: cloudinaryUrl } }
    );

    // Clean up local file
    fs.unlink(localPath, (err) => {
      if (err) console.warn('[GenLoop] Could not delete local file:', localPath);
    });

    return res.json({ cloudinaryUrl });
  } catch (err) {
    console.error('[GenLoop] /upload-poster error:', err.message);
    res.status(500).json({ msg: 'Cloudinary upload failed', error: err.message });
  }
});

/**
 * @desc Track engagement signal for a content variant
 * @route POST /api/genloop/track/:variantId
 * @access Public
 */
router.post('/track/:variantId', async (req, res) => {
  try {
    const { variantId } = req.params;
    const { signal, viewerFingerprint, source } = req.body;

    if (!VALID_SIGNALS.includes(signal)) {
      return res.status(400).json({ msg: `signal must be one of: ${VALID_SIGNALS.join(', ')}` });
    }

    const variant = await ContentVariant.findOne({ variantId });

    if (!variant) {
      // Save orphaned analytics record
      const orphanedAnalytics = new Analytics({
        eventId: new mongoose.Types.ObjectId(),
        hostId: new mongoose.Types.ObjectId(),
        type: signal === 'share' ? 'click' : signal === 'registration' ? 'registration' : signal === 'impression' ? 'impression' : 'click',
        variantId,
        signal,
        source: source || 'direct',
      });
      try { await orphanedAnalytics.save(); } catch (_) { /* best-effort */ }
      return res.json({ orphaned: true });
    }

    // Map signal to Analytics type
    const analyticsType = signal === 'share' ? 'click' : signal;

    if (signal === 'impression') {
      const hourBucket = Math.floor(Date.now() / 3600000);
      const dedupeKey = crypto
        .createHash('sha256')
        .update(variantId + (viewerFingerprint || '') + hourBucket)
        .digest('hex');

      const existing = await Analytics.findOne({ dedupeKey });
      if (existing) {
        return res.json({ success: true, deduped: true });
      }

      await new Analytics({
        eventId: variant.eventId,
        hostId: variant.hostId,
        type: 'impression',
        variantId,
        signal: 'impression',
        dedupeKey,
        source: source || 'direct',
      }).save();

      await ContentVariant.findOneAndUpdate(
        { variantId },
        { $inc: { 'metrics.impressions': 1 } }
      );
    } else {
      // click, share, registration — no dedup
      await new Analytics({
        eventId: variant.eventId,
        hostId: variant.hostId,
        type: analyticsType,
        variantId,
        signal,
        source: source || 'direct',
      }).save();

      const incField =
        signal === 'click' ? 'metrics.clicks' :
        signal === 'share' ? 'metrics.shares' :
        'metrics.registrations';

      await ContentVariant.findOneAndUpdate(
        { variantId },
        { $inc: { [incField]: 1 } }
      );
    }

    // Recompute derived metrics
    const updated = await ContentVariant.findOne({ variantId });
    const { impressions, clicks, shares, registrations } = updated.metrics;
    const ctr = impressions > 0 ? clicks / impressions : 0;
    const shareRate = impressions > 0 ? shares / impressions : 0;
    const registrationConversionRate = clicks > 0 ? registrations / clicks : 0;

    await ContentVariant.findOneAndUpdate(
      { variantId },
      { $set: { 'metrics.ctr': ctr, 'metrics.shareRate': shareRate, 'metrics.registrationConversionRate': registrationConversionRate } }
    );

    return res.json({ success: true });
  } catch (err) {
    console.error('[GenLoop] /track error:', err.message);
    res.status(500).json({ msg: 'Tracking failed', error: err.message });
  }
});

/**
 * @desc Get A/B test status for an event
 * @route GET /api/genloop/ab-status/:eventId
 * @access Private
 */
router.get('/ab-status/:eventId', auth, async (req, res) => {
  try {
    const { eventId } = req.params;

    const latestRun = await GenerationRun.findOne({ eventId: new mongoose.Types.ObjectId(eventId) })
      .sort({ createdAt: -1 });

    if (!latestRun) {
      return res.status(404).json({ msg: 'No generation run found for this event.' });
    }

    const variants = await ContentVariant.find({ runId: latestRun.runId });

    const variantsWithConfidence = variants.map((v) => {
      const impressions = v.metrics.impressions;
      let confidence;
      if (impressions < 30) confidence = 'insufficient_data';
      else if (impressions < 100) confidence = 'low';
      else if (impressions < 500) confidence = 'medium';
      else confidence = 'high';

      return {
        variantId: v.variantId,
        predictedViralScore: v.predictedViralScore,
        status: v.status,
        metrics: v.metrics,
        confidence,
      };
    });

    return res.json({ runId: latestRun.runId, variants: variantsWithConfidence });
  } catch (err) {
    console.error('[GenLoop] /ab-status error:', err.message);
    res.status(500).json({ msg: 'Failed to fetch A/B status', error: err.message });
  }
});

/**
 * @desc Select a winner variant for a run
 * @route POST /api/genloop/select-winner/:variantId
 * @access Private
 */
router.post('/select-winner/:variantId', auth, async (req, res) => {
  try {
    const { variantId } = req.params;

    const selected = await ContentVariant.findOne({ variantId });
    if (!selected) {
      return res.status(404).json({ msg: 'Variant not found.' });
    }

    const allVariants = await ContentVariant.find({ runId: selected.runId });

    const alreadyDecided = allVariants.some(
      (v) => v.status === 'winner' || v.status === 'eliminated'
    );
    if (alreadyDecided) {
      return res.status(409).json({ msg: 'Run already decided' });
    }

    await ContentVariant.findOneAndUpdate({ variantId }, { $set: { status: 'winner' } });

    const otherIds = allVariants
      .filter((v) => v.variantId !== variantId)
      .map((v) => v.variantId);

    if (otherIds.length > 0) {
      await ContentVariant.updateMany(
        { variantId: { $in: otherIds } },
        { $set: { status: 'eliminated' } }
      );
    }

    return res.json({ success: true, winner: variantId, eliminated: otherIds });
  } catch (err) {
    console.error('[GenLoop] /select-winner error:', err.message);
    res.status(500).json({ msg: 'Failed to select winner', error: err.message });
  }
});

/**
 * @desc Get analytics for an event across all loop iterations
 * @route GET /api/genloop/analytics/:eventId
 * @access Private
 */
router.get('/analytics/:eventId', auth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const eventObjId = new mongoose.Types.ObjectId(eventId);

    const runs = await GenerationRun.find({ eventId: eventObjId }).sort({ loopIteration: 1 });

    if (!runs.length) {
      return res.status(404).json({ msg: 'No runs found for this event.' });
    }

    const loopHistory = [];
    let bestVariant = null;

    let totalImpressions = 0;
    let totalClicks = 0;
    let totalShares = 0;
    let totalRegistrations = 0;

    for (const run of runs) {
      const variants = await ContentVariant.find({ runId: run.runId });

      const winner = variants.find((v) => v.status === 'winner') ||
        variants.sort((a, b) => b.predictedViralScore - a.predictedViralScore)[0];

      loopHistory.push({
        runId: run.runId,
        loopIteration: run.loopIteration,
        date: run.createdAt,
        variantCount: run.variantCount,
        winnerScore: winner ? winner.predictedViralScore : 0,
        promptTemplateId: run.promptTemplateId,
      });

      for (const v of variants) {
        totalImpressions += v.metrics.impressions || 0;
        totalClicks += v.metrics.clicks || 0;
        totalShares += v.metrics.shares || 0;
        totalRegistrations += v.metrics.registrations || 0;

        if (!bestVariant || v.predictedViralScore > bestVariant.predictedViralScore) {
          if (v.status === 'winner' || !bestVariant) {
            bestVariant = v;
          }
        }
      }
    }

    // Find overall best: prefer winners, then highest score
    const allVariants = await ContentVariant.find({ eventId: eventObjId });
    const winners = allVariants.filter((v) => v.status === 'winner');
    const candidatePool = winners.length > 0 ? winners : allVariants;
    const overall = candidatePool.sort((a, b) => b.predictedViralScore - a.predictedViralScore)[0];

    const aggregateCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
    const aggregateShareRate = totalImpressions > 0 ? totalShares / totalImpressions : 0;
    const aggregateRegConv = totalClicks > 0 ? totalRegistrations / totalClicks : 0;

    return res.json({
      bestVariant: overall
        ? { variantId: overall.variantId, viralScore: overall.predictedViralScore, metrics: overall.metrics }
        : null,
      loopHistory,
      aggregate: {
        totalImpressions,
        ctr: aggregateCtr,
        shareRate: aggregateShareRate,
        registrationConversionRate: aggregateRegConv,
      },
    });
  } catch (err) {
    console.error('[GenLoop] /analytics error:', err.message);
    res.status(500).json({ msg: 'Failed to fetch analytics', error: err.message });
  }
});

/**
 * @desc Export feedback data for all completed runs
 * @route POST /api/genloop/export-feedback
 * @access Private
 */
router.post('/export-feedback', auth, async (req, res) => {
  try {
    const runs = await GenerationRun.find({ status: 'completed' });

    const result = [];
    for (const run of runs) {
      const variants = await ContentVariant.find({ runId: run.runId });
      result.push({ run, variants });
    }

    return res.json(result);
  } catch (err) {
    console.error('[GenLoop] /export-feedback error:', err.message);
    res.status(500).json({ msg: 'Export failed', error: err.message });
  }
});

/**
 * @desc Trigger engagement predictor retraining
 * @route POST /api/genloop/retrain
 * @access Private
 */
router.post('/retrain', auth, async (req, res) => {
  try {
    await syncAnalyticsToVariants();
    const variants = await ContentVariant.find({ 'metrics.impressions': { $gte: 50 } });
    const result = retrain(variants);
    return res.json({ success: true, newAccuracy: result.accuracy, retrain_rejected: result.rejected });
  } catch (err) {
    console.error('[GenLoop] /retrain error:', err.message);
    res.status(500).json({ msg: 'Retraining failed', error: err.message });
  }
});

module.exports = router;
