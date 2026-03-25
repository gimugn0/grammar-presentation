export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) {}
  }
  if (!body) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    try { body = JSON.parse(Buffer.concat(chunks).toString()); } catch (e) {}
  }

  const { sentence, mode } = body;

  // Two different system prompts depending on mode
  const systemPrompt = mode === 'generate'
    ? `You are a grammar engine. Return ONLY a valid JSON object with this shape:
       {"sentence": "...", "explanation": "..."}
       sentence: a natural English sentence using Past Perfect for the first event and Simple Past for the second.
       explanation: one sentence explaining the tense choice.`
    : `You are a grammar analysis engine. Analyze the English sentence and return ONLY a valid JSON object.
