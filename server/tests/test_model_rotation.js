const axios = require('axios');
require('dotenv').config({ path: __dirname + '/../.env' });

const FALLBACK_GEMINI_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-flash-latest',
  'gemini-3-flash-preview',
  'gemini-pro-latest',
];

async function callGeminiWithRotation(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;

  for (const model of FALLBACK_GEMINI_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    try {
      console.log(`Trying model "${model}"...`);
      const res = await axios.post(
        url,
        {
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 300 },
        },
        { timeout: 10000 }
      );
      const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      console.log(`✅ Success with model "${model}"!`);
      return text;
    } catch (err) {
      console.log(`❌ Model "${model}" error: ${err.response?.status} (${err.response?.data?.error?.message?.slice(0, 80)}...)`);
    }
  }
}

callGeminiWithRotation('Test: 2-sentence response for mild cough');
