require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const { generateMedicalTriage } = require('../services/aiService');

async function testLiveServices() {
  console.log('🧪 Testing Live Integration for MongoDB Atlas and Google Gemini AI Service...\n');

  let mongoSuccess = false;
  let aiSuccess = false;

  // 1. Test MongoDB Atlas Connection
  console.log('--- 1. Testing MongoDB Atlas Cloud Connection ---');
  try {
    const mongoUri = process.env.MONGODB_URI;
    console.log('Connecting to MongoDB URI:', mongoUri.replace(/:[^:]*@/, ':****@'));
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 15000 });
    console.log('✅ MongoDB Atlas Connected Successfully! Host:', mongoose.connection.host);
    mongoSuccess = true;
  } catch (err) {
    console.error('❌ MongoDB Atlas Connection Failed:', err.message);
  }

  // 2. Test Live Medical AI Triage Service
  console.log('\n--- 2. Testing AI Medical Triage Service (Gemini Live) ---');
  try {
    const prompt = 'I have a high fever of 39.2C, severe throat pain, and difficulty swallowing for 2 days.';
    console.log(`Sending medical prompt: "${prompt}"...`);
    const triageResult = await generateMedicalTriage(prompt);

    console.log('✅ AI Medical Triage Response Received!');
    console.log('Triage Urgency Level:', triageResult.urgency);
    console.log('Authoritative Sources:', triageResult.sources.map(s => s.title));
    console.log('\n--- Triage Preview ---');
    console.log(triageResult.content.substring(0, 350) + '...\n');
    aiSuccess = true;
  } catch (err) {
    console.error('❌ AI Triage Call Failed:', err.message);
  }

  // Summary
  console.log('=============================================');
  console.log('📋 LIVE INTEGRATION RESULTS:');
  console.log('  🗄️  MongoDB Atlas:  ', mongoSuccess ? '✅ CONNECTED & ONLINE' : '❌ FAILED');
  console.log('  🤖 AI Triage Engine:', aiSuccess ? '✅ LIVE & OPERATIONAL' : '❌ FAILED');
  console.log('=============================================\n');

  await mongoose.disconnect();
  process.exit(mongoSuccess && aiSuccess ? 0 : 1);
}

testLiveServices();
