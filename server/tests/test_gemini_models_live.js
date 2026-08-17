require('dotenv').config({ path: __dirname + '/../.env' });
const axios = require('axios');

const geminiKey = process.env.GEMINI_API_KEY;

const modelsToTest = [
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-flash-latest',
  'gemini-3-flash-preview',
  'gemini-pro-latest'
];

async function testAllModels() {
  for (const model of modelsToTest) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
    try {
      const res = await axios.post(url, {
        contents: [{ role: 'user', parts: [{ text: 'Test' }] }]
      }, { timeout: 10000 });
      console.log(`[PASS] Model: ${model}`);
    } catch (err) {
      console.log(`[FAIL] Model: ${model} - Status: ${err.response?.status || err.message}`);
    }
  }
}

testAllModels();
