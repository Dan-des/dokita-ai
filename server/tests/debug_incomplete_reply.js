const axios = require('axios');
require('dotenv').config({ path: __dirname + '/../.env' });
const { generateMedicalTriage } = require('../services/aiService');

async function debugPrompt() {
  const prompt = 'Good. I have been feeling lower abdominal pain for the past 4 days. Severity ill say its still a bearable pain...andni have taken only paracetamol so far';
  
  console.log('Sending prompt to generateMedicalTriage...');
  const res = await generateMedicalTriage(prompt, []);
  console.log('--- Response Content ---');
  console.log(res.content);
  console.log('--- Model Used ---');
  console.log(res.modelUsed);
}

debugPrompt();
