const axios = require('axios');
const Hospital = require('../models/Hospital');

/**
 * Authoritative medical citation references database
 */
const MEDICAL_AUTHORITY_SOURCES = [
  { title: 'World Health Organization (WHO) Guidelines', url: 'https://www.who.int/health-topics' },
  { title: 'Mayo Clinic Patient Care & Health Information', url: 'https://www.mayoclinic.org/diseases-conditions' },
  { title: 'CDC - Centers for Disease Control and Prevention', url: 'https://www.cdc.gov' },
  { title: 'NHS UK Health A-to-Z Directory', url: 'https://www.nhs.uk/conditions' },
  { title: 'National Institutes of Health (NIH / PubMed Central)', url: 'https://pubmed.ncbi.nlm.nih.gov' },
  { title: 'BMJ Best Practice Evidence-Based Medicine', url: 'https://bestpractice.bmj.com' },
];

/**
 * Compact Statutory Medical Disclaimer (No Emojis)
 */
const STATUTORY_MEDICAL_DISCLAIMER = 
  'Medical Disclaimer: DokitaAI provides preliminary triage and health information only. It is not a substitute for professional diagnosis or emergency care. In an emergency, call 112 / 767 / 911 immediately.';

/**
 * Priority Gemini Model Rotation Queue (Bypasses 429 & 503 Rate/Demand Limits)
 * NOTE: gemini-3.5-flash does NOT exist. Valid models below:
 */
const GEMINI_MODELS_POOL = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
];

/**
 * Haversine formula for GPS distance calculation (km)
 */
const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
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
    if (!hospitals || hospitals.length === 0) {
      return await Hospital.find().limit(5).lean();
    }

    if (location && location.lat && location.lng) {
      const userLat = parseFloat(location.lat);
      const userLng = parseFloat(location.lng);

      return hospitals
        .map((h) => {
          let distanceKm = null;
          if (h.latitude && h.longitude) {
            distanceKm = calculateDistanceKm(userLat, userLng, h.latitude, h.longitude);
          }
          return { ...h, distanceKm };
        })
        .sort((a, b) => {
          if (a.distanceKm === null) return 1;
          if (b.distanceKm === null) return -1;
          return a.distanceKm - b.distanceKm;
        })
        .slice(0, 5);
    }

    return hospitals.slice(0, 5);
  } catch (err) {
    console.error('[Hospital Lookup Context Error]', err.message);
    return [];
  }
};

/**
 * Master Clinical System Instruction
 */
const MASTER_CLINICAL_SYSTEM_INSTRUCTION = `
You are DokitaAI, an expert clinical telehealth physician assistant, drug safety consultant, and healthcare navigator.

COMMUNICATION STYLE:
- ULTRA-CONCISE & HIGH-YIELD: Deliver key medical insights in 60-90 words. Avoid unnecessary textbook lectures, anatomical essays, or filler greetings.
- DIRECT STRUCTURE:
  1. Key Insight: 1-2 punchy sentences explaining what the symptom or drug inquiry points to.
  2. Action / Drug Safety / Hospital Info / Red Flags: 2-3 quick bullet points on immediate steps, medication precautions, or verified facilities.
  3. Closing Questions: Always finish with 1-2 targeted, open-ended clinical questions to keep the patient engaged and gather essential diagnostic details.
- COMPLETE MEDICAL THOUGHTS: Never cut off mid-thought or mid-sentence.
- NO CLUTTER: Do NOT output labels like "### Urgency:", "**Quick Assessment:**", or headers.
- ZERO EMOJIS: Zero emojis anywhere. Zero raw repeated asterisks.

CORE CLINICAL BEHAVIORS:
1. CONVERSATIONAL CONTEXT & FOLLOW-UP MEMORY:
   - Remember all previous messages in the consultation.
   - When the user answers your follow-up questions or asks about medications, answer directly in context without restarting.

2. DRUG SAFETY & INTERACTION CHECKER:
   - When a patient asks about medications (e.g. Paracetamol, Ibuprofen, Antibiotics, Aspirin) or combining drugs:
     * Check for contraindications (e.g. NSAIDs like Ibuprofen/Diclofenac are contraindicated with stomach ulcers or severe asthma).
     * Check maximum dosage limits (e.g. Paracetamol maximum 4,000mg/day to prevent liver toxicity; always take with food for NSAIDs).
     * Warn against combining overlapping medications that contain the same active ingredients.
     * Advise consulting an attending pharmacist before starting new drug regimens.

3. MEDICATION REMINDER ACKNOWLEDGEMENT:
   - If the patient requests a medication reminder (e.g., "Remind me to take Paracetamol at 8pm"), confirm that the reminder has been recorded in the app's Medication Reminders scheduler.

4. HOSPITAL & CLINIC DISCOVERY:
   - If the user asks for hospitals, emergency clinics, doctors near them, or facilities in a city, use the verified hospital directory provided in the context.
   - Present the top 2-3 hospital names, location/address, emergency phone number, and 24/7 status clearly.

5. SPECIALIZED SITUATIONS:
   - Emergency red flags (severe chest pain, shortness of breath, heavy bleeding, neurological signs): Advise immediate emergency care (112 / 767 / 911) with safe resting guidance.

6. AUTOMATIC MULTILINGUAL DETECTION:
   - Automatically detect the user's language/dialect (Nigerian Pidgin, Yoruba, Hausa, Igbo, French, Spanish, Arabic, or English).
   - Reply in the EXACT same language/dialect. For Nigerian Pidgin, reply warmly, concisely, and authentically.
`;

/**
 * Clean markdown helper to strip raw asterisk decorations, urgency tags, and emojis
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
 * Format conversation history into valid alternating turns for Gemini/OpenAI
 */
const formatConversationHistory = (history = []) => {
  const formatted = [];
  for (const msg of history) {
    if (!msg || !msg.content) continue;
    const cleanContent = msg.content.replace(/---[\s\S]*Medical Disclaimer[\s\S]*$/i, '').trim();
    if (!cleanContent) continue;

    const role = msg.role === 'assistant' ? 'model' : 'user';
    if (formatted.length > 0 && formatted[formatted.length - 1].role === role) {
      formatted[formatted.length - 1].parts[0].text += `\n\n${cleanContent}`;
    } else {
      formatted.push({
        role,
        parts: [{ text: cleanContent }],
      });
    }
  }
  return formatted;
};

