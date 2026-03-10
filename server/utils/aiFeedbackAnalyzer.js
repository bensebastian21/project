// server/utils/aiFeedbackAnalyzer.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
  if (!apiKey) return null;
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Analyzes the sentiment of a review comment using Google Gemini.
 */
async function analyzeSentiment(comment) {
  if (!comment || typeof comment !== 'string' || comment.trim().length === 0) {
    return { label: 'Neutral', score: 50 };
  }
  const genAI = getGenAI();
  if (!genAI) {
    console.warn('API_KEY is missing. Defaulting to Neutral sentiment.');
    return { label: 'Neutral', score: 50 };
  }
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = `
Analyze the sentiment of the following event review.
Respond ONLY with a valid JSON object in this exact format:
{"label": "Positive" | "Neutral" | "Negative", "score": <number between 0 and 100>}

Where 0 is extremely negative, 50 is neutral, and 100 is extremely positive.

Review: "${comment}"
    `;
    const result = await model.generateContent(prompt);
    const responseText = result.response
      .text()
      .replace(/\`\`\`json/g, '')
      .replace(/\`\`\`/g, '')
      .trim();
    try {
      const parsed = JSON.parse(responseText);
      let label = parsed.label;
      if (!['Positive', 'Neutral', 'Negative'].includes(label)) label = 'Neutral';
      let score = Number(parsed.score);
      if (isNaN(score) || score < 0 || score > 100) score = 50;
      return { label, score };
    } catch {
      return { label: 'Neutral', score: 50 };
    }
  } catch (error) {
    console.error('Gemini sentiment analysis failed:', error);
    return { label: 'Neutral', score: 50 };
  }
}

/**
 * Generates advanced AI insights for an event based on all its reviews.
 */
async function generateEventAIInsights(reviews) {
  if (!reviews || !Array.isArray(reviews) || reviews.length === 0) return null;
  const meaningfulReviews = reviews.filter((r) => r.comment && r.comment.trim().length > 0);
  if (meaningfulReviews.length === 0) return null;
  const genAI = getGenAI();
  if (!genAI) {
    console.warn('API_KEY is missing. Cannot generate AI event insights.');
    return null;
  }
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const reviewsText = meaningfulReviews
      .map((r, i) => `Review ${i + 1} (Rating: ${r.overallRating || 'N/A'}): "${r.comment}"`)
      .join('\n');

    const prompt = `
You are an expert event analyst. Analyze the following batch of student reviews for an event.
Based on the collective feedback, generate advanced actionable insights for the event host.

Respond ONLY with a valid JSON object in this exact format, with no markdown formatting or extra text:
{
  "overallSentiment": "A concise 1-2 sentence summary of the general consensus of the event.",
  "topPositives": ["Short bullet point 1", "Short bullet point 2", "Short bullet point 3"],
  "keyAreasForImprovement": ["Short bullet point 1", "Short bullet point 2"],
  "actionableSuggestions": [
    {"text": "Actionable advice 1", "priority": "High"},
    {"text": "Actionable advice 2", "priority": "Medium"},
    {"text": "Actionable advice 3", "priority": "Low"}
  ],
  "positiveKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "negativeKeywords": ["keyword1", "keyword2", "keyword3"],
  "overallScore": <number between 0 and 100 representing overall event quality>
}

Reviews:
${reviewsText}
    `;

    const result = await model.generateContent(prompt);
    let responseText = result.response
      .text()
      .replace(/\`\`\`json/g, '')
      .replace(/\`\`\`/g, '')
      .trim();

    try {
      const parsed = JSON.parse(responseText);
      return {
        overallSentiment: parsed.overallSentiment || 'Mixed or neutral responses.',
        topPositives: Array.isArray(parsed.topPositives) ? parsed.topPositives : [],
        keyAreasForImprovement: Array.isArray(parsed.keyAreasForImprovement)
          ? parsed.keyAreasForImprovement
          : [],
        actionableSuggestions: Array.isArray(parsed.actionableSuggestions)
          ? parsed.actionableSuggestions
          : [],
        positiveKeywords: Array.isArray(parsed.positiveKeywords) ? parsed.positiveKeywords : [],
        negativeKeywords: Array.isArray(parsed.negativeKeywords) ? parsed.negativeKeywords : [],
        overallScore:
          typeof parsed.overallScore === 'number'
            ? Math.min(100, Math.max(0, parsed.overallScore))
            : 50,
      };
    } catch {
      console.error('Failed to parse Gemini collective insights JSON:', responseText);
      return null;
    }
  } catch (error) {
    console.error('Gemini collective insights generation failed:', error);
    return null;
  }
}

/**
 * Generates cross-event portfolio-level AI insights for a host.
 */
async function generateCrossEventInsights(eventsData) {
  if (!eventsData || !Array.isArray(eventsData) || eventsData.length === 0) return null;

  const eventsWithReviews = eventsData.filter((e) => e.reviews && e.reviews.length > 0);
  if (eventsWithReviews.length === 0) return null;

  const genAI = getGenAI();
  if (!genAI) {
    console.warn('API_KEY is missing. Cannot generate portfolio insights.');
    return null;
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const eventsText = eventsWithReviews
      .map((ev) => {
        const avgRating = ev.reviews.length
          ? (
              ev.reviews.reduce((s, r) => s + (r.overallRating || 0), 0) / ev.reviews.length
            ).toFixed(1)
          : 'N/A';
        const comments = ev.reviews
          .filter((r) => r.comment && r.comment.trim())
          .slice(0, 5)
          .map((r) => `"${r.comment}"`)
          .join(', ');
        return `Event: "${ev.title}" | Avg Rating: ${avgRating}/5 | Reviews: ${ev.reviews.length} | Sample Comments: ${comments || 'No text comments'}`;
      })
      .join('\n\n');

    const prompt = `
You are an expert event portfolio analyst for a college event management platform.
Analyze the following data about multiple events hosted by a single host and generate strategic portfolio-level insights.

Respond ONLY with a valid JSON object in this exact format, with no markdown formatting or extra text:
{
  "portfolioSummary": "2-3 sentence overview of the host's event portfolio performance.",
  "bestEvent": "Title of the best-performing event and why (1 sentence)",
  "needsAttentionEvent": "Title of the event needing most improvement and why (1 sentence)",
  "crossEventStrengths": ["Strength shared across events 1", "Strength 2", "Strength 3"],
  "crossEventWeaknesses": ["Common weakness 1", "Common weakness 2"],
  "strategicRoadmap": [
    {"step": 1, "action": "Strategic action 1", "impact": "High"},
    {"step": 2, "action": "Strategic action 2", "impact": "Medium"},
    {"step": 3, "action": "Strategic action 3", "impact": "Medium"},
    {"step": 4, "action": "Strategic action 4", "impact": "Low"}
  ],
  "portfolioScore": <number 0-100 representing overall portfolio quality>
}

Events Data:
${eventsText}
    `;

    const result = await model.generateContent(prompt);
    let responseText = result.response
      .text()
      .replace(/\`\`\`json/g, '')
      .replace(/\`\`\`/g, '')
      .trim();

    try {
      const parsed = JSON.parse(responseText);
      return {
        portfolioSummary: parsed.portfolioSummary || 'Mixed performance across events.',
        bestEvent: parsed.bestEvent || '',
        needsAttentionEvent: parsed.needsAttentionEvent || '',
        crossEventStrengths: Array.isArray(parsed.crossEventStrengths)
          ? parsed.crossEventStrengths
          : [],
        crossEventWeaknesses: Array.isArray(parsed.crossEventWeaknesses)
          ? parsed.crossEventWeaknesses
          : [],
        strategicRoadmap: Array.isArray(parsed.strategicRoadmap) ? parsed.strategicRoadmap : [],
        portfolioScore:
          typeof parsed.portfolioScore === 'number'
            ? Math.min(100, Math.max(0, parsed.portfolioScore))
            : 50,
      };
    } catch {
      console.error('Failed to parse portfolio insights JSON:', responseText);
      return null;
    }
  } catch (error) {
    console.error('Gemini portfolio insights failed:', error);
    return null;
  }
}

module.exports = {
  analyzeSentiment,
  generateEventAIInsights,
  generateCrossEventInsights,
};
