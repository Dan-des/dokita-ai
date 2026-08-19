const axios = require('axios');
const Hospital = require('../models/Hospital');

/**
 * Compact Statutory Medical Disclaimer
 */
const STATUTORY_MEDICAL_DISCLAIMER =
  'Medical Disclaimer: DokitaAI provides preliminary triage and health information only. It is not a substitute for professional diagnosis or emergency care. In an emergency, call 112 / 767 / 911 immediately.';

/**
 * Authoritative medical citation references (used as fallback when grounding returns none)
 */
const MEDICAL_AUTHORITY_SOURCES = [
  { title: 'World Health Organization (WHO)', url: 'https://www.who.int/health-topics' },
  { title: 'Mayo Clinic', url: 'https://www.mayoclinic.org/diseases-conditions' },
  { title: 'CDC', url: 'https://www.cdc.gov' },
  { title: 'NHS UK', url: 'https://www.nhs.uk/conditions' },
  { title: 'NIH / PubMed', url: 'https://pubmed.ncbi.nlm.nih.gov' },
];

/**
 * Gemini models — updated to current available names (Aug 2026)
 * gemini-3.6-flash is the current fastest; fallback chain below
 */
const GEMINI_MODELS_PRIMARY = 'gemini-3.6-flash';
const GEMINI_MODELS_POOL = [
  'gemini-3.6-flash',
  'gemini-1.5-flash',
];

// Web-search-capable models (support googleSearch grounding tool)
const GEMINI_SEARCH_MODELS = [
  'gemini-3.6-flash',
  'gemini-1.5-flash',
];

/**
 * Haversine formula for GPS distance calculation (km)
 */
const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
};

/**
 * Query verified hospitals from MongoDB with optional GPS proximity
 */
const getNearbyHospitalsForContext = async (location = null, searchCity = '') => {
  try {
    let query = {};
    if (searchCity) {
      query.$or = [
        { city: { $regex: searchCity, $options: 'i' } },
        { state: { $regex: searchCity, $options: 'i' } },
        { address: { $regex: searchCity, $options: 'i' } },
      ];
    }
    const hospitals = await Hospital.find(query).limit(10).lean();
    const list = hospitals.length > 0 ? hospitals : await Hospital.find().limit(5).lean();

    if (location?.lat && location?.lng) {
      const uLat = parseFloat(location.lat);
      const uLng = parseFloat(location.lng);
      return list
        .map(h => ({
          ...h,
          distanceKm: h.latitude && h.longitude
            ? calculateDistanceKm(uLat, uLng, h.latitude, h.longitude)
            : null,
        }))
        .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
        .slice(0, 5);
    }
    return list.slice(0, 5);
  } catch (err) {
    console.error('[Hospital Lookup Error]', err.message);
    return [];
  }
};

/**
 * Detect if the user is asking for hospitals/clinics
 */
const isHospitalQuery = (text = '') => {
  const lower = text.toLowerCase();
  return (
    lower.includes('hospital') ||
    lower.includes('clinic') ||
    lower.includes('doctor near') ||
    lower.includes('health center') ||
    lower.includes('emergency room') ||
    lower.includes('er near') ||
    lower.includes('nearest clinic') ||
    lower.includes('see a doctor') ||
    lower.includes('medical center')
  );
};

/**
 * Simple city extractor from prompt
 */
const extractCity = (text = '') => {
  const cities = [
    'lagos', 'abuja', 'ikeja', 'yaba', 'lekki', 'surulere', 'ibadan',
    'kano', 'port harcourt', 'enugu', 'benin', 'asaba', 'calabar',
    'owerri', 'kaduna', 'jos', 'ilorin', 'warri', 'uyo',
  ];
  const lower = text.toLowerCase();
  return cities.find(c => lower.includes(c)) || '';
};

/**
 * Clean markdown — strip emojis and triple asterisks
 */