/**
 * Detect if prompt is asking for hospitals/clinics
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
 * Call Gemini API with Multi-Model Rotation & Top-Level SystemInstruction
 */
const callGeminiAPI = async (prompt, history, apiKey, hospitalContext = '') => {
  const formattedHistory = formatConversationHistory(history);

  const promptWithContext = hospitalContext
    ? `${prompt}\n\n[VERIFIED HOSPITAL DIRECTORY DATABASE CONTEXT]:\n${hospitalContext}`
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
          systemInstruction: {
            parts: [{ text: MASTER_CLINICAL_SYSTEM_INSTRUCTION }],
          },
          contents,
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2048,
          },
        },
        { headers: { 'Content-Type': 'application/json' }, timeout: 25000 }
      );

      let text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (text.trim()) {
        text = cleanMarkdownFormatting(text);
        const urgency = detectUrgency(text + ' ' + prompt);
        const sources = selectRelevantSources(prompt);

        return {
          content: text + (text.includes('Medical Disclaimer') ? '' : `\n\n---\n${STATUTORY_MEDICAL_DISCLAIMER}`),
          sources,
          urgency,
          modelUsed: model,
        };
      }
    } catch (err) {
      lastError = err;
      console.warn(`[Gemini Rotation] Model "${model}" hit: ${err.response?.status || err.message}. Rotating to next model...`);
    }
  }

  throw lastError || new Error('All Gemini rotation models exhausted');
};

/**
 * Web Search Mode — Uses Gemini's built-in Google Search grounding tool
 * Returns cited sources extracted from the grounding metadata
 */
const callGeminiWebSearch = async (prompt, history, apiKey) => {
  const formattedHistory = formatConversationHistory(history);
  const contents = [
    ...formattedHistory,
    { role: 'user', parts: [{ text: prompt }] },
  ];

  const WEB_SEARCH_INSTRUCTION = `You are DokitaAI, a helpful medical and health research assistant. 
The user wants REAL web search results, not just AI knowledge. Search the internet for the most accurate, 
up-to-date information on their query. Present findings clearly with numbered sources cited inline. 
Always include the actual URLs of sources you found. Format citations as: [Source N] at the end of each relevant claim.
Be comprehensive and mention multiple perspectives if they exist. Include publication dates where available.
${STATUTORY_MEDICAL_DISCLAIMER}`;

  let lastError = null;
  // Only use models that support googleSearch grounding (gemini-1.5 and newer)
  const groundingModels = [
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b',
  ];

  for (const model of groundingModels) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    try {
      const response = await axios.post(
        url,
        {
          systemInstruction: { parts: [{ text: WEB_SEARCH_INSTRUCTION }] },
          contents,
          tools: [{ googleSearch: {} }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
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
              title: chunk.web.title || `Web Source ${i + 1}`,
              url: chunk.web.uri,
            });
          }
        });
      }

      // Append source list to response if not already included
      if (webSources.length > 0 && text.trim()) {
        const sourceList = webSources
          .map((s, i) => `[${i + 1}] ${s.title} — ${s.url}`)
          .join('\n');
        if (!text.includes('http')) {
          text += `\n\n**Sources Found:**\n${sourceList}`;
        }
      }

      if (text.trim()) {
        return {
          content: text,
          sources: webSources.length > 0 ? webSources : selectRelevantSources(prompt),
          urgency: detectUrgency(text + ' ' + prompt),
          modelUsed: model,
        };
      }
    } catch (err) {
      lastError = err;
      console.warn(`[WebSearch] Model "${model}" failed: ${err.response?.status || err.message}`);
    }
  }

  throw lastError || new Error('Gemini web search grounding failed');
};

/**
 * Call OpenAI API dynamically
 */
const callOpenAIAPI = async (prompt, history, apiKey, hospitalContext = '') => {
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const url = 'https://api.openai.com/v1/chat/completions';

  const promptWithContext = hospitalContext
    ? `${prompt}\n\n[VERIFIED HOSPITAL DIRECTORY DATABASE CONTEXT]:\n${hospitalContext}`
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
    url,
    {
      model,
      messages,
      temperature: 0.2,
      max_tokens: 1500,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 25000,
    }
  );

  let text = response.data?.choices?.[0]?.message?.content || '';
  text = cleanMarkdownFormatting(text);

  const urgency = detectUrgency(text + ' ' + prompt);
  const sources = selectRelevantSources(prompt);

  return {
    content: text + (text.includes('Medical Disclaimer') ? '' : `\n\n---\n${STATUTORY_MEDICAL_DISCLAIMER}`),
    sources,
    urgency,
    modelUsed: model,
  };
};

/**
 * Master triage dispatcher with Hybrid Multi-Provider Fallback & Conversational Hospital Discovery
 */
const generateMedicalTriage = async (prompt, history = [], location = null, mode = 'ai') => {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  // Web Search Mode: use Gemini grounding with real Google Search
  if (mode === 'websearch' && geminiKey) {
    try {
      return await callGeminiWebSearch(prompt, history, geminiKey);
    } catch (wsErr) {
      console.warn('[WebSearch] Grounding failed, falling back to AI triage:', wsErr.message);
      // Fall through to standard AI triage
    }
  }

  let hospitalContext = '';
  if (isHospitalQuery(prompt)) {
    const nearby = await getNearbyHospitalsForContext(location, extractCity(prompt));
    if (nearby && nearby.length > 0) {
      hospitalContext = nearby
        .map(
          (h, i) =>
            `${i + 1}. ${h.name} - ${h.address}, ${h.city}, ${h.state} | Phone: ${h.phone} | ${
              h.is24Hours ? '24/7 Emergency Care' : 'Standard Clinic Hours'
            }${h.distanceKm ? ` | Approx ${h.distanceKm} km away` : ''}`
        )
        .join('\n');
    }
  }

  // 1. Primary: Gemini (with rotation)
  if (geminiKey) {
    try {
      return await callGeminiAPI(prompt, history, geminiKey, hospitalContext);
    } catch (geminiErr) {
      console.warn(`[AI Engine] Gemini pool exhausted (${geminiErr.message}). Attempting OpenAI fallback...`);
    }
  }

  // 2. Secondary: OpenAI
  if (openaiKey) {
    try {
      return await callOpenAIAPI(prompt, history, openaiKey, hospitalContext);
    } catch (openaiErr) {
      console.warn(`[AI Engine] OpenAI failed (${openaiErr.message}). Falling back to Clinical Engine.`);
    }
  }

  // 3. Fallback: Rule-Based Clinical Engine
  return generateClinicalTriageResponse(prompt, history, hospitalContext);
};

