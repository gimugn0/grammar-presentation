module.exports = async function handler(req, res) {
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

  const systemPrompt = mode === 'generate'
    ? `You are a grammar engine. Return ONLY a valid JSON object with this shape:
       {"sentence": "...", "explanation": "..."}
       sentence: a natural English sentence using Past Perfect for the first event and Simple Past for the second.
       explanation: one sentence explaining the tense choice.`
    : `You are a grammar analysis engine. Analyze the English sentence and return ONLY a valid JSON object.
       {"document_id":"req_001","original_text":"...","events":[{"event_id":"evt_001","chronological_order":1,"event_name":"...","extracted_phrase":"...","tense":"...","tense_explanation":"...","text_appearance_order":1,"relative_time_offset":-60}]}
       Rules: chronological_order 1 = earliest. relative_time_offset 0 = anchor/reference event, negative = earlier. tense_explanation uses <strong> tags around the key verb.`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Return valid JSON. Input: "${sentence}"` }
        ]
      })
    });

    const data = await response.json();
    console.log('Groq raw response:', JSON.stringify(data));

    if (!data.choices || !data.choices[0]) {
      return res.status(500).json({ error: 'No response from Groq', detail: data });
    }

    const parsed = JSON.parse(data.choices[0].message.content);
    res.status(200).json(parsed);

  } catch (err) {
    console.error('Handler error:', err);
    res.status(500).json({ error: 'Analysis failed', detail: err.message });
  }
}
