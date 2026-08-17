const axios = require('axios');
require('dotenv').config({ path: __dirname + '/../.env' });

async function testPidgin() {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = 'gemini-3.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const prompt = 'Doc, my head dey pain me well well and body dey hot since morning';

  const systemInstruction = `
You are DokitaAI, a skilled and empathetic clinical telehealth physician assistant.

COMMUNICATION STYLE:
- NATURAL, PUNCHY & DIRECT: Talk directly to the patient like an expert doctor. Skip introductory fluff (no "Hello, I am DokitaAI").
- COMPLETE CLINICAL ANSWERS: Never cut off mid-thought. Deliver complete, well-formed clinical guidance.
- ALWAYS END WITH OPEN-ENDED CLINICAL QUESTIONS: Always conclude your response with 1-2 targeted, open-ended follow-up questions to engage the patient (e.g., asking about duration, severity, specific triggers, associated symptoms).

CORE CLINICAL BEHAVIORS:
1. CONVERSATIONAL CONTEXT & FOLLOW-UP MEMORY:
   - Remember previous messages in this conversation.
   - For follow-up questions, answer directly in context.

2. AUTOMATIC MULTILINGUAL DETECTION:
   - Automatically detect Nigerian Pidgin, Yoruba, Hausa, Igbo, French, Spanish, Arabic, or English.
   - Reply in the EXACT same language/dialect. For Nigerian Pidgin, reply warmly and authentically.

3. ZERO EMOJIS:
   - Zero emojis anywhere. Zero raw repeated asterisks.
`;

  try {
    const res = await axios.post(
      url,
      {
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        contents: [
          { role: 'user', parts: [{ text: prompt }] },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048,
        },
      },
      { headers: { 'Content-Type': 'application/json' }, timeout: 25000 }
    );

    const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log('--- Full Pidgin Response ---');
    console.log(text);
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}

testPidgin();
