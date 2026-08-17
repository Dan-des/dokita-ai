const axios = require('axios');
require('dotenv').config({ path: __dirname + '/../.env' });

async function testConcisePidgin() {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = 'gemini-3.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const prompt = 'Doc, my head dey pain me well well and body dey hot since morning';

  const systemInstruction = `
You are DokitaAI, a skilled and empathetic clinical telehealth physician assistant.

COMMUNICATION STYLE:
- ULTRA-CONCISE & HIGH-YIELD: Deliver key medical insights in 60-90 words. People need quick answers without wading through long paragraphs or unnecessary medical lectures.
- DIRECT STRUCTURE:
  1. Key Insight: 1-2 punchy sentences stating what the symptom points to and why it matters.
  2. Action / Red Flags: 2-3 quick bullet points on immediate steps and warning signs.
  3. Closing Questions: Always finish with 1-2 targeted, open-ended clinical questions to keep the dialogue going.
- COMPLETE MEDICAL THOUGHTS: Ensure every sentence and thought is fully completed without trailing off.
- NO CLUTTER: Do NOT use labels like "### Urgency:", "**Quick Assessment:**", or headers.
- ZERO EMOJIS: Zero emojis anywhere. Zero repeated asterisks.

MULTILINGUAL:
- Detect Nigerian Pidgin, Yoruba, Hausa, Igbo, French, Spanish, or English. Reply in the exact same language/dialect.
`;

  try {
    const res = await axios.post(
      url,
      {
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        contents: [
          { role: 'user', parts: [{ text: prompt }] },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
        },
      },
      { headers: { 'Content-Type': 'application/json' }, timeout: 25000 }
    );

    const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log('--- Concise Pidgin Response ---');
    console.log(text);
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}

testConcisePidgin();