const cleanMarkdownFormatting = (text) => {
  if (!text) return '';
  return text
    .replace(/^###\s*Urgency:?.*$/gim, '')
    .replace(/^\*\*Urgency Classification\*\*:?.*$/gim, '')
    .replace(/^\s*\*{3,}\s*$/gm, '')
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/gu, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

/**
 * Format conversation history into valid alternating turns for Gemini
 */
const formatConversationHistory = (history = []) => {
  const formatted = [];
  for (const msg of history) {
    if (!msg?.content) continue;
    const cleanContent = msg.content.replace(/---[\s\S]*Medical Disclaimer[\s\S]*$/i, '').trim();
    if (!cleanContent) continue;
    const role = msg.role === 'assistant' ? 'model' : 'user';
    if (formatted.length > 0 && formatted[formatted.length - 1].role === role) {
      formatted[formatted.length - 1].parts[0].text += `\n\n${cleanContent}`;
    } else {
      formatted.push({ role, parts: [{ text: cleanContent }] });
    }
  }
  return formatted;
};

/**
 * Detect urgency level from text
 */
const detectUrgency = (text) => {
  const lower = text.toLowerCase();
  if (lower.includes('emergency') || lower.includes('call 112') || lower.includes('call 911') || lower.includes('immediate')) return 'EMERGENCY';
  if (lower.includes('urgent') || lower.includes('12-24 hours') || lower.includes('today or tomorrow')) return 'URGENT';
  if (lower.includes('self-care') || lower.includes('home care')) return 'SELF_CARE';
  return 'ROUTINE';
};

/**
 * Master Clinical System Instruction — used for both standard and web-search modes
 */
const MASTER_CLINICAL_SYSTEM_INSTRUCTION = `
You are DokitaAI, an expert clinical telehealth physician assistant, drug safety consultant, and healthcare navigator for Nigeria and Africa.

COMMUNICATION STYLE:
- ULTRA-CONCISE & HIGH-YIELD: Deliver key medical insights in 60-100 words. No textbook essays.
- DIRECT STRUCTURE:
  1. Key clinical insight: 1-2 sentences on what the symptom/question points to.
  2. Action steps / Drug safety / Red flags: 2-3 bullet points.
  3. Closing question: 1-2 targeted questions to gather more clinical detail.
- NO LABELS: Do NOT output headers like "### Urgency:" or "**Assessment:**".
- ZERO EMOJIS anywhere.
- COMPLETE THOUGHTS: Never cut off mid-sentence.

CORE CLINICAL BEHAVIOURS:
1. CONVERSATIONAL CONTEXT: Remember all previous messages in the consultation.
2. DRUG SAFETY: When asked about medications — check max doses, contraindications, interactions.
3. HOSPITAL DISCOVERY: If user asks for hospitals, use the verified hospital directory in context.
4. EMERGENCY FLAGS: Severe chest pain, stroke signs, heavy bleeding, unconsciousness — advise 112/767/911 immediately.
5. MULTILINGUAL: Auto-detect English, Nigerian Pidgin, Yoruba, Hausa, Igbo, French. Reply in the same language.
6. WEB SEARCH RESULTS: When you have real web search results, cite them naturally inline and prioritise current data over general knowledge.
`;

const WEB_SEARCH_SYSTEM_INSTRUCTION = `
You are DokitaAI, an expert clinical telehealth physician assistant for Nigeria and Africa.

You have access to real-time Google Search. Use it to give the most accurate, current medical information.

RULES:
- Search the web for the user's health query and synthesise findings into a clear, concise clinical answer.
- Cite real sources naturally inline. Format: "According to [Source], ..."
- Keep answers to 80-120 words — no essays.
- End with 1-2 targeted follow-up questions.
- ZERO emojis. No bold headers.
- For Nigerian context: reference NAFDAC guidelines, Nigerian hospitals, malaria/typhoid prevalence where relevant.
- For emergencies: immediately advise calling 112 / 767 / 911.
- Reply in the same language the user writes in (English, Pidgin, Yoruba, Hausa, Igbo, French, etc.).
- Always append: "Medical Disclaimer: DokitaAI provides preliminary health information only — not a substitute for professional medical diagnosis or emergency care."
`;

/**
 * PRIMARY: Gemini with Google Search Grounding (real web search)
 * This is the default for ALL queries — no hardcoded fallback logic.
 */
const callGeminiWebSearch = async (prompt, history, apiKey, hospitalContext = '') => {
  const formattedHistory = formatConversationHistory(history);

  const promptWithContext = hospitalContext
    ? `${prompt}\n\n[VERIFIED HOSPITAL DIRECTORY]:\n${hospitalContext}`
    : prompt;

  const contents = [
    ...formattedHistory,
    { role: 'user', parts: [{ text: promptWithContext }] },
  ];

  let lastError = null;

  for (const model of GEMINI_SEARCH_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    try {
      const response = await axios.post(
        url,
        {
          systemInstruction: { parts: [{ text: WEB_SEARCH_SYSTEM_INSTRUCTION }] },
          contents,
          tools: [{ googleSearch: {} }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
        },
        { headers: { 'Content-Type': 'application/json' }, timeout: 30000 }
      );

      let text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const groundingMeta = response.data?.candidates?.[0]?.groundingMetadata;

      // Extract real web sources from grounding metadata
      const webSources = [];
      if (groundingMeta?.groundingChunks) {
        groundingMeta.groundingChunks.forEach((chunk, i) => {
          if (chunk.web?.uri) {
            webSources.push({
              title: chunk.web.title || `Source ${i + 1}`,
              url: chunk.web.uri,
            });
          }
        });
      }

      if (text.trim()) {
        text = cleanMarkdownFormatting(text);
        // Append disclaimer if not already present
        if (!text.includes('Medical Disclaimer')) {
          text += `\n\n---\n${STATUTORY_MEDICAL_DISCLAIMER}`;
        }
        return {
          content: text,
          sources: webSources.length > 0 ? webSources : MEDICAL_AUTHORITY_SOURCES.slice(0, 2),
          urgency: detectUrgency(text + ' ' + prompt),
          modelUsed: model,
          searchGrounded: webSources.length > 0,
        };
      }
    } catch (err) {
      lastError = err;
      console.warn(`[WebSearch] Model "${model}" failed: ${err.response?.status || err.message}. Trying next...`);
    }
  }

  throw lastError || new Error('Gemini web search grounding exhausted all models');
};

/**
 * SECONDARY: Standard Gemini (no web search) — used only if grounding fails
 */
const callGeminiStandard = async (prompt, history, apiKey, hospitalContext = '') => {
  const formattedHistory = formatConversationHistory(history);

  const promptWithContext = hospitalContext
    ? `${prompt}\n\n[VERIFIED HOSPITAL DIRECTORY]:\n${hospitalContext}`
    : prompt;

  const contents = [
    ...formattedHistory,
    { role: 'user', parts: [{ text: promptWithContext }] },
  ];

  let lastError = null;

  for (const model of GEMINI_MODELS_POOL) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    try {
      const response = await axios.post(
        url,
        {
          systemInstruction: { parts: [{ text: MASTER_CLINICAL_SYSTEM_INSTRUCTION }] },
          contents,
          generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
        },
        { headers: { 'Content-Type': 'application/json' }, timeout: 25000 }
      );

      let text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (text.trim()) {
        text = cleanMarkdownFormatting(text);
        if (!text.includes('Medical Disclaimer')) {
          text += `\n\n---\n${STATUTORY_MEDICAL_DISCLAIMER}`;
        }
        return {
          content: text,
          sources: MEDICAL_AUTHORITY_SOURCES.slice(0, 2),
          urgency: detectUrgency(text + ' ' + prompt),
          modelUsed: model,
          searchGrounded: false,
        };
      }
    } catch (err) {
      lastError = err;
      console.warn(`[Standard Gemini] Model "${model}" failed: ${err.response?.status || err.message}. Trying next...`);
    }
  }

  throw lastError || new Error('All Gemini models exhausted');
};

/**
 * Call OpenAI as tertiary fallback (if OPENAI_API_KEY is set)
 */
const callOpenAIAPI = async (prompt, history, apiKey, hospitalContext = '') => {
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const promptWithContext = hospitalContext
    ? `${prompt}\n\n[VERIFIED HOSPITAL DIRECTORY]:\n${hospitalContext}`
    : prompt;

  const messages = [
    { role: 'system', content: MASTER_CLINICAL_SYSTEM_INSTRUCTION },
    ...history.map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content.replace(/---[\s\S]*Medical Disclaimer[\s\S]*$/i, '').trim(),
    })),
    { role: 'user', content: promptWithContext },
  ];

  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    { model, messages, temperature: 0.2, max_tokens: 1500 },
    {
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      timeout: 25000,
    }
  );

  let text = response.data?.choices?.[0]?.message?.content || '';
  text = cleanMarkdownFormatting(text);
  if (!text.includes('Medical Disclaimer')) {
    text += `\n\n---\n${STATUTORY_MEDICAL_DISCLAIMER}`;
  }

  return {
    content: text,
    sources: MEDICAL_AUTHORITY_SOURCES.slice(0, 2),
    urgency: detectUrgency(text + ' ' + prompt),
    modelUsed: model,
    searchGrounded: false,
  };
};

