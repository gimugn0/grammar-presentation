export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { sentence } = req.body;

  const prompt = `You are a grammar analysis engine. Analyze the English sentence below and return ONLY a valid JSON object — no markdown, no explanation, no code fences.

The JSON must follow this exact structure:
{
  "document_id": "req_001",
  "original_text": "<the original sentence>",
  "events": [
    {
      "event_id": "evt_001",
      "chronological_order": 1,
      "event_name": "<short label, max 5 words>",
      "extracted_phrase": "<the exact clause from the sentence>",
      "tense": "<e.g. Past Perfect, Past Simple, Present Perfect, Past Continuous>",
      "tense_explanation": "<one sentence explaining why this tense is used, with the key verb in <strong> tags>",
      "text_appearance_order": 1,
      "relative_time_offset": -60
    }
  ]
}

Rules:
- chronological_order: 1 = earliest event in real time
- relative_time_offset: 0 = the reference/anchor event, negative = earlier, spacing reflects relative gap
- Include every clause that represents a distinct event
- tense_explanation must be plain English, educational, suitable for a grammar learner

Sentence to analyze: "${sentence}"`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json'
          }
        })
      }
    );

    const data = await response.json();
    const raw = data.candidates[0].content.parts[0].text;
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    res.status(200).json(parsed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Analysis failed', detail: err.message });
  }
}
