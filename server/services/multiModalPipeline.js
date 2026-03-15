/**
 * Multi-Modal Pipeline — orchestrates the full generation sequence.
 * Generates text copy + poster image for each variant, scores them,
 * and persists ContentVariant + GenerationRun documents.
 */

const { v4: uuidv4 } = require('uuid');
const { generateTextCopy } = require('./llmService');
const { generatePoster } = require('./imageService');
const { score, extractFeatures } = require('./engagementPredictor');
const ContentVariant = require('../models/ContentVariant');
const GenerationRun = require('../models/GenerationRun');

const GENERATION_TIMEOUT_MS = 180_000; // 3 minutes — HF image gen can take up to 90s

/**
 * Run the full multi-modal generation pipeline.
 *
 * @param {{ title, topic, targetAudience, venue, tone, eventId, hostId }} metadata
 * @param {{ templateId: string, promptText: string }} promptTemplate
 * @param {number} variantCount - 1–5
 * @returns {Promise<{ runId: string, loopIteration: number, variants: object[] }>}
 */
async function run(metadata, promptTemplate, variantCount = 1) {
  const { eventId, hostId, title, topic, tone } = metadata;

  // Step 1: determine loop iteration
  const existingRuns = await GenerationRun.countDocuments({ eventId });
  const loopIteration = existingRuns + 1;

  // Step 2: create runId
  const runId = uuidv4();

  // Step 3: image prompt is built inside imageService using full metadata

  // Save the GenerationRun document early (in_progress)
  const generationRun = new GenerationRun({
    runId,
    eventId,
    hostId,
    variantCount,
    status: 'in_progress',
    promptTemplateId: promptTemplate.templateId || null,
    loopIteration,
  });
  await generationRun.save();

  const savedVariants = [];

  // Wrap the generation loop in a 30s timeout
  const generationWork = async () => {
    for (let i = 0; i < variantCount; i++) {
      // Step 4a: generate text copy
      let textCopy = null;
      let textFailed = false;
      try {
        textCopy = await generateTextCopy(metadata, promptTemplate.promptText);
      } catch (err) {
        console.warn(`[MultiModalPipeline] Text generation failed for variant ${i}:`, err.message);
        textFailed = true;
      }

      // Step 4b: generate poster image (pass textCopy for text overlay)
      let posterUrl = null;
      let imageFallback = false;
      try {
        const imageResult = await generatePoster(metadata, textCopy);
        posterUrl = imageResult.url;
        imageFallback = imageResult.fallback;
      } catch (err) {
        console.warn(`[MultiModalPipeline] Image generation failed for variant ${i}:`, err.message);
        posterUrl = 'https://placehold.co/800x600/1a1a2e/ffffff?text=Event+Poster';
        imageFallback = true;
      }

      // Step 4c: extract features
      const features = extractFeatures(textCopy || {}, tone);

      // Step 4d: compute predicted viral score
      const predictedViralScore = score(features);

      // Step 4e: determine status
      const variantStatus = textFailed ? 'partial' : 'active';

      // Step 4f: create and save ContentVariant
      const variantId = uuidv4();
      const variant = new ContentVariant({
        variantId,
        runId,
        eventId,
        hostId,
        promptTemplateId: promptTemplate.templateId || null,
        posterUrl,
        imageFallback,
        textCopy: textCopy || {},
        predictedViralScore,
        status: variantStatus,
      });

      const saved = await variant.save();
      savedVariants.push(saved);
    }
  };

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Generation timed out after 30s')), GENERATION_TIMEOUT_MS)
  );

  try {
    await Promise.race([generationWork(), timeoutPromise]);
  } catch (err) {
    // On timeout or unexpected error: mark any partial variants, fail the run
    if (savedVariants.length > 0) {
      await ContentVariant.updateMany(
        { runId, status: 'active' },
        { $set: { status: 'partial' } }
      );
    }
    generationRun.status = 'failed';
    await generationRun.save();
    throw err;
  }

  // Step 5: determine final run status
  const allFailed = savedVariants.every((v) => v.status === 'partial');
  generationRun.status = allFailed ? 'failed' : 'completed';
  await generationRun.save();

  // Step 6: return result
  return { runId, loopIteration, variants: savedVariants };
}

module.exports = { run };
