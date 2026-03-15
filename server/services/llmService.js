const MODEL = 'llama-3.3-70b-versatile';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

function buildMessages(meta) {
  const dateStr = meta.eventDate ? (meta.eventDate + (meta.eventTime ? ' at ' + meta.eventTime : '')) : 'TBD';
  const deadlineStr = meta.registrationDeadline || 'TBD';
  const participationStr = meta.eventType === 'team' ? ('Team event, up to ' + (meta.teamSize || 4) + ' members') : 'Individual / solo';
  const system = 'You are an expert academic event marketing copywriter. Respond with ONLY a valid JSON object. Required keys: title, shortHook, description, socialPosts (twitter/instagram/linkedin), keywords. All strings must be properly JSON-escaped.';
  const user = 'Generate marketing content for this event:\nTitle: ' + meta.title + '\nCategory: ' + (meta.category || 'Academic Event') + '\nTopic: ' + meta.topic + '\nAudience: ' + (meta.targetAudience || 'All Students') + '\nVenue: ' + (meta.venue || 'TBD') + '\nDate: ' + dateStr + '\nDeadline: ' + deadlineStr + '\nParticipation: ' + participationStr + '\nCapacity: ' + (meta.capacity || 100) + '\nTone: ' + (meta.tone || 'Professional');
  return [{ role: 'system', content: system }, { role: 'user', content: user }];
}

function salvageFields(raw) {
  function extract(key) {
    var re = new RegExp('"' + key + '"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"', 's');
    var m = raw.match(re);
    return m ? m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : null;
  }
  var title = extract('title');
  var shortHook = extract('shortHook');
  var description = extract('description') || extract('descriptionHtml');
  if (!title || !shortHook || !description) return null;
  var kwMatch = raw.match(/"keywords"\s*:\s*\[([\s\S]*?)\]/);
  var keywords = kwMatch ? (kwMatch[1].match(/"([^"]+)"/g) || []).map(function(s) { return s.replace(/"/g, ''); }) : [];
  return { title: title, shortHook: shortHook, descriptionHtml: description, socialPosts: { twitter: extract('twitter') || '', instagram: extract('instagram') || '', linkedin: extract('linkedin') || '' }, keywords: keywords };
}

async function generateTextCopy(eventMetadata, _promptText, retries) {
  if (retries === undefined) retries = 2;
  var apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY is not configured');
  var messages = buildMessages(eventMetadata);
  for (var attempt = 0; attempt <= retries; attempt++) {
    try {
      var response = await fetch(GROQ_URL, { method: 'POST', headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: MODEL, messages: messages, response_format: { type: 'json_object' }, temperature: 0.7 }) });
      var data = await response.json();
      if (!response.ok) throw new Error((data && data.error && data.error.message) ? data.error.message : ('Groq API error: ' + response.status));
      var raw = (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) ? data.choices[0].message.content : '';
      var parsed = null;
      try { parsed = JSON.parse(raw); } catch(e1) {
        var stripped = raw.replace(/```json/g, '').replace(/```/g, '').trim();
        var jsonMatch = stripped.match(/\{[\s\S]*\}/);
        if (jsonMatch) { try { parsed = JSON.parse(jsonMatch[0]); } catch(e2) { parsed = null; } }
        if (!parsed) parsed = salvageFields(raw);
      }
      if (!parsed) throw new Error('Could not parse LLM response as JSON');
      var title = parsed.title;
      var shortHook = parsed.shortHook;
      var description = parsed.description || parsed.descriptionHtml;
      if (!title || !shortHook || !description) throw new Error('Response missing required fields');
      return { title: title, shortHook: shortHook, descriptionHtml: description, socialPosts: { twitter: (parsed.socialPosts && parsed.socialPosts.twitter) || '', instagram: (parsed.socialPosts && parsed.socialPosts.instagram) || '', linkedin: (parsed.socialPosts && parsed.socialPosts.linkedin) || '' }, keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [] };
    } catch(err) {
      if (attempt < retries) { console.warn('[LLMService] Attempt ' + (attempt + 1) + ' failed, retrying...', err.message); }
      else { console.error('[LLMService] All attempts failed:', err.message); throw new Error('LLM parse failed after retries'); }
    }
  }
}

module.exports = { generateTextCopy: generateTextCopy };