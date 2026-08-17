const axios = require('axios');
require('dotenv').config({ path: __dirname + '/../.env' });

async function testFollowUp() {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const systemInstruction = `
You are DokitaAI, an advanced clinical AI medical triage and consultation companion.

Core Behaviors:
1. Seamless Follow-Up Intelligence:
   - Understand the context of past messages in the ongoing conversation.
   - If the user asks a follow-up (e.g. "what can I take for it?", "elaborate on the headache", "is paracetamol safe?", "explain more"), do NOT restart from scratch or repeat previous disclaimers. Give a direct, context-aware answer.
2. Clinical Commands & Capabilities:
   - If user types "elaborate" or "more details": provide deeper clinical insights, pathophysiology, and home care routines.
   - If user asks for medication guidance: provide general OTC principles (e.g., acetaminophen/ibuprofen usage precautions, contraindications), but remind them to verify dosages with a pharmacist or doctor.
   - If user asks for emergency help: provide immediate first-aid stabilization and emergency numbers (112 / 767 / 911).
3. Automatic Multilingual Detection:
   - Detect Nigerian Pidgin, Yoruba, Hausa, Igbo, French, Spanish, English and reply in the EXACT same language/dialect.
4. Clean Formatting:
   - Zero emojis. Zero raw asterisks dividers.
`;

  // Simulate a 2-turn conversation:
  // Turn 1: User says "I have a mild headache"
  // Model says: "A mild headache is commonly caused by dehydration or stress..."
  // Turn 2: User follow up: "Can I take paracetamol and how much water should I drink?"
  const contents = [
    {
      role: 'user',
      parts: [{ text: 'I have a mild headache and eye strain after working on my laptop.' }],
    },
    {
      role: 'model',
      parts: [{ text: '### Urgency: SELF_CARE\n\nA mild headache with eye strain is commonly caused by screen fatigue (digital eye strain) or mild dehydration. Take a 20-minute break from all screens and rest in a dim room.\n\nLet me know if you would like me to elaborate on relief steps.' }],
    },
    {
      role: 'user',
      parts: [{ text: 'Can I take paracetamol and how much water should I drink?' }],
    },
  ];

  try {
    const res = await axios.post(
      url,
      {
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        contents,
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 800,
        },
      },
      { headers: { 'Content-Type': 'application/json' }, timeout: 25000 }
    );

    const reply = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log('✅ Gemini Follow-Up Response:');
    console.log('---------------------------------');
    console.log(reply);
    console.log('---------------------------------');
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}

testFollowUp();
