/**
 * Engagement Predictor — weighted multi-dimensional viral scoring.
 * Scores content across 8 dimensions including gamification bonuses.
 */

// Weights across 10 scoring dimensions
const weights = {
  w1: 0.13, // title quality (length + power words)
  w2: 0.15, // keyword density in description
  w3: 0.10, // tone multiplier
  w4: 0.12, // social post quality (length + hashtags)
  w5: 0.10, // historical CTR
  w6: 0.10, // description richness (length + structure)
  w7: 0.10, // CTA presence and urgency
  w8: 0.10, // gamification rewards count + quality
  w9: 0.05, // badges
  w10: 0.05, // urgency triggers
};

let currentMAE = Infinity;

// Power words that boost viral potential
const POWER_WORDS = [
  'win', 'hack', 'build', 'master', 'dominate', 'unleash', 'compete',
  'exclusive', 'free', 'limited', 'ultimate', 'epic', 'live', 'now',
  'challenge', 'prize', 'cash', 'certificate', 'internship', 'opportunity',
];

// Urgency words in CTA
const URGENCY_WORDS = [
  'now', 'today', 'limited', 'spots', 'hurry', 'last', 'deadline',
  'only', 'left', 'closing', 'ends', 'final', 'register', 'join',
];

function normalize(value, min, max) {
  if (max === min) return 0;
  return Math.min(1, Math.max(0, (value - min) / (max - min)));
}

/**
 * Score title quality: length sweet spot (30-70 chars) + power word bonus.
 */
function scoreTitleQuality(title) {
  if (!title) return 0;
  const lengthScore = normalize(title.length, 5, 80);
  // Sweet spot bonus: 30-70 chars
  const sweetSpot = title.length >= 30 && title.length <= 70 ? 0.2 : 0;
  const lower = title.toLowerCase();
  const powerWordHits = POWER_WORDS.filter(w => lower.includes(w)).length;
  const powerBonus = Math.min(0.3, powerWordHits * 0.1);
  return Math.min(1, lengthScore + sweetSpot + powerBonus);
}

/**
 * Score social post quality: length + hashtag count.
 */
