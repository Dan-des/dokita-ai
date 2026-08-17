const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });
const { generateMedicalTriage } = require('../services/aiService');

async function testHospitalLookup() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected for hospital test');

  const prompt = 'Find 24/7 emergency hospitals near me in Lagos';
  const location = { lat: 6.5244, lng: 3.3792 }; // Lagos coords

  const res = await generateMedicalTriage(prompt, [], location);
  console.log('--- Response Content ---');
  console.log(res.content);

  await mongoose.disconnect();
}

testHospitalLookup();