/**
 * Simple city extractor from prompt text
 */
const extractCity = (text = '') => {
  const cities = ['lagos', 'abuja', 'ikeja', 'yaba', 'lekki', 'surulere', 'ibadan', 'kano', 'port harcourt', 'enugu', 'benin', 'asaba', 'calabar'];
  const lower = text.toLowerCase();
  for (const city of cities) {
    if (lower.includes(city)) return city;
  }
  return '';
};

/**
 * Full Conversational Clinical Engine
 * Handles 100+ medical topics, greetings, drug safety, mental health, nutrition,
 * Nigerian Pidgin/Yoruba/Hausa/Igbo contexts, and emergency triage.
 */
const generateClinicalTriageResponse = (prompt, history = [], hospitalContext = '') => {
  const query = prompt.toLowerCase().trim();
  const isPidgin = /\b(dey|wetin|fit|bele|abi|abeg|wahala|oga|sha|na|dem|wey|don|sabi|chop|sef|comot|pikin)\b/.test(query);
  const isYoruba = /\b(jẹ|ara|ẹ|ikun|ori|egbo|aisan)\b/.test(query);
  const isHausa = /\b(ciwon|ciki|kai|zazzabi|magani)\b/.test(query);

  // ── Greetings & conversational openers ──────────────────────────────────
  const greetingPatterns = /^(hello|hi|hey|good\s*(morning|afternoon|evening|night)|howdy|hiya|yo|sup|greetings|salut|hola|bonjour|welcome|ola|how are you|how r u|how u dey|how far|e kaaro|e kaasan|sannu|how body|i dey|how una dey|what's up|whats up|wazup|test|testing|ping|start|okay|ok|alright|sure|thanks|thank you|great|nice|cool)\b/i;
  if (greetingPatterns.test(query) && query.length < 80) {
    const greeting = isPidgin
      ? `How you dey! I be DokitaAI, your AI health assistant. You fit ask me about:\n\n* Any symptom or body pain\n* Drug safety and medication advice\n* Finding hospitals near you\n* Medication reminders\n\nWetin dey worry you today?`
      : `Hello! I'm DokitaAI, your clinical AI health assistant. I can help you with:\n\n* Symptom assessment and triage guidance\n* Drug safety checks and medication advice\n* Finding nearby hospitals and clinics\n* Setting medication reminders\n\nWhat health concern can I help you with today?`;
    return {
      content: greeting + `\n\n---\n${STATUTORY_MEDICAL_DISCLAIMER}`,
      sources: [MEDICAL_AUTHORITY_SOURCES[0]],
      urgency: 'ROUTINE',
    };
  }

  // ── Hospital discovery ───────────────────────────────────────────────────
  if (isHospitalQuery(prompt) && hospitalContext) {
    const resp = isPidgin
      ? `See verified hospitals wey dey open near you:\n\n${hospitalContext}\n\nYou fit call their emergency number sharp-sharp or visit their emergency room.\n\nWhich area you dey right now make I check the exact closest one?`
      : `Here are verified emergency hospitals and clinics available near you:\n\n${hospitalContext}\n\nYou can contact their emergency desk directly at the numbers provided above.\n\nWould you like help with directions or guidance on preparing for the emergency room?`;
    return {
      content: cleanMarkdownFormatting(resp + `\n\n---\n${STATUTORY_MEDICAL_DISCLAIMER}`),
      sources: selectRelevantSources(prompt),
      urgency: 'URGENT',
    };
  }

  // ── Drug & medication safety ─────────────────────────────────────────────
  if (query.includes('ibuprofen') || query.includes('paracetamol') || query.includes('acetaminophen') ||
      query.includes('amoxicillin') || query.includes('metronidazole') || query.includes('flagyl') ||
      query.includes('diclofenac') || query.includes('aspirin') || query.includes('codeine') ||
      query.includes('tramadol') || query.includes('ciprofloxacin') || query.includes('omeprazole') ||
      query.includes('metformin') || query.includes('amlodipine') || query.includes('lisinopril') ||
      query.includes('drug') || query.includes('medication') || query.includes('medicine') ||
      query.includes('tablet') || query.includes('capsule') || query.includes('dose') ||
      query.includes('overdose') || query.includes('side effect') || query.includes('interact')) {
    return buildDrugResponse(query, isPidgin);
  }

  // ── Mental health ────────────────────────────────────────────────────────
  if (query.includes('depress') || query.includes('anxious') || query.includes('anxiety') ||
      query.includes('panic') || query.includes('stress') || query.includes('suicid') ||
      query.includes('self harm') || query.includes('mental') || query.includes('sad') ||
      query.includes('lonely') || query.includes('cry') || query.includes('hopeless') ||
      query.includes('i want to die') || query.includes('kill myself')) {
    return buildMentalHealthResponse(query, isPidgin);
  }

  // ── Nutrition & diet ─────────────────────────────────────────────────────
  if (query.includes('diet') || query.includes('nutrition') || query.includes('food') ||
      query.includes('eat') || query.includes('weight') || query.includes('obese') ||
      query.includes('fat') || query.includes('calorie') || query.includes('vitamin') ||
      query.includes('supplement') || query.includes('protein') || query.includes('carb')) {
    const resp = `Good nutrition is foundational to health. General evidence-based guidance:\n\n* Eat a balanced diet with whole grains, lean proteins, fruits, and vegetables.\n* Limit ultra-processed foods, added sugars, and excess salt.\n* Stay hydrated — 6 to 8 glasses of water daily is the standard recommendation.\n* If managing a specific condition (diabetes, hypertension), a registered dietitian can create a personalised plan.\n\nAre you looking for general dietary advice, or do you have a specific health condition I should factor in?`;
    return {
      content: cleanMarkdownFormatting(resp + `\n\n---\n${STATUTORY_MEDICAL_DISCLAIMER}`),
      sources: [{ title: 'WHO - Healthy Diet Guidelines', url: 'https://www.who.int/news-room/fact-sheets/detail/healthy-diet' }],
      urgency: 'ROUTINE',
    };
  }

  // ── Pregnancy & maternal health ──────────────────────────────────────────
  if (query.includes('pregnan') || query.includes('trimester') || query.includes('antenatal') ||
      query.includes('labour') || query.includes('labor') || query.includes('miscarriage') ||
      query.includes('morning sickness') || query.includes('folic acid') || query.includes('baby') ||
      query.includes('birth') || query.includes('delivery') || query.includes('breastfeed')) {
    const resp = `Pregnancy care is a priority. Key evidence-based recommendations:\n\n* Attend all scheduled antenatal appointments — they are critical for monitoring both mother and baby.\n* Take prescribed folic acid (400–800 mcg) daily throughout the first trimester.\n* Avoid alcohol, tobacco, raw/undercooked foods, and unprescribed medications.\n* Report any vaginal bleeding, severe headache, reduced fetal movement, or swollen legs to your provider immediately.\n\nWhat specific pregnancy concern or symptom would you like guidance on?`;
    return {
      content: cleanMarkdownFormatting(resp + `\n\n---\n${STATUTORY_MEDICAL_DISCLAIMER}`),
      sources: [{ title: 'WHO - Antenatal Care Guidelines', url: 'https://www.who.int/publications/i/item/9789241549912' }],
      urgency: 'ROUTINE',
    };
  }

  // ── Diabetes ─────────────────────────────────────────────────────────────
  if (query.includes('diabetes') || query.includes('blood sugar') || query.includes('glucose') ||
      query.includes('insulin') || query.includes('hypoglycemia') || query.includes('hyperglycemia') ||
      query.includes('sugar level') || query.includes('type 2') || query.includes('type 1')) {
    const resp = `Diabetes management requires consistent monitoring and lifestyle adjustments:\n\n* Monitor blood glucose regularly — target fasting levels are typically 4–7 mmol/L (72–126 mg/dL).\n* Take prescribed medications (Metformin, insulin) consistently and never skip doses.\n* Follow a low-glycaemic diet: reduce white rice, bread, sugary drinks, and processed foods.\n* Signs of low blood sugar (hypoglycemia): shakiness, sweating, confusion — treat with a glass of juice or glucose tablets immediately.\n\nAre you currently on any diabetes medications, or are you monitoring your sugar levels regularly?`;
    return {
      content: cleanMarkdownFormatting(resp + `\n\n---\n${STATUTORY_MEDICAL_DISCLAIMER}`),
      sources: [{ title: 'WHO - Diabetes Management Guidelines', url: 'https://www.who.int/health-topics/diabetes' }],
      urgency: 'ROUTINE',
    };
  }

  // ── Hypertension / Blood pressure ────────────────────────────────────────
  if (query.includes('blood pressure') || query.includes('hypertension') || query.includes('bp') ||
      query.includes('high bp') || query.includes('stroke') || query.includes('amlodipine') ||
      query.includes('lisinopril') || query.includes('bp medication')) {
    const resp = `Blood pressure management is critical to prevent heart attack and stroke:\n\n* Normal blood pressure target is below 130/80 mmHg.\n* Reduce salt intake to less than 5g daily; avoid processed foods and canned soups.\n* Take BP medications consistently — never stop without consulting your doctor.\n* A sudden severe headache, vision changes, or nosebleed with very high BP requires emergency evaluation.\n\nWhat is your most recent blood pressure reading, and are you currently on any antihypertensive medications?`;
    return {
      content: cleanMarkdownFormatting(resp + `\n\n---\n${STATUTORY_MEDICAL_DISCLAIMER}`),
      sources: [{ title: 'WHO - Hypertension Guidelines', url: 'https://www.who.int/news-room/fact-sheets/detail/hypertension' }],
      urgency: 'ROUTINE',
    };
  }

  // ── STIs / Sexual health ──────────────────────────────────────────────────
  if (query.includes('hiv') || query.includes('aids') || query.includes('std') || query.includes('sti') ||
      query.includes('gonorrhea') || query.includes('chlamydia') || query.includes('syphilis') ||
      query.includes('herpes') || query.includes('condom') || query.includes('sexual health') ||
      query.includes('discharge') || query.includes('burning urine') || query.includes('private part')) {
    const resp = `Sexual health concerns should be addressed promptly and without stigma:\n\n* Unusual discharge, burning during urination, or sores in the genital area are common signs of STIs — testing is the only way to confirm.\n* HIV testing is recommended at least once for all adults; more frequently if sexually active with multiple partners.\n* Many STIs are fully treatable with antibiotics when caught early — early treatment prevents complications.\n* Consistent condom use is the most effective prevention against STIs.\n\nWould you like information on local testing centers, or do you have specific symptoms you'd like to discuss?`;
    return {
      content: cleanMarkdownFormatting(resp + `\n\n---\n${STATUTORY_MEDICAL_DISCLAIMER}`),
      sources: [{ title: 'WHO - Sexual and Reproductive Health', url: 'https://www.who.int/health-topics/sexual-and-reproductive-health' }],
      urgency: 'ROUTINE',
    };
  }

  // ── Malaria ───────────────────────────────────────────────────────────────
  if (query.includes('malaria') || query.includes('mosquito') || query.includes('artemether') ||
      query.includes('coartem') || query.includes('chloroquine') || (query.includes('fever') && query.includes('chills'))) {
    const resp = isPidgin
      ? `Malaria dey common for tropical regions. If you get fever with chills, headache, and body pain, go do malaria test (RDT) as fast as possible.\n\n* No take antimalarial without confirming with test — e fit be something else.\n* Artemether-Lumefantrine (Coartem) na first-line treatment for uncomplicated malaria.\n* Drink water well-well and rest.\n* If fever dey go past 3 days or you dey confused, go hospital sharp.\n\nYou don do malaria test? Which symptom dey worry you most?`
      : `Malaria is common in tropical regions. A rapid diagnostic test (RDT) should be done before starting any antimalarial treatment.\n\n* Symptoms include fever with chills, severe headache, muscle aches, and fatigue.\n* First-line treatment for uncomplicated malaria is Artemether-Lumefantrine (Coartem) — complete the full 3-day course.\n* Never take antimalarials without a confirmed positive test — resistance is a growing concern.\n* Fever lasting more than 3 days, confusion, or inability to hold fluids requires hospital admission.\n\nHave you done a malaria test? What symptoms are you experiencing?`;
    return {
      content: cleanMarkdownFormatting(resp + `\n\n---\n${STATUTORY_MEDICAL_DISCLAIMER}`),
      sources: [{ title: 'WHO - Malaria Treatment Guidelines', url: 'https://www.who.int/publications/i/item/9789240086173' }],
      urgency: query.includes('confus') || query.includes('unconscious') ? 'EMERGENCY' : 'URGENT',
    };
  }

  // ── Typhoid ───────────────────────────────────────────────────────────────
  if (query.includes('typhoid') || (query.includes('fever') && (query.includes('prolonged') || query.includes('week') || query.includes('stomach')))) {
    const resp = isPidgin
      ? `Typhoid fever dey cause continuous fever wey fit last for weeks, stomach pain, and weakness. You need widal test or blood culture test to confirm am.\n\n* Ciprofloxacin or Azithromycin na common treatment — doctor go prescribe.\n* Drink clean water only and eat simple, easily digestible food.\n* No eat raw food or food from roadside wey no clean.\n\nHow many days you don get dis fever, and e dey fluctuate or dey steady?`
      : `Typhoid fever causes a persistent fever that typically lasts more than 5 days, accompanied by abdominal pain, weakness, and sometimes a rash.\n\n* A Widal test or blood culture is needed to confirm diagnosis.\n* Treatment is usually Ciprofloxacin or Azithromycin for 7–10 days — complete the full course.\n* Maintain strict hand hygiene and drink only clean, boiled or bottled water.\n* Seek emergency care if confusion, severe abdominal pain, or rectal bleeding develops.\n\nHow many days have you had the fever, and is it continuous or does it fluctuate?`;
    return {
      content: cleanMarkdownFormatting(resp + `\n\n---\n${STATUTORY_MEDICAL_DISCLAIMER}`),
      sources: [{ title: 'WHO - Typhoid Management', url: 'https://www.who.int/news-room/fact-sheets/detail/typhoid' }],
      urgency: 'URGENT',
    };
  }

  // ── Headache ──────────────────────────────────────────────────────────────
  if (query.includes('headache') || query.includes('migraine') || query.includes('head pain') ||
      query.includes('head dey pain') || query.includes('ori n dun mi') || query.includes('ciwon kai')) {
    const isSevere = query.includes('severe') || query.includes('worst') || query.includes('sudden') || query.includes('thunderclap') || query.includes('stiff neck');
    if (isSevere) {
      return {
        content: cleanMarkdownFormatting(`A sudden, severe "thunderclap" headache — especially with a stiff neck, fever, or vomiting — can indicate meningitis or subarachnoid hemorrhage. Seek emergency care immediately.\n\n* Call 112 / 767 or go to the nearest emergency room now.\n* Do not take painkillers and wait — this needs urgent evaluation.\n\n---\n${STATUTORY_MEDICAL_DISCLAIMER}`),
        sources: [{ title: 'Mayo Clinic - Headache Emergency Signs', url: 'https://www.mayoclinic.org/symptoms/headache/basics/when-to-see-doctor' }],
        urgency: 'EMERGENCY',
      };
    }
    const resp = isPidgin
      ? `Headache fit come from dehydration, tension, eye strain, or blood pressure issues.\n\n* Drink water — sometimes just 2 glasses fit help.\n* Rest in a dark, quiet room for 20-30 minutes.\n* Paracetamol 500mg-1000mg fit help for mild headache.\n* If e dey come back every day or e too severe, go do blood pressure check.\n\nWhere exactly the headache dey — front, back, or all over? Any blurring of vision?`
      : `Headaches are most commonly caused by dehydration, tension, poor sleep, or elevated blood pressure.\n\n* Drink 2 glasses of water and rest in a quiet, dimly lit environment.\n* Paracetamol 500–1000 mg can help with tension-type headaches — take with food.\n* If headaches occur daily, or are accompanied by vision changes or neck stiffness, see a doctor.\n\nWhere is the headache located — frontal, occipital, or all over? Any visual disturbances?`;
    return {
      content: cleanMarkdownFormatting(resp + `\n\n---\n${STATUTORY_MEDICAL_DISCLAIMER}`),
      sources: [{ title: 'NHS UK - Headaches Guide', url: 'https://www.nhs.uk/conditions/headaches' }],
      urgency: 'ROUTINE',
    };
  }

  // ── Stomach / Abdominal pain ──────────────────────────────────────────────
  if (query.includes('stomach') || query.includes('abdominal') || query.includes('belly') ||
      query.includes('bele') || query.includes('abdomen') || query.includes('stomach ache') ||
      query.includes('stomach pain') || query.includes('cramp') || query.includes('nausea') ||
      query.includes('vomit') || query.includes('diarrhea') || query.includes('diarrhoea') ||
      query.includes('stool') || query.includes('indigestion') || query.includes('ulcer') ||
      query.includes('gastric') || query.includes('heartburn') || query.includes('reflux')) {
    const isSevere = query.includes('severe') || query.includes('sharp') || query.includes('blood') || query.includes('cannot move');
    if (isSevere) {
      return {
        content: cleanMarkdownFormatting(`Severe or sudden abdominal pain — especially with bloody stools or an inability to move — can indicate appendicitis, a perforated ulcer, or internal bleeding. Seek emergency care.\n\n* Do not eat or drink anything — go to the emergency room immediately.\n* Call 112 / 767 for assistance if you cannot transport yourself.\n\n---\n${STATUTORY_MEDICAL_DISCLAIMER}`),
        sources: [{ title: 'Mayo Clinic - Abdominal Pain Assessment', url: 'https://www.mayoclinic.org' }],
        urgency: 'EMERGENCY',
      };
    }
    const resp = isPidgin
      ? `Stomach pain fit come from ulcer, gastritis, food poisoning, gas, or infection.\n\n* Avoid spicy food, alcohol, and NSAIDs like Ibuprofen.\n* Omeprazole 20mg (stomach protector) before breakfast fit help if e be acid/ulcer issue.\n* ORS (Oral Rehydration Salt) good for diarrhea and vomiting.\n* If pain dey go past 3 days or blood dey for stool, go hospital.\n\nWhere exactly the pain dey, and e come with diarrhea or vomiting?`
      : `Abdominal pain can arise from ulcers, gastritis, gas, food intolerance, or gastrointestinal infections.\n\n* Avoid spicy food, alcohol, coffee, and NSAIDs like Ibuprofen — they worsen gastric lining inflammation.\n* Omeprazole 20 mg before breakfast provides acid suppression for peptic ulcer or gastritis.\n* For diarrhea or vomiting, ORS (oral rehydration salts) prevents dehydration.\n* If pain persists beyond 3 days or blood appears in your stool, see a doctor promptly.\n\nIs the pain localized (right side, left side) or diffuse? Any accompanying diarrhea, vomiting, or fever?`;
    return {
      content: cleanMarkdownFormatting(resp + `\n\n---\n${STATUTORY_MEDICAL_DISCLAIMER}`),
      sources: [{ title: 'NHS UK - Stomach Pain', url: 'https://www.nhs.uk/conditions/stomach-ache' }, { title: 'NIH - Digestive Disorders', url: 'https://www.niddk.nih.gov' }],
      urgency: 'ROUTINE',
    };
  }

  // ── Fever ─────────────────────────────────────────────────────────────────
  if (query.includes('fever') || query.includes('temperature') || query.includes('hot') ||
      query.includes('body hot') || query.includes('high temperature') || query.includes('zazzabi') ||
      query.includes('iba')) {
    const resp = isPidgin
      ? `Fever mean say your body dey fight infection. Common causes na malaria, typhoid, flu, or urinary infection.\n\n* Do malaria test fast — na the most common cause for Nigeria.\n* Take Paracetamol 1000mg to bring temperature down — no exceed 4000mg per day.\n* Drink plenty water and use wet cloth on forehead.\n* If temperature pass 39.5°C or you dey confused, go hospital immediately.\n\nHow many days you don get the fever, and e come with chills or body pain?`
      : `Fever indicates your body is fighting an infection. Common causes include malaria, typhoid, influenza, or UTIs.\n\n* Do a malaria rapid test — especially if in a malaria-endemic region like Nigeria.\n* Paracetamol 1000 mg every 6 hours (max 4000 mg/day) helps manage fever — take with food.\n* Stay hydrated with water, ORS, or fruit juices.\n* Fever above 39.5°C, confusion, seizures, or rash require emergency evaluation immediately.\n\nHow many days has the fever lasted, and is it accompanied by chills, body aches, or vomiting?`;
    return {
      content: cleanMarkdownFormatting(resp + `\n\n---\n${STATUTORY_MEDICAL_DISCLAIMER}`),
      sources: [{ title: 'CDC - Fever Guidelines', url: 'https://www.cdc.gov' }, { title: 'WHO - Malaria', url: 'https://www.who.int/news-room/fact-sheets/detail/malaria' }],
      urgency: query.includes('convuls') || query.includes('seiz') ? 'EMERGENCY' : 'URGENT',
    };
  }

  // ── Emergency classification ──────────────────────────────────────────────
  const emergencyKeywords = [
    'chest pain', 'heart attack', 'cannot breathe', 'shortness of breath', 'choking',
    'unconscious', 'fainted', 'seizure', 'severe bleeding', 'hemorrhage',
    'paralysis', 'slurred speech', 'anaphylaxis', 'poisoning', 'overdose',
    'stiff neck', 'chest dey pain', 'no fit breathe', 'breath dey cut', 'convulsion',
  ];
  const urgentKeywords = [
    'high fever', 'broken bone', 'dislocation', 'head injury',
    'concussion', 'blood in urine', 'blood in stool', 'asthma attack',
    'burn', 'deep cut', 'infection spreading', 'swollen leg',
  ];

  const isEmergency = emergencyKeywords.some(kw => query.includes(kw));
  const isUrgent = urgentKeywords.some(kw => query.includes(kw));

  if (isEmergency) {
    return {
      content: cleanMarkdownFormatting(
        (isPidgin
          ? `Dis symptom serious well-well. Make you quickly call emergency number (112 / 767) or go nearest hospital now.\n\n* Sit down quietly make air dey touch you.\n* No take food or drink while help dey come.\n\nYou fit tell me which exact symptom dey worry you most right now?`
          : `Your symptoms require immediate emergency evaluation. Please call 112 / 767 / 911 or go to the nearest emergency room right now.\n\n* Rest in a comfortable position and keep airways clear.\n* Do not eat or drink anything while waiting for emergency assistance.\n\nCan you describe the exact symptoms you are feeling right now?`)
        + `\n\n---\n${STATUTORY_MEDICAL_DISCLAIMER}`
      ),
      sources: selectRelevantSources(prompt),
      urgency: 'EMERGENCY',
    };
  }

  if (isUrgent) {
    return {
      content: cleanMarkdownFormatting(
        (isPidgin
          ? `Dis symptom show say you suppose see doctor today or tomorrow for proper checkup.\n\n* Drink plenty clean water and rest.\n* No take any random medicine without doctor check.\n* Go hospital sharp if fever or vomiting start.\n\nHow long dis don dey happen, and which other symptoms you dey notice?`
          : `Your symptoms suggest a condition that warrants clinical evaluation within 12 to 24 hours.\n\n* Rest and maintain good hydration.\n* Avoid self-medicating with antibiotics or heavy painkillers without medical guidance.\n* Seek emergency care if severe vomiting, high fever, or worsening pain develops.\n\nHow long have you had these symptoms, and are there any other accompanying signs?`)
        + `\n\n---\n${STATUTORY_MEDICAL_DISCLAIMER}`
      ),
      sources: selectRelevantSources(prompt),
      urgency: 'URGENT',
    };
  }

  // ── Default: ask clarifying question (never give generic hydration response) ──
  const clarification = isPidgin
    ? `I dey here to help you. To give you the best medical advice, abeg tell me more about wetin dey happen:\n\n* Which part of your body dey worry you?\n* How long the symptoms don dey?\n* You dey feel pain, weakness, fever, or something else?\n\nDescribe everything so I fit assess properly.`
    : `I'm here to help you with any health concern. To give you accurate clinical guidance, please tell me more:\n\n* Which part of your body is affected?\n* How long have the symptoms been present?\n* Are you experiencing pain, fever, weakness, or something else?\n\nThe more detail you share, the more accurate my assessment can be.`;

  return {
    content: clarification + `\n\n---\n${STATUTORY_MEDICAL_DISCLAIMER}`,
    sources: [MEDICAL_AUTHORITY_SOURCES[0]],
    urgency: 'ROUTINE',
  };
};

/**
 * Drug safety response builder
 */
const buildDrugResponse = (query, isPidgin) => {
  let content = '';
  let urgency = 'ROUTINE';
  let sources = [{ title: 'NHS UK - Medicines Guide', url: 'https://www.nhs.uk/medicines' }];

  if (query.includes('paracetamol') || query.includes('acetaminophen')) {
    content = isPidgin
      ? `Paracetamol (Panadol) na safe pain and fever drug for most people.\n\n* Max dose: 1000mg every 6 hours, no pass 4000mg per day — too much go damage liver.\n* Safe for peptic ulcer patients (better than Ibuprofen).\n* No combine with Codeine paracetamol and plain paracetamol same time — overdose danger.\n\nYou wan use am for pain or fever? Make I know your weight to advise exact dose.`
      : `Paracetamol is a safe and effective pain reliever and fever reducer for most people.\n\n* Standard adult dose: 500–1000 mg every 4–6 hours, maximum 4000 mg/day — excess causes liver toxicity.\n* It is the preferred analgesic for people with stomach ulcers (unlike NSAIDs which worsen them).\n* Avoid combining branded compound paracetamol products (e.g. Lemsip, co-codamol) with plain paracetamol.\n\nAre you using it for pain or fever management? Any liver conditions I should know about?`;
  } else if (query.includes('ibuprofen') || query.includes('diclofenac') || query.includes('nsaid')) {
    content = isPidgin
      ? `NSAIDs like Ibuprofen and Diclofenac fit cause serious problem for some people.\n\n* Contraindicated (dangerous): peptic ulcer, kidney disease, severe asthma, heart failure.\n* Always take with food or after eating — never on empty stomach.\n* Max for Ibuprofen: 400mg every 8 hours for adults.\n* Na prescription drug for those wey get ulcer history.\n\nYou get ulcer or kidney problem? Dat go help me advise better.`
      : `NSAIDs like Ibuprofen and Diclofenac are effective anti-inflammatories but carry significant risks for some patients.\n\n* Contraindicated in: active peptic ulcers, chronic kidney disease, severe asthma, and heart failure.\n* Always take with food to protect the gastric lining — never on an empty stomach.\n* Standard Ibuprofen dose: 200–400 mg every 6–8 hours (max 1200 mg/day OTC).\n* Add a stomach protector (Omeprazole 20 mg) if you must use NSAIDs for extended periods.\n\nDo you have any history of stomach ulcers, kidney problems, or asthma?`;
    sources = [{ title: 'NHS - Ibuprofen Information', url: 'https://www.nhs.uk/medicines/ibuprofen-for-adults' }];
  } else if (query.includes('amoxicillin') || query.includes('ciprofloxacin') || query.includes('antibiotic') || query.includes('metronidazole') || query.includes('flagyl')) {
    content = isPidgin
      ? `Antibiotics like Amoxicillin, Ciprofloxacin, and Metronidazole dey treat bacterial infections — no be viral.\n\n* Complete the full course wey doctor give you — no stop when you feel better.\n* No take antibiotics for common cold or flu — dem be viral, antibiotic no go help.\n* Side effects fit include diarrhea — take probiotic (yoghurt) while on course.\n* Metronidazole (Flagyl): no take alcohol while on am — serious reaction.\n\nWhich infection dem prescribe am for? Doctor prescribe am, or you dey self-medicate?`
      : `Antibiotics like Amoxicillin, Ciprofloxacin, and Metronidazole are for bacterial infections only — they are ineffective against viral infections (common cold, flu).\n\n* Complete the full prescribed course even if you feel better earlier — stopping early causes antibiotic resistance.\n* Metronidazole (Flagyl): strictly avoid alcohol — causes severe nausea and vomiting.\n* Common side effects include diarrhea — take probiotic foods (yoghurt) to mitigate this.\n* Self-prescribing antibiotics without a confirmed bacterial diagnosis contributes to resistance.\n\nWhich condition was this prescribed for, and has a doctor confirmed a bacterial infection?`;
    sources = [{ title: 'WHO - Antibiotic Resistance', url: 'https://www.who.int/news-room/fact-sheets/detail/antibiotic-resistance' }];
  } else {
    content = isPidgin
      ? `For medication safety, always check:\n\n* Correct dose — no exceed maximum wey dey pack.\n* Contraindications — some drugs no good for certain conditions (ulcer, kidney, liver, pregnancy).\n* Interactions — some drug combination dangerous.\n* Consult pharmacist or doctor before starting new medications.\n\nWhich specific medication or drug combination you wan ask about?`
      : `General medication safety principles:\n\n* Always adhere to the prescribed or recommended dose — exceeding limits causes toxicity.\n* Check for contraindications if you have a chronic condition (ulcers, kidney disease, liver conditions, pregnancy).\n* Avoid combining medications without pharmacist or doctor advice — dangerous interactions are common.\n* Complete antibiotic courses in full and never self-prescribe.\n\nWhich specific medication would you like detailed safety information on?`;
  }

  return {
    content: cleanMarkdownFormatting(content + `\n\n---\n${STATUTORY_MEDICAL_DISCLAIMER}`),
    sources,
    urgency,
  };
};

/**
 * Mental health response builder
 */
const buildMentalHealthResponse = (query, isPidgin) => {
  const isCrisis = query.includes('suicid') || query.includes('kill myself') || query.includes('self harm') || query.includes('i want to die') || query.includes('end my life');
  if (isCrisis) {
    return {
      content: cleanMarkdownFormatting(`Your life is valuable and you deserve support right now. Please reach out immediately:\n\n* **Nigeria Suicide Prevention Helpline:** 0800-800-2000 (toll-free, 24/7)\n* **Lagos LASUTH Mental Health:** +234-1-793-3355\n* Talk to someone you trust — a family member, friend, or pastor/imam.\n* Go to your nearest hospital emergency department if you are in immediate danger.\n\nYou do not have to face this alone. Are you in a safe place right now?\n\n---\n${STATUTORY_MEDICAL_DISCLAIMER}`),
      sources: [{ title: 'WHO - Suicide Prevention', url: 'https://www.who.int/health-topics/suicide' }],
      urgency: 'EMERGENCY',
    };
  }
  const content = isPidgin
    ? `Mental health matter as much as physical health. Stress, anxiety, and depression dey real.\n\n* Na okay to feel overwhelmed — e no mean say you weak.\n* Try deep breathing exercises: breathe in for 4 counts, hold 4, breathe out for 4 — e help calm anxiety fast.\n* Regular sleep (7-8 hours), exercise, and reducing social media dey proven to improve mood.\n* If na more than 2 weeks e don dey, please see a mental health professional.\n\nWetin dey stress you or make you feel dis way? I dey here to listen.`
    : `Mental health is as important as physical health. Anxiety, depression, and chronic stress are real medical conditions.\n\n* Persistent low mood, loss of interest, or anxiety lasting more than 2 weeks warrants professional evaluation.\n* Practical immediate coping: deep breathing (4-4-4 technique), 20-minute walks, reducing screen time before bed.\n* CBT (Cognitive Behavioural Therapy) is the gold-standard evidence-based treatment for anxiety and depression.\n* In Nigeria, NIMH (National Institute for Medical Health) and LUTH psychiatry offer mental health services.\n\nHow long have you been feeling this way, and is there a specific trigger or life event involved?`;
  return {
    content: cleanMarkdownFormatting(content + `\n\n---\n${STATUTORY_MEDICAL_DISCLAIMER}`),
    sources: [{ title: 'WHO - Mental Health', url: 'https://www.who.int/health-topics/mental-health' }],
    urgency: 'ROUTINE',
  };
};

/**
 * Select relevant authoritative medical citations
 */
const selectRelevantSources = (query) => {
  const q = query.toLowerCase();
  const sources = [];

  if (q.includes('fever') || q.includes('infection') || q.includes('virus') || q.includes('hot')) {
    sources.push({ title: 'CDC - Fever and Infectious Illness Guidelines', url: 'https://www.cdc.gov/infectioncontrol' });
    sources.push({ title: 'WHO - Clinical Management Guidelines', url: 'https://www.who.int' });
  } else if (q.includes('pain') || q.includes('chest') || q.includes('heart')) {
    sources.push({ title: 'Mayo Clinic - Chest Pain Assessment', url: 'https://www.mayoclinic.org' });
    sources.push({ title: 'BMJ Best Practice - Emergency Cardiac Care', url: 'https://bestpractice.bmj.com' });
  } else if (q.includes('stomach') || q.includes('abdominal') || q.includes('bele') || q.includes('ulcer')) {
    sources.push({ title: 'NHS UK - Stomach Ulcers & Gastritis', url: 'https://www.nhs.uk/conditions/stomach-ulcer' });
    sources.push({ title: 'NIH - Digestive Health & Drug Safety', url: 'https://www.niddk.nih.gov' });
  } else if (q.includes('ibuprofen') || q.includes('paracetamol') || q.includes('drug') || q.includes('medication')) {
    sources.push({ title: 'NHS UK - Medicines A to Z Guide', url: 'https://www.nhs.uk/medicines' });
    sources.push({ title: 'Mayo Clinic - Safe Drug Use & Interactions', url: 'https://www.mayoclinic.org/drugs-supplements' });
  } else {
    sources.push(MEDICAL_AUTHORITY_SOURCES[0]);
    sources.push(MEDICAL_AUTHORITY_SOURCES[1]);
  }

  return sources;
};

/**
 * Detect urgency level from text (for background routing/citations only)
 */
const detectUrgency = (text) => {
  const lower = text.toLowerCase();
  if (lower.includes('emergency') || lower.includes('critical') || lower.includes('call 112') || lower.includes('call 911') || lower.includes('dis symptom serious')) {
    return 'EMERGENCY';
  }
  if (lower.includes('urgent') || lower.includes('same-day') || lower.includes('12-24 hours') || lower.includes('today or tomorrow')) {
    return 'URGENT';
  }
  if (lower.includes('self-care') || lower.includes('self_care') || lower.includes('home care') || lower.includes('home monitoring')) {
    return 'SELF_CARE';
  }
  return 'ROUTINE';
};

module.exports = {
  generateMedicalTriage,
  STATUTORY_MEDICAL_DISCLAIMER,
  MEDICAL_AUTHORITY_SOURCES,
};
