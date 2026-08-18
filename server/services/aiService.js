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
 */
const GEMINI_MODELS_POOL = [
  process.env.GEMINI_MODEL || 'gemini-2.5-flash',
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
 * Clean Clinical Semantic Triage Engine (Concise, Fast, and Pidgin/English Aware)
 */
const generateClinicalTriageResponse = (prompt, history = [], hospitalContext = '') => {
  const query = prompt.toLowerCase();
  const isPidgin = query.includes('dey') || query.includes('wetin') || query.includes('fit') || query.includes('bele') || query.includes('abi') || query.includes('abeg');
  
  // Hospital discovery branch
  if (isHospitalQuery(prompt) && hospitalContext) {
    let resp = isPidgin
      ? `See verified hospitals wey dey open near you:\n\n${hospitalContext}\n\nYou fit call their emergency number sharp-sharp or visit their emergency room.\n\nWhich area you dey right now make I check the exact closest one?`
      : `Here are verified emergency hospitals and clinics available near you:\n\n${hospitalContext}\n\nYou can contact their emergency desk directly at the numbers provided above.\n\nWould you like help with directions or guidance on preparing for the emergency room?`;

    resp += `\n\n---\n${STATUTORY_MEDICAL_DISCLAIMER}`;
    return {
      content: cleanMarkdownFormatting(resp),
      sources: selectRelevantSources(prompt),
      urgency: 'URGENT',
    };
  }

  // Drug inquiry / safety branch
  if (query.includes('ibuprofen') && (query.includes('ulcer') || query.includes('stomach pain') || query.includes('paracetamol'))) {
    const resp = `Taking NSAIDs like Ibuprofen if you have a stomach ulcer can cause severe gastric bleeding and worsen ulcers. Paracetamol is generally safer for ulcer patients when taken within the maximum 4,000mg/day limit.\n\n* Avoid Ibuprofen, Aspirin, and Diclofenac if you have active ulcers.\n* Take medications with a full meal or antacids if prescribed.\n* Consult your doctor or pharmacist before introducing new pain relievers.\n\nAre you currently taking any prescription stomach protectors like Omeprazole?`;
    return {
      content: cleanMarkdownFormatting(resp + `\n\n---\n${STATUTORY_MEDICAL_DISCLAIMER}`),
      sources: selectRelevantSources(prompt),
      urgency: 'ROUTINE',
    };
  }

  let urgency = 'ROUTINE';
  const emergencyKeywords = [
    'chest pain', 'heart attack', 'cannot breathe', 'shortness of breath', 'choking',
    'stroke', 'unconscious', 'fainted', 'seizure', 'severe bleeding', 'hemorrhage',
    'paralysis', 'slurred speech', 'anaphylaxis', 'poisoning', 'suicidal', 'overdose',
    'stiff neck', 'chest dey pain', 'no fit breathe', 'breath dey cut'
  ];

  const urgentKeywords = [
    'high fever', 'fever above 39', 'fever above 103', 'persistent vomiting',
    'severe abdominal pain', 'fracture', 'broken bone', 'dislocation', 'head injury',
    'concussion', 'blood in urine', 'blood in stool', 'acute migraine', 'asthma attack',
    'burn', 'deep cut', 'infection spreading', 'swollen leg', 'body dey hot well well', 'bele dey bite me'
  ];

  const selfCareKeywords = [
    'mild headache', 'common cold', 'runny nose', 'sneeze', 'dry cough', 'sore throat',
    'mild fatigue', 'muscle soreness', 'acne', 'minor scrape', 'indigestion', 'bloating',
    'small headache', 'head dey pain'
  ];

  const isEmergency = emergencyKeywords.some(kw => query.includes(kw));
  const isUrgent = urgentKeywords.some(kw => query.includes(kw));
  const isSelfCare = selfCareKeywords.some(kw => query.includes(kw));

  if (isEmergency) {
    urgency = 'EMERGENCY';
  } else if (isUrgent) {
    urgency = 'URGENT';
  } else if (isSelfCare) {
    urgency = 'SELF_CARE';
  }

  let report = '';

  if (isPidgin) {
    if (urgency === 'EMERGENCY') {
      report = `Dis symptom serious well-well. Make you quickly call emergency number (112 / 767) or go nearest hospital now.\n\n* Sit down quietly make air dey touch you.\n* No take food or drink while help dey come.\n\nYou fit tell me if you dey feel chest tightness or shortness of breath?`;
    } else if (urgency === 'URGENT') {
      report = `Dis symptom show say you suppose see doctor within today or tomorrow for proper checkup.\n\n* Drink plenty clean water and rest.\n* No take any random medicine without doctor check.\n* Go hospital sharp if fever or vomiting start.\n\nHow long dis pain don start, and which other symptom you dey notice?`;
    } else {
      report = `Dis symptom fit be mild stress, infection, or dehydration wey fit clear with good rest.\n\n* Drink 2-3 liters of clean water daily.\n* Rest in a cool place and avoid heavy work.\n* Visit clinic if e persist pass 2 days.\n\nApart from dis, you dey feel any body heat or dizziness?`;
    }
  } else {
    if (urgency === 'EMERGENCY') {
      report = `Your symptoms require immediate emergency evaluation. Please call 112 / 767 / 911 or visit the nearest emergency room immediately.\n\n* Rest in a comfortable position and keep airways clear.\n* Do not ingest heavy food or drinks while waiting for assistance.\n\nAre you experiencing any shortness of breath, dizziness, or chest tightness right now?`;
    } else if (urgency === 'URGENT') {
      report = `Your symptoms suggest a condition that should be clinically examined by a healthcare professional within 12 to 24 hours.\n\n* Rest and stay well hydrated with water.\n* Avoid taking self-prescribed antibiotics or heavy painkillers.\n* Seek immediate emergency care if severe vomiting or high fever develops.\n\nHow long have you felt this way, and are you having any localized pain or changes in urination?`;
    } else {
      report = `Your symptoms are consistent with a mild issue that can be managed with home rest and hydration.\n\n* Drink 2-3 liters of fluids daily and rest in a quiet space.\n* Monitor your temperature and symptoms over the next 48 hours.\n* Consult a clinic if symptoms worsen or fail to improve.\n\nAre you experiencing any nausea, fever, or other associated symptoms?`;
    }
  }

  report += `\n\n---\n${STATUTORY_MEDICAL_DISCLAIMER}`;

  const sources = selectRelevantSources(prompt);

  return {
    content: cleanMarkdownFormatting(report),
    sources,
    urgency,
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