function scoreSocialPost(twitter) {
  if (!twitter) return 0;
  const lengthScore = normalize(twitter.length, 50, 280);
  const hashtagCount = (twitter.match(/#\w+/g) || []).length;
  const hashtagBonus = Math.min(0.3, hashtagCount * 0.06);
  return Math.min(1, lengthScore + hashtagBonus);
}

/**
 * Score description richness: length + paragraph structure.
 */
function scoreDescription(description) {
  if (!description) return 0;
  const plain = description.replace(/<[^>]+>/g, ' ').trim();
  const lengthScore = normalize(plain.length, 100, 800);
  // Bonus for multiple paragraphs (newlines)
  const paragraphs = plain.split(/\n+/).filter(p => p.trim().length > 20).length;
  const structureBonus = Math.min(0.3, paragraphs * 0.08);
  return Math.min(1, lengthScore + structureBonus);
}

/**
 * Score CTA urgency.
 */
function scoreCTA(cta) {
  if (!cta) return 0;
  const lower = cta.toLowerCase();
  const hits = URGENCY_WORDS.filter(w => lower.includes(w)).length;
  return Math.min(1, hits * 0.2);
}

/**
 * Score gamification rewards — more specific rewards = higher viral potential.
 */
function scoreGamification(rewards) {
  if (!Array.isArray(rewards) || rewards.length === 0) return 0;
  // 3+ rewards is optimal; bonus for monetary/internship keywords
  const base = Math.min(1, rewards.length / 3);
  const highValueKeywords = ['cash', '₹', '$', 'internship', 'certificate', 'prize', 'scholarship'];
  const highValueCount = rewards.filter(r =>
    highValueKeywords.some(kw => r.toLowerCase().includes(kw))
  ).length;
  const bonus = Math.min(0.3, highValueCount * 0.1);
  return Math.min(1, base + bonus);
}

/**
 * Score badges — named achievement badges increase engagement.
 */
function scoreBadges(badges) {
  if (!Array.isArray(badges) || badges.length === 0) return 0;
  return Math.min(1, badges.length / 3);
}

/**
 * Score urgency triggers — scarcity drives registrations.
 */
function scoreUrgency(triggers) {
  if (!Array.isArray(triggers) || triggers.length === 0) return 0;
  return Math.min(1, triggers.length / 3);
}

/**
 * Compute predicted viral score.
 * @returns {number} score in [0, 100]
 */
function score(features) {
  const {
    titleLength, keywordDensity, toneMultiplier,
    socialPostLength, historicalCTR,
    titleQuality, socialQuality, descriptionRichness, ctaScore,
    gamificationScore, badgeScore, urgencyScore,
  } = features;

  const f1 = titleQuality !== undefined ? titleQuality : normalize(titleLength, 5, 80);
  const f2 = Math.min(1, Math.max(0, keywordDensity));
  const f3 = Math.min(1, Math.max(0, toneMultiplier));
  const f4 = socialQuality !== undefined ? socialQuality : normalize(socialPostLength, 50, 280);
  const f5 = Math.min(1, Math.max(0, historicalCTR || 0));
  const f6 = descriptionRichness !== undefined ? descriptionRichness : 0.5;
  const f7 = ctaScore !== undefined ? ctaScore : 0.3;
  const f8 = gamificationScore !== undefined ? gamificationScore : 0;
  const f9 = badgeScore !== undefined ? badgeScore : 0;
  const f10 = urgencyScore !== undefined ? urgencyScore : 0;

  const raw =
    weights.w1 * f1 +
    weights.w2 * f2 +
    weights.w3 * f3 +
    weights.w4 * f4 +
    weights.w5 * f5 +
    weights.w6 * f6 +
    weights.w7 * f7 +
    weights.w8 * f8 +
    weights.w9 * f9 +
    weights.w10 * f10;

  return Math.round(Math.min(100, Math.max(0, raw * 100)));
}

function updateWeights(features, realizedCTR) {
  const predicted = score(features) / 100;
  const gradient = realizedCTR - predicted;
  const alpha = 0.1;
  Object.keys(weights).forEach(k => {
    weights[k] = (1 - alpha) * weights[k] + alpha * gradient;
  });
}

function retrain(allVariants) {
  if (!allVariants || allVariants.length === 0) return { accuracy: 0, rejected: true };
  let totalError = 0;
  for (const variant of allVariants) {
    const predicted = variant.predictedViralScore || 0;
    const realized = (variant.metrics?.ctr || 0) * 100;
    totalError += Math.abs(predicted - realized);
  }
  const newMAE = totalError / allVariants.length;
  const newAccuracy = Math.max(0, 1 - newMAE / 100);
  if (newMAE < currentMAE) {
    currentMAE = newMAE;
    return { accuracy: newAccuracy, rejected: false };
  }
  return { accuracy: newAccuracy, rejected: true };
}

/**
 * Extract rich features from textCopy and tone.
 */
function extractFeatures(textCopy, tone) {
  const title = textCopy?.title || '';
  const twitter = textCopy?.socialPosts?.twitter || '';
  const keywords = textCopy?.keywords || [];
  const description = textCopy?.descriptionHtml || textCopy?.description || '';
  const cta = textCopy?.callToAction || '';
  const rewards = textCopy?.gamificationRewards || [];

  // Basic features (kept for backward compat)
  const titleLength = title.length;
  const socialPostLength = twitter.length;

  // Keyword density
  const words = description.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean);
  const totalWords = words.length || 1;
  const keywordHits = keywords.reduce((count, kw) => {
    const re = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    return count + (description.match(re) || []).length;
  }, 0);
  const keywordDensity = Math.min(1, keywordHits / totalWords);

  const toneMap = { Professional: 0.7, Hype: 1.0, Academic: 0.6 };
  const toneMultiplier = toneMap[tone] ?? 0.7;

  // Enhanced features
  const titleQuality = scoreTitleQuality(title);
  const socialQuality = scoreSocialPost(twitter);
  const descriptionRichness = scoreDescription(description);
  const ctaScore = scoreCTA(cta);
  const gamificationScore = scoreGamification(rewards);

  const badges = textCopy?.badges || [];
  const urgencyTriggers = textCopy?.urgencyTriggers || [];
  const badgeScore = scoreBadges(badges);
  const urgencyScore = scoreUrgency(urgencyTriggers);

  return {
    titleLength,
    keywordDensity,
    toneMultiplier,
    socialPostLength,
    historicalCTR: 0,
    titleQuality,
    socialQuality,
    descriptionRichness,
    ctaScore,
    gamificationScore,
    badgeScore,
    urgencyScore,
  };
}

module.exports = { score, updateWeights, retrain, extractFeatures, weights };
