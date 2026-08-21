require('dotenv').config({ path: __dirname + '/../.env' });
const { generateMedicalTriage } = require('../services/aiService');

async function runResilienceTests() {
  console.log('🧪 Starting DokitaAI AI Triage Resilience & Fallback Tests...\n');

  const testCases = [
    {
      name: '1. Malaria & Fever Clinical Inquiry (English)',
      prompt: 'I have a high fever of 39C, shivering chills, and body weakness for 3 days.',
      expectedUrgency: ['URGENT', 'EMERGENCY'],
      keywords: ['malaria', 'fever', 'paracetamol', 'rdt'],
    },
    {
      name: '2. Nigerian Pidgin Consultation',
      prompt: 'Doc, my head dey pain me well well and body dey hot since morning.',
      expectedUrgency: ['ROUTINE', 'URGENT'],
      keywords: ['fever', 'headache', 'pain', 'paracetamol', 'dey'],
    },
    {
      name: '3. Drug Safety & NSAID Ulcer Contraindication',
      prompt: 'Can I take Ibuprofen if I have a stomach ulcer and headache?',
      expectedUrgency: ['ROUTINE', 'URGENT'],
      keywords: ['ulcer', 'nsaid', 'paracetamol', 'avoid', 'stomach'],
    },
    {
      name: '4. Life-Threatening Emergency Red Flag',
      prompt: 'Severe crushing chest pain radiating to left arm and cannot breathe!',
      expectedUrgency: ['EMERGENCY'],
      keywords: ['112', '767', 'emergency', 'hospital'],
    },
    {
      name: '5. Hospital Locator Request',
      prompt: 'Find emergency 24/7 hospitals in Ikeja Lagos.',
      expectedUrgency: ['ROUTINE', 'URGENT', 'EMERGENCY'],
      keywords: ['hospital', 'ikeja', '112'],
    },
  ];

  let passed = 0;

  for (const tc of testCases) {
    console.log(`--- Running: ${tc.name} ---`);
    console.log(`Prompt: "${tc.prompt}"`);

    try {
      const startTime = Date.now();
      const result = await generateMedicalTriage(tc.prompt);
      const elapsed = Date.now() - startTime;

      console.log(`⏱️ Response Time: ${elapsed}ms | Model Used: ${result.modelUsed} | Urgency: ${result.urgency}`);
      console.log(`Sources: ${result.sources.map(s => s.title).join('; ')}`);
      console.log(`Preview:\n${result.content.substring(0, 200)}...\n`);

      // Verifications:
      // 1. Content exists and is non-empty
      if (!result.content || result.content.length < 50) {
        throw new Error('Content too short or empty');
      }

      // 2. No emojis
      const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/gu;
      if (emojiRegex.test(result.content)) {
        throw new Error('Response contains emojis (prohibited by rules)');
      }

      // 3. No em dashes (Rule 9)
      if (result.content.includes('\u2014')) {
        throw new Error('Response contains em dash (prohibited by rules)');
      }

      // 4. Has medical disclaimer
      if (!result.content.toLowerCase().includes('medical disclaimer')) {
        throw new Error('Response missing statutory medical disclaimer');
      }

      // 5. Urgency matches expectation
      if (!tc.expectedUrgency.includes(result.urgency)) {
        console.warn(`⚠️ Warning: Urgency was ${result.urgency}, expected one of [${tc.expectedUrgency.join(', ')}]`);
      }

      console.log(`✅ ${tc.name} PASSED\n`);
      passed++;
    } catch (err) {
      console.error(`❌ ${tc.name} FAILED:`, err.message, '\n');
    }
  }

  console.log('=============================================');
  console.log(`🎯 Test Summary: ${passed} / ${testCases.length} Passed`);
  console.log('=============================================\n');

  process.exit(passed === testCases.length ? 0 : 1);
}

runResilienceTests();
