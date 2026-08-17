require('dotenv').config({ path: __dirname + '/../.env' });
const axios = require('axios');

const geminiKey = process.env.GEMINI_API_KEY;

async function testGenerate() {
  const model = 'gemini-3.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
  
  try {
    const res = await axios.post(url, {
      contents: [{ role: 'user', parts: [{ text: 'Hello, respond in one short medical sentence.' }] }]
    });
    console.log('Response:', res.data.candidates[0].content.parts[0].text);
  } catch (err) {
    console.error('Generation Error:', err.response?.data || err.message);
  }
}

testGenerate();
