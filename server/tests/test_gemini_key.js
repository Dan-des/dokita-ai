require('dotenv').config({ path: __dirname + '/../.env' });
const axios = require('axios');

const geminiKey = process.env.GEMINI_API_KEY;

async function testKey() {
  try {
    const res = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`);
    console.log('Gemini API Connection OK. Total Models:', res.data.models?.length);
  } catch (err) {
    console.error('Gemini Key Error:', err.response?.data || err.message);
  }
}

testKey();
