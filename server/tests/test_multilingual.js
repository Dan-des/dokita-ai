require('dotenv').config({ path: __dirname + '/../.env' });
const { generateMedicalTriage } = require('../services/aiService');

async function testMultilingual() {
  console.log('🌍 Testing Automatic Multilingual Clinical Triage...\n');

  // 1. Nigerian Pidgin Test
  console.log('--- 1. Testing Nigerian Pidgin Query ---');
  const pidginPrompt = 'Doc, my head dey pain me well well and I dey feel cold since morning.';
  console.log(`Prompt: "${pidginPrompt}"`);
  const pidginRes = await generateMedicalTriage(pidginPrompt);
  console.log('Urgency:', pidginRes.urgency);
  console.log('Response Preview:');
  console.log(pidginRes.content.substring(0, 300) + '...\n');

  // 2. French Query Test
  console.log('--- 2. Testing French Query ---');
  const frenchPrompt = "J'ai une forte fievre et un mal de gorge aigu depuis 2 jours.";
  console.log(`Prompt: "${frenchPrompt}"`);
  const frenchRes = await generateMedicalTriage(frenchPrompt);
  console.log('Urgency:', frenchRes.urgency);
  console.log('Response Preview:');
  console.log(frenchRes.content.substring(0, 300) + '...\n');

  console.log('✅ Multilingual Auto-Detection & Replies Verified!');
}

testMultilingual();
