const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { authenticateToken: auth } = require('../utils/auth');

function getGenAI() {
    const apiKey = process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
    if (!apiKey) {
        console.error('DEBUG: No API API Key found in env.');
        return null;
    }
    console.log('DEBUG: Using API Key starting with:', apiKey.substring(0, 7));
    return new GoogleGenerativeAI(apiKey);
}

/**
 * @desc Generate event marketing copy using AI
 * @route POST /api/marketing/generate
 * @access Private (Host only)
 */
router.post('/generate', auth, async (req, res) => {
    try {
        const { title, date, time } = req.body;
        const topic = req.body.topic || req.body.description;

        if (!topic) {
            return res.status(400).json({ error: 'Topic or description is required for generation.' });
        }

        const apiKey = process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            return res.status(503).json({ error: 'AI service not configured. Missing API Key.' });
        }

        const prompt = `
You are an expert event marketing specialist. Generate catchy marketing copy for an event with the following details:
- Title: ${title || 'N/A'}
- Date: ${date || 'N/A'}
- Time: ${time || 'N/A'}
- Topic/Description: ${topic}

Respond ONLY with a valid JSON object in this exact format:
{
  "titles": ["Catchy Title 1", "Catchy Title 2", "Catchy Title 3"],
  "description": "Engaging event description.",
  "socialPosts": {
    "twitter": "Short tweet.",
    "instagram": "IG caption.",
    "linkedin": "LinkedIn post."
  }
}
`;

        const MODEL = 'llama-3.3-70b-versatile';
        const url = `https://api.groq.com/openai/v1/chat/completions`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [{ role: 'user', content: prompt }]
            })
        });

        const data = await response.json();
        if (!response.ok) {
            console.error('AI API Error:', data);
            throw new Error(data?.error?.message || 'AI API call failed');
        }

        const text = data?.choices?.[0]?.message?.content || '';
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();

        try {
            const parsed = JSON.parse(cleanJson);
            res.json(parsed);
        } catch (parseError) {
            console.error('Failed to parse AI response:', text, parseError);
            res.status(500).json({ error: 'Failed to generate structured copy.' });
        }
    } catch (error) {
        console.error('Marketing copy generation failed:', error);
        res.status(500).json({ error: 'Server error during AI generation.', details: error.message });
    }
});

module.exports = router;
