/**
 * Prompt Optimizer — manages PromptTemplate selection and outcome recording.
 */

const PromptTemplate = require('../models/PromptTemplate');
const { v4: uuidv4 } = require('uuid');

const SEED_TEMPLATES = {
  Professional:
    'You are an expert academic event marketing specialist. Generate professional marketing copy for: Title: {{title}}, Topic: {{topic}}, Audience: {{targetAudience}}, Venue: {{venue}}. Respond ONLY with valid JSON: { "title": "...", "shortHook": "...", "descriptionHtml": "...", "socialPosts": { "twitter": "...", "instagram": "...", "linkedin": "..." }, "keywords": [] }',
  Hype:
    'You are a viral social media expert. Generate HYPE marketing copy for: Title: {{title}}, Topic: {{topic}}, Audience: {{targetAudience}}, Venue: {{venue}}. Make it exciting and energetic! Respond ONLY with valid JSON: { "title": "...", "shortHook": "...", "descriptionHtml": "...", "socialPosts": { "twitter": "...", "instagram": "...", "linkedin": "..." }, "keywords": [] }',
  Academic:
    'You are an academic communications specialist. Generate scholarly marketing copy for: Title: {{title}}, Topic: {{topic}}, Audience: {{targetAudience}}, Venue: {{venue}}. Respond ONLY with valid JSON: { "title": "...", "shortHook": "...", "descriptionHtml": "...", "socialPosts": { "twitter": "...", "instagram": "...", "linkedin": "..." }, "keywords": [] }',
};

/**
 * Select the best-performing prompt template for the given tone.
 * If no template exists for that tone, seeds a default and returns it.
 *
 * @param {{ tone: string, title?: string, topic?: string, targetAudience?: string, venue?: string }} eventMetadata
 * @returns {Promise<PromptTemplate>} the raw PromptTemplate document
 */
async function selectTemplate(eventMetadata) {
  const { tone } = eventMetadata;

  const template = await PromptTemplate.findOne({ tone })
    .sort({ avgViralScore: -1 })
    .limit(1);

  if (template) {
    return template;
  }

  // Seed a default template for this tone
  const promptText = SEED_TEMPLATES[tone] || SEED_TEMPLATES.Professional;
  const newTemplate = new PromptTemplate({
    templateId: uuidv4(),
    promptText,
    tone,
    avgViralScore: 0,
    usageCount: 0,
  });

  await newTemplate.save();
  return newTemplate;
}

/**
 * Record the outcome of a generation run for a given template.
 * Updates avgViralScore as EMA and increments usageCount.
 *
 * @param {string} templateId
 * @param {number} realizedViralScore - 0–100
 * @returns {Promise<PromptTemplate>} updated document
 */
async function recordOutcome(templateId, realizedViralScore) {
  const template = await PromptTemplate.findOne({ templateId });
  if (!template) {
    throw new Error(`PromptTemplate not found: ${templateId}`);
  }

  template.avgViralScore = 0.9 * template.avgViralScore + 0.1 * realizedViralScore;
  template.usageCount += 1;

  await template.save();
  return template;
}

module.exports = { selectTemplate, recordOutcome };
