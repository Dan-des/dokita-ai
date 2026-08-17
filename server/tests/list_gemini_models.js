require('dotenv').config({ path: __dirname + '/../.env' });
const axios = require('axios');

const geminiKey = process.env.GEMINI_API_KEY;

async function listModels() {
  try {
    const res = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`);
    console.log('Available Gemini Models:');
    res.data.models.forEach(m => {
      if (m.supportedGenerationMethods?.includes('generateContent')) {
        console.log(`- ${m.name.replace('models/', '')} | Display: ${m.displayName}`);
      }
    });
  } catch (err) {
    console.error('Error listing models:', err.response?.data || err.message);
  }
}

listModels();
