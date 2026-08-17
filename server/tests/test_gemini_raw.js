const axios = require('axios');
require('dotenv').config({ path: __dirname + '/../.env' });

async function testRawGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await axios.post(url, {
    contents: [
      {
        role: 'user',
        parts: [
          { text: 'You are DokitaAI, a concise medical triage assistant. Answer in 2 short paragraphs: I have a slight headache and feel dizzy.' }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 1000,
    }
  });

  console.log('Candidate full object:', JSON.stringify(res.data?.candidates?.[0], null, 2));
}

testRawGemini();
