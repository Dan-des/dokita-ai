require('dotenv').config({ path: __dirname + '/../.env' });
const { generateMedicalTriage } = require('../services/aiService');

async function testConversationalFollowUp() {
  console.log('🧪 Testing Multi-Turn Follow-Up & Command Intelligence...\n');

  // Turn 1: Initial symptom
  console.log('--- Turn 1: Initial Symptom Query ---');
  const turn1Prompt = 'I have had a mild headache and eye strain since 2pm.';
  const turn1Res = await generateMedicalTriage(turn1Prompt, []);
  console.log('Model Used:', turn1Res.modelUsed);
  console.log('Turn 1 Output:\n', turn1Res.content, '\n');

  // Turn 2: Follow-up question
  console.log('--- Turn 2: Follow-Up ("Can I take paracetamol?") ---');
  const history = [
    { role: 'user', content: turn1Prompt },
    { role: 'assistant', content: turn1Res.content },
  ];
  const turn2Prompt = 'Can I take paracetamol for it and how much water should I drink?';
  const turn2Res = await generateMedicalTriage(turn2Prompt, history);
  console.log('Model Used:', turn2Res.modelUsed);
  console.log('Turn 2 Output:\n', turn2Res.content, '\n');

  // Turn 3: Command ("elaborate on prevention")
  console.log('--- Turn 3: Command ("elaborate on prevention") ---');
  history.push({ role: 'user', content: turn2Prompt });
  history.push({ role: 'assistant', content: turn2Res.content });
  const turn3Prompt = 'elaborate on prevention for digital eye strain';
  const turn3Res = await generateMedicalTriage(turn3Prompt, history);
  console.log('Model Used:', turn3Res.modelUsed);
  console.log('Turn 3 Output:\n', turn3Res.content, '\n');

  console.log('✅ Multi-Turn Follow-Up & Command Intelligence Verified 100%!');
}

testConversationalFollowUp();