/**
 * Master triage dispatcher
 * Priority: (1) Gemini Web Search → (2) Standard Gemini → (3) OpenAI → (4) Hard error
 * NO hardcoded rule-based fallback — all answers come from real AI
 */
const generateMedicalTriage = async (prompt, history = [], location = null, mode = 'ai') => {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  // Build hospital context if relevant
  let hospitalContext = '';
  if (isHospitalQuery(prompt)) {
    const nearby = await getNearbyHospitalsForContext(location, extractCity(prompt));
    if (nearby.length > 0) {
      hospitalContext = nearby
        .map(
          (h, i) =>
            `${i + 1}. ${h.name} — ${h.address}, ${h.city}, ${h.state} | Phone: ${h.phone} | ${
              h.is24Hours ? '24/7 Emergency Care' : 'Standard Hours'
            }${h.distanceKm ? ` | ~${h.distanceKm} km away` : ''}`
        )
        .join('\n');
    }
  }

  if (!geminiKey) {
    console.error('[AI Engine] GEMINI_API_KEY is not set. Cannot serve response.');
    throw new Error('AI service is not configured. Please set GEMINI_API_KEY in environment variables.');
  }

  // 1. Primary: If mode is websearch, try Gemini with real-time Google Search grounding
  if (mode === 'websearch') {
    try {
      console.log('[AI Engine] Attempting Gemini Web Search grounding...');
      return await callGeminiWebSearch(prompt, history, geminiKey, hospitalContext);
    } catch (webErr) {
      console.log(`[AI Engine] Web search grounding failed (${webErr.message}). Falling back to standard Gemini...`);
    }
  }

  // 2. Standard Gemini (uses training knowledge, no live search)
  try {
    console.log('[AI Engine] Attempting standard Gemini...');
    return await callGeminiStandard(prompt, history, geminiKey, hospitalContext);
  } catch (stdErr) {
    console.warn(`[AI Engine] Standard Gemini failed (${stdErr.message}). Trying OpenAI...`);
  }

  // 3. Tertiary: OpenAI (if key available)
  if (openaiKey) {
    try {
      console.log('[AI Engine] Attempting OpenAI...');
      return await callOpenAIAPI(prompt, history, openaiKey, hospitalContext);
    } catch (openaiErr) {
      console.warn(`[AI Engine] OpenAI also failed (${openaiErr.message}).`);
    }
  }

  // 4. All providers failed — throw so the route returns a proper 500 with message
  throw new Error('All AI providers are currently unavailable. Please try again in a moment.');
};

module.exports = {
  generateMedicalTriage,
  STATUTORY_MEDICAL_DISCLAIMER,
  MEDICAL_AUTHORITY_SOURCES,
};
