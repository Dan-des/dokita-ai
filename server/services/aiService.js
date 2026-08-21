const axios = require('axios');
const mongoose = require('mongoose');
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
  { title: 'CDC - Centers for Disease Control and Prevention', url: 'https://www.cdc.gov' },
  { title: 'NHS UK Health A to Z', url: 'https://www.nhs.uk/conditions' },
  { title: 'National Institutes of Health (NIH / PubMed)', url: 'https://pubmed.ncbi.nlm.nih.gov' },
  { title: 'NAFDAC Nigeria - Drug Safety & Guidelines', url: 'https://www.nafdac.gov.ng' },
];

/**
 * Validated Gemini model pool - ordered by speed, capability, and reliability
 */
const GEMINI_MODELS_POOL = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
  'gemini-1.5-pro',
];

// Web-search-capable models (support googleSearch grounding tool)
const GEMINI_SEARCH_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
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
    if (mongoose.connection.readyState !== 1) {
      return [];
    }

    let query = {};
    if (searchCity) {
      query.$or = [
        { city: { $regex: searchCity, $options: 'i' } },
        { state: { $regex: searchCity, $options: 'i' } },
        { address: { $regex: searchCity, $options: 'i' } },
      ];
    }
    const hospitals = await Hospital.find(query).maxTimeMS(2000).limit(10).lean();
    const list = hospitals.length > 0 ? hospitals : await Hospital.find().maxTimeMS(2000).limit(5).lean();

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
 * Clean markdown - strip emojis and triple asterisks
 */
const cleanMarkdownFormatting = (text) => {
  if (!text) return '';
  return text
    .replace(/^###\s*Urgency:?.*$/gim, '')
    .replace(/^\*\*Urgency Classification\*\*:?.*$/gim, '')
    .replace(/^\s*\*{3,}\s*$/gm, '')
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/gu, '')
    .replace(/\u2014/g, ' - ') // Replace em-dashes with hyphen
    .replace(/\u2013/g, '-')   // Replace en-dashes with hyphen
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
  if (
    lower.includes('emergency') ||
    lower.includes('call 112') ||
    lower.includes('call 911') ||
    lower.includes('call 767') ||
    lower.includes('immediate') ||
    lower.includes('critical') ||
    lower.includes('life-threatening')
  ) {
    return 'EMERGENCY';
  }
  if (
    lower.includes('urgent') ||
    lower.includes('12-24 hours') ||
    lower.includes('today or tomorrow') ||
    lower.includes('within 24 hours') ||
    lower.includes('prompt medical attention') ||
    lower.includes('malaria') ||
    lower.includes('fever')
  ) {
    return 'URGENT';
  }
  if (
    lower.includes('self-care') ||
    lower.includes('home care') ||
    lower.includes('mild') ||
    lower.includes('home management')
  ) {
    return 'SELF_CARE';
  }
  return 'ROUTINE';
};

/**
 * Master Clinical System Instruction
 */
const MASTER_CLINICAL_SYSTEM_INSTRUCTION = `
You are DokitaAI, an expert clinical telehealth physician assistant, drug safety consultant, and healthcare navigator for Nigeria and Africa.

COMMUNICATION STYLE:
- ULTRA-CONCISE & HIGH-YIELD: Deliver key medical insights in 60-100 words. No textbook essays.
- DIRECT STRUCTURE:
  1. Key clinical insight: 1-2 sentences on what the symptom or question points to.
  2. Action steps / Drug safety / Red flags: 2-3 bullet points.
  3. Closing question: 1-2 targeted diagnostic questions to gather clinical detail.
- NO LABELS: Do NOT output headers like "### Urgency:" or "**Assessment:**".
- ZERO EMOJIS anywhere.
- NO EM DASHES. Use simple hyphens (-) or colons (:).
- COMPLETE THOUGHTS: Never cut off mid-sentence.

CORE CLINICAL BEHAVIOURS:
1. CONVERSATIONAL CONTEXT: Remember all previous messages in the consultation.
2. DRUG SAFETY: When asked about medications, check max daily doses, contraindications, and interactions.
3. HOSPITAL DISCOVERY: If user asks for hospitals, use the verified hospital directory in context.
4. EMERGENCY FLAGS: Severe chest pain, stroke signs (FAST), heavy bleeding, severe breathlessness, unconsciousness: advise 112 / 767 / 911 immediately.
5. MULTILINGUAL: Auto-detect English, Nigerian Pidgin, Yoruba, Hausa, Igbo, French. Reply in the same language.
6. REAL-WORLD PRACTICALITY: Recommend accessible Nigerian and African clinical protocols (e.g. malaria RDT testing, ORS for dehydration, NAFDAC drug safety).
`;

const WEB_SEARCH_SYSTEM_INSTRUCTION = `
You are DokitaAI, an expert clinical telehealth physician assistant for Nigeria and Africa.

You have access to real-time Google Search. Use it to give the most accurate, current medical information.

RULES:
- Search the web for the user's health query and synthesise findings into a clear, concise clinical answer.
- Cite real sources naturally inline. Format: "According to [Source], ..."
- Keep answers to 80-120 words - no essays.
- End with 1-2 targeted follow-up questions.
- ZERO emojis. No bold headers. No em-dashes.
- For Nigerian context: reference NAFDAC guidelines, Nigerian hospitals, malaria/typhoid prevalence where relevant.
- For emergencies: immediately advise calling 112 / 767 / 911.
- Reply in the same language the user writes in (English, Pidgin, Yoruba, Hausa, Igbo, French, etc.).
- Always append: "Medical Disclaimer: DokitaAI provides preliminary health information only - not a substitute for professional medical diagnosis or emergency care."
`;

/**
 * Helper to build custom model list prioritizing configured env model
 */
const getModelList = (preferredEnvModel, defaultPool) => {
  const list = [];
  if (
    preferredEnvModel &&
    !preferredEnvModel.includes('3.5') &&
    !preferredEnvModel.includes('3.6') &&
    !list.includes(preferredEnvModel)
  ) {
    list.push(preferredEnvModel);
  }
  for (const m of defaultPool) {
    if (!list.includes(m)) {
      list.push(m);
    }
  }
  return list;
};

/**
 * PRIMARY: Gemini with Google Search Grounding (real web search)
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
  const models = getModelList(process.env.GEMINI_MODEL, GEMINI_SEARCH_MODELS);

  for (const model of models) {
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
        { headers: { 'Content-Type': 'application/json' }, timeout: 14000 }
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
      console.warn(`[WebSearch] Model "${model}" failed (${err.response?.status || err.message}). Trying next...`);
    }
  }

  throw lastError || new Error('Gemini web search grounding exhausted all models');
};

/**
 * SECONDARY: Standard Gemini Multi-Model Rotation (fast failover)
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
  const models = getModelList(process.env.GEMINI_MODEL, GEMINI_MODELS_POOL);

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    try {
      const response = await axios.post(
        url,
        {
          systemInstruction: { parts: [{ text: MASTER_CLINICAL_SYSTEM_INSTRUCTION }] },
          contents,
          generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
        },
        { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
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
      console.warn(`[Standard Gemini] Model "${model}" failed (${err.response?.status || err.message}). Trying next...`);
    }
  }

  throw lastError || new Error('All Gemini models in pool exhausted');
};

/**
 * TERTIARY: OpenAI API Fallback (if key is configured)
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
      timeout: 12000,
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
 * RESILIENT OFFLINE CLINICAL TELEHEALTH INTELLIGENCE ENGINE
 * Zero-Downtime Guarantee: If all remote API calls fail or timeout, DokitaAI continues to provide
 * expert, empathetic, multi-topic, multilingual clinical guidance and safety checks.
 */
const generateClinicalFallback = (prompt, history = [], hospitalContext = '') => {
  const query = prompt.toLowerCase().trim();

  // Language detection
  const isPidgin =
    query.includes('dey') ||
    query.includes('body dey') ||
    query.includes('belly dey') ||
    query.includes('bele') ||
    query.includes('bite me') ||
    query.includes('head dey pain') ||
    query.includes('wetin') ||
    query.includes('abeg') ||
    query.includes('fit take') ||
    query.includes('doc,') ||
    query.includes('no be') ||
    query.includes('wahala');

  const isYoruba =
    query.includes('bawo') ||
    query.includes('ori mi') ||
    query.includes('ara mi') ||
    query.includes('e kaasan') ||
    query.includes('e kaaro') ||
    query.includes('inu mi');

  const isHausa =
    query.includes('sannu') ||
    query.includes('ciwon') ||
    query.includes('ina jin') ||
    query.includes('yaya') ||
    query.includes('zazzabi');

  const isIgbo =
    query.includes('kedu') ||
    query.includes('isi na-awa') ||
    query.includes('ahu oku') ||
    query.includes('afo');

  const isFrench =
    query.includes('bonjour') ||
    query.includes('j\'ai mal') ||
    query.includes('fievre') ||
    query.includes('douleur');

  // Emergency Red Flags Check
  const isEmergency =
    query.includes('chest pain') ||
    query.includes('heart attack') ||
    query.includes('cannot breathe') ||
    query.includes('cant breathe') ||
    query.includes('difficulty breathing') ||
    query.includes('stroke') ||
    query.includes('face drooping') ||
    query.includes('unconscious') ||
    query.includes('passed out') ||
    query.includes('heavy bleeding') ||
    query.includes('vomiting blood') ||
    query.includes('coughing blood') ||
    query.includes('seizure') ||
    query.includes('poison');

  if (isEmergency) {
    let emergencyText = isPidgin
      ? `Dis symptoms fit be serious medical emergency. Please act now:\n\n* Call emergency services immediately: 112 or 767 in Nigeria (or 911).\n* Go straight to the nearest hospital emergency department.\n* Stay calm, sit or lie in a comfortable position, and do not drive yourself.\n\nAre you with someone right now who can assist you to the hospital?`
      : `These symptoms indicate a potential medical emergency requiring immediate attention:\n\n* Call emergency services immediately: 112 or 767 in Nigeria (or 911 international).\n* Proceed directly to the nearest hospital emergency department.\n* Rest in a comfortable seated position and do not attempt to drive yourself.\n\nIs someone with you right now who can assist you?`;

    if (hospitalContext) {
      emergencyText += `\n\nVerified Nearby Emergency Hospitals:\n${hospitalContext}`;
    }

    return {
      content: cleanMarkdownFormatting(`${emergencyText}\n\n---\n${STATUTORY_MEDICAL_DISCLAIMER}`),
      sources: [
        { title: 'WHO - Emergency Care Systems', url: 'https://www.who.int/initiatives/emergency-care' },
        { title: 'Mayo Clinic - Emergency Symptoms', url: 'https://www.mayoclinic.org/first-aid' },
      ],
      urgency: 'EMERGENCY',
      modelUsed: 'dokita-clinical-engine',
      searchGrounded: false,
    };
  }

  // Mental Health Crisis Check
  const isMentalHealthCrisis =
    query.includes('suicid') ||
    query.includes('kill myself') ||
    query.includes('want to die') ||
    query.includes('end my life') ||
    query.includes('self harm');

  if (isMentalHealthCrisis) {
    const crisisText = isPidgin
      ? `Your life dey very precious and you no dey alone. Please get help right now:\n\n* Nigeria Suicide Prevention Toll-Free Helpline: 0800-800-2000 (24/7 free).\n* Reach out to a trusted family member, close friend, or doctor immediately.\n* Go to the nearest clinic or hospital if you feel you cannot keep yourself safe.\n\nAre you in a safe environment right now?`
      : `Your life is valuable and you do not have to carry this alone. Please reach out for support immediately:\n\n* Nigeria Suicide Prevention Helpline: 0800-800-2000 (toll-free, 24/7).\n* International Emergency Support: Call 112 / 767 or proceed to the nearest medical emergency room.\n* Confide in a trusted relative, close friend, or healthcare professional right away.\n\nAre you in a safe place right now?`;

    return {
      content: cleanMarkdownFormatting(`${crisisText}\n\n---\n${STATUTORY_MEDICAL_DISCLAIMER}`),
      sources: [
        { title: 'WHO - Mental Health & Crisis Support', url: 'https://www.who.int/health-topics/mental-health' },
      ],
      urgency: 'EMERGENCY',
      modelUsed: 'dokita-clinical-engine',
      searchGrounded: false,
    };
  }

  // Short Greetings & Introductory Inquiries
  const isShortGreeting =
    query.length < 25 &&
    (
      query === 'hi' ||
      query === 'hello' ||
      query === 'hey' ||
      query === 'good morning' ||
      query === 'good afternoon' ||
      query === 'good evening' ||
      query === 'hello doc' ||
      query === 'hi doc' ||
      query === 'doc' ||
      query === 'doc,' ||
      query === 'doctor' ||
      query === 'e kaaro' ||
      query === 'e kaasan' ||
      query === 'sannu' ||
      query === 'kedu' ||
      query === 'bonjour'
    );

  if (isShortGreeting) {
    let greeting = '';
    if (isPidgin) {
      greeting = `Hello, I be DokitaAI, your clinical health assistant. How body dey today?\n\n* Tell me the symptoms wey dey disturb you (e.g. fever, headache, stomach pain).\n* You fit ask about medication safety, drug dose, or find nearest hospital.\n* Wetin you dey feel right now, and how long e don start?`;
    } else if (isYoruba) {
      greeting = `E kaasan! Emi ni DokitaAI, oluranlowo ilera re. Bawo ni ara re se wa?\n\n* So fun mi nipa awon aami aisan to n se e (iba, efori, tabi inu rirun).\n* O le bere nipa aabo ogun tabi ile-iwosan to wa nitosi e.\n* Bawo ni ara re se ri lowolowo bayi?`;
    } else if (isHausa) {
      greeting = `Sannu! Ni DokitaAI ne, mataimakin lafiyarku na asibiti. Yaya jikin naka?\n\n* Fada min alamun ciwon da kake ji (kamar zazzabi, ciwon kai, ko ciwon ciki).\n* Kuna iya tambaya game da ingancin magunguna ko asibitin kusa da ku.\n* Yaya kake ji a halin yanzu?`;
    } else if (isIgbo) {
      greeting = `Nno! Abum DokitaAI, onye enyemaka ahuike gi. Kedu ka ahu si di gi taa?\n\n* Gwa m ihe na-eme gi (dika ahu oku, isi owuwa, ma obu afo mgbu).\n* I nwekwara ike iju maka ogwu na ulo ogwu di gi nso.\n* Kedu ihe na-eme gi ugbua?`;
    } else if (isFrench) {
      greeting = `Bonjour, je suis DokitaAI, votre assistant clinique de sante. Comment vous sentez-vous?\n\n* Decrivez vos symptomes (fievre, maux de tete, douleurs abdominales).\n* Posez vos questions sur la securite des medicaments ou la recherche d'hopitaux.\n* Depuis combien de temps ressentez-vous ces symptomes?`;
    } else {
      greeting = `Hello, I am DokitaAI, your clinical telehealth assistant. How can I assist you with your health today?\n\n* Describe your symptoms in detail (e.g. fever, headache, abdominal pain, cough).\n* Check drug safety, dosage guidelines, contraindications, or locate 24/7 hospitals.\n* What specific symptoms are you experiencing, and when did they begin?`;
    }

    return {
      content: cleanMarkdownFormatting(`${greeting}\n\n---\n${STATUTORY_MEDICAL_DISCLAIMER}`),
      sources: MEDICAL_AUTHORITY_SOURCES.slice(0, 2),
      urgency: 'ROUTINE',
      modelUsed: 'dokita-clinical-engine',
      searchGrounded: false,
    };
  }

  // Hospital and Clinic Locator Queries
  if (isHospitalQuery(query)) {
    let hospText = '';
    if (hospitalContext) {
      hospText = isPidgin
        ? `Here are verified healthcare facilities near your area:\n\n${hospitalContext}\n\n* In an emergency, call 112 / 767 or head straight to the emergency casualty unit.\n* You wan get specific directions or emergency contact for any of dem?`
        : `Here are verified healthcare facilities matching your location query:\n\n${hospitalContext}\n\n* For life-threatening emergencies, proceed directly to the triage/casualty unit or dial 112 / 767.\n* Would you like specific contact details or specialist navigation for any of these centers?`;
    } else {
      hospText = isPidgin
        ? `To help you find the best hospital or clinic nearby:\n\n* Please share your current city or area (e.g. Ikeja, Lekki, Yaba, Abuja, Ibadan, Port Harcourt).\n* Or enable device location in your browser settings.\n* In life-threatening emergencies, call 112 or 767 immediately.\n\nWhich area or city you dey right now?`
        : `To help locate the closest verified medical facilities:\n\n* Please specify your city, LGA, or neighborhood (e.g. Ikeja, Lekki, Abuja Central, Ibadan, Port Harcourt).\n* Or enable location services on your device.\n* For emergency assistance, dial 112 or 767 immediately.\n\nWhich city or neighborhood are you currently in?`;
    }

    return {
      content: cleanMarkdownFormatting(`${hospText}\n\n---\n${STATUTORY_MEDICAL_DISCLAIMER}`),
      sources: [
        { title: 'Federal Ministry of Health Nigeria - Healthcare Facilities', url: 'https://health.gov.ng' },
        { title: 'WHO - Primary Healthcare Services', url: 'https://www.who.int/teams/integrated-health-services' },
      ],
      urgency: 'ROUTINE',
      modelUsed: 'dokita-clinical-engine',
      searchGrounded: false,
    };
  }

  // Drug Safety & Pharmacology Queries
  if (
    query.includes('ibuprofen') ||
    query.includes('paracetamol') ||
    query.includes('panadol') ||
    query.includes('amoxicillin') ||
    query.includes('ciprofloxacin') ||
    query.includes('flagyl') ||
    query.includes('metronidazole') ||
    query.includes('artemether') ||
    query.includes('coartem') ||
    query.includes('lonart') ||
    query.includes('diclofenac') ||
    query.includes('medication') ||
    query.includes('drug safety') ||
    query.includes('can i take') ||
    query.includes('fit take')
  ) {
    let drugText = '';
    let sources = [
      { title: 'NAFDAC Nigeria - Safe Medication Guidelines', url: 'https://www.nafdac.gov.ng' },
      { title: 'NHS UK - Medicines Guide A-Z', url: 'https://www.nhs.uk/medicines' },
    ];

    if (query.includes('ibuprofen') || query.includes('diclofenac') || query.includes('nsaid')) {
      if (query.includes('ulcer') || query.includes('stomach')) {
        drugText = isPidgin
          ? `WARNING: If you get stomach ulcer, NO TAKE Ibuprofen or Diclofenac (NSAIDs).\n\n* NSAIDs dey erode the stomach lining and fit cause severe stomach bleeding or ulcer perforation.\n* For pain or fever, Paracetamol (500mg-1000mg) dey safer for stomach ulcer.\n* If pain severe, please see doctor make dem prescribe stomach-protective medicine.\n\nHow severe the pain dey, and you get any history of dark stool or vomit?`
          : `CRITICAL SAFETY WARNING: If you have a stomach ulcer, avoid Ibuprofen, Diclofenac, or other NSAIDs.\n\n* NSAIDs inhibit mucosal protective prostaglandins, significantly increasing the risk of gastric bleeding and ulcer perforation.\n* Paracetamol (Acetaminophen 500-1000 mg every 4-6 hours, max 4000 mg/day) is the safer first-line alternative for pain or fever.\n* Consult a physician if pain persists for appropriate gastro-protective therapy.\n\nAre you experiencing burning abdominal pain, nausea, or dark stools?`;
      } else {
        drugText = isPidgin
          ? `Important safety precautions for Ibuprofen / NSAIDs:\n\n* Always take Ibuprofen with food or after a meal, never on an empty stomach.\n* Adult dose: 200mg to 400mg every 6 to 8 hours (maximum 1200mg per day over-the-counter).\n* Do not take if you have stomach ulcers, severe kidney disease, or active asthma.\n\nWhich condition you wan treat with am, and you get any other medical history?`
          : `Clinical pharmacology guidance for Ibuprofen (NSAID):\n\n* Always take with food or milk to protect the gastric mucosal barrier.\n* Standard adult dose: 200-400 mg every 6-8 hours as needed (maximum 1200 mg/day OTC, up to 2400 mg/day with prescription).\n* Contraindications: active peptic ulcers, chronic kidney disease, severe heart failure, or NSAID-sensitive asthma.\n\nWhat condition are you addressing, and are you taking any other concurrent medications?`;
      }
    } else if (query.includes('paracetamol') || query.includes('panadol') || query.includes('acetaminophen')) {
      drugText = isPidgin
        ? `Clinical safety guide for Paracetamol (Acetaminophen):\n\n* Standard adult dose: 500mg to 1000mg every 4 to 6 hours as needed.\n* MAXIMUM LIMIT: Never exceed 4000mg (8 tablets of 500mg) within 24 hours to prevent liver toxicity.\n* Avoid alcohol while taking paracetamol, and check cold/flu syrups so you no go double-dose.\n\nHow many days you don dey take am, and wetin be your temperature?`
        : `Clinical pharmacology guide for Paracetamol (Acetaminophen):\n\n* Standard adult dose: 500 mg to 1000 mg every 4-6 hours as clinically indicated.\n* STRICT MAXIMUM: Do not exceed 4000 mg (4 grams) in 24 hours to avoid hepatotoxicity and acute liver injury.\n* Check combination cold/flu products to prevent accidental duplicate dosing.\n\nHow long have you been taking this, and are you monitoring your body temperature?`;
    } else if (query.includes('flagyl') || query.includes('metronidazole')) {
      drugText = isPidgin
        ? `Safety guide for Metronidazole (Flagyl):\n\n* STRICT WARNING: Do not drink ANY alcohol while taking Flagyl and for 48 hours after finishing (causes severe vomiting, rapid heart rate, and chest pain).\n* Complete the full course prescribed by doctor even if you feel better.\n* Common side effect: metallic taste in mouth and mild nausea.\n\nWhich condition doctor prescribe am for, and how many days remaining for your dose?`
        : `Clinical pharmacology guidance for Metronidazole (Flagyl):\n\n* STRICT CONTRAINDICATION: Total alcohol avoidance during therapy and for at least 48 hours post-completion (causes a severe disulfiram-like reaction with tachycardia, vomiting, and flushing).\n* Complete the entire prescribed duration to prevent antimicrobial resistance.\n* Expected mild side effects include a metallic taste and transient gastrointestinal discomfort.\n\nWhat condition was this prescribed for, and are you experiencing any adverse reactions?`;
    } else if (query.includes('coartem') || query.includes('artemether') || query.includes('lonart') || query.includes('antimalarial')) {
      drugText = isPidgin
        ? `Clinical guidance for Artemisinin Combination Therapy (ACT - Coartem, Lonart):\n\n* Take with meals containing a little fat (like milk or food) to help the body absorb the medicine well.\n* Complete the full 6-dose (3-day) regimen strictly, even if fever goes down on Day 2.\n* Always confirm malaria with a rapid diagnostic test (RDT) or microscopy before treatment.\n\nYou do malaria test before starting, or you get fever and chills?`
        : `Clinical guidelines for Artemisinin-based Combination Therapy (ACT):\n\n* Administer with meals containing dietary lipids (e.g. milk or food) to optimize intestinal absorption.\n* Strict adherence to the complete 3-day (6-dose) schedule is essential to eliminate parasites and prevent recrudescence.\n* Parasitological confirmation via Malaria RDT or blood film microscopy is recommended prior to initiation.\n\nHave you had a confirmed malaria test, and what is your current temperature?`;
    } else {
      drugText = isPidgin
        ? `Important drug safety principles:\n\n* Always follow the recommended dosage and never exceed daily limits.\n* Take medications with water and check if they require food to prevent stomach irritation.\n* Avoid self-prescribing antibiotics to prevent drug resistance.\n\nWhich specific medication or drug combination you wan verify?`
        : `General clinical pharmacology principles:\n\n* Adhere strictly to the prescribed dosage, frequency, and duration.\n* Verify food requirements (with food vs. empty stomach) and potential drug-drug interactions.\n* Avoid indiscriminate antibiotic use to prevent antimicrobial resistance.\n\nWhich specific medication, dosage, or combination would you like to evaluate?`;
    }

    return {
      content: cleanMarkdownFormatting(`${drugText}\n\n---\n${STATUTORY_MEDICAL_DISCLAIMER}`),
      sources,
      urgency: 'ROUTINE',
      modelUsed: 'dokita-clinical-engine',
      searchGrounded: false,
    };
  }

  // Fever, Malaria & Typhoid Scenarios
  if (
    query.includes('fever') ||
    query.includes('malaria') ||
    query.includes('typhoid') ||
    query.includes('body hot') ||
    query.includes('chills') ||
    query.includes('shivering') ||
    query.includes('cold and hot')
  ) {
    const feverText = isPidgin
      ? `Fever with chills and body weakness often points to malaria, viral infection, or typhoid in our environment.\n\n* Clinical Action: Do a rapid Malaria Test (RDT) or blood test at a nearby pharmacy or lab to confirm.\n* Home Management: Drink plenty water, rest, and use Paracetamol (500mg-1000mg every 6 hours) to bring down temperature.\n* Red Flags: Persistent vomiting, yellow eyes, dark urine, or fever above 39.5C requires immediate hospital care.\n\nHow many days the fever don dey, and you get joint pains or bitter taste for mouth?`
      : `Fever associated with chills, malaise, and rigors is most commonly attributable to malaria, acute viral syndrome, or enteric fever (typhoid).\n\n* Diagnostic Action: Obtain a Malaria Rapid Diagnostic Test (RDT) or blood film microscopy at a local clinic or pharmacy.\n* Symptomatic Relief: Maintain aggressive oral hydration, rest, and administer Paracetamol (500-1000 mg every 4-6 hours, max 4g/day).\n* Warning Signs: Inability to retain fluids, jaundice, extreme lethargy, or temperatures above 39.5C warrant urgent medical evaluation.\n\nHow many days has the fever persisted, and are you experiencing sweating or headache?`;

    return {
      content: cleanMarkdownFormatting(`${feverText}\n\n---\n${STATUTORY_MEDICAL_DISCLAIMER}`),
      sources: [
        { title: 'WHO - Malaria Triage and Management Guidelines', url: 'https://www.who.int/teams/global-malaria-programme' },
        { title: 'CDC - Fever Evaluation in Telehealth', url: 'https://www.cdc.gov' },
      ],
      urgency: 'URGENT',
      modelUsed: 'dokita-clinical-engine',
      searchGrounded: false,
    };
  }

  // Stomach Pain, Ulcer, Gastritis & Digestion
  if (
    query.includes('stomach') ||
    query.includes('belly') ||
    query.includes('bele') ||
    query.includes('ulcer') ||
    query.includes('gastritis') ||
    query.includes('diarrhea') ||
    query.includes('vomit') ||
    query.includes('stooling')
  ) {
    const stomachText = isPidgin
      ? `Stomach pain fit be caused by peptic ulcer, gastritis, indigestion, food poisoning, or enteric infection.\n\n* Ulcer / Gastritis Care: Eat small, frequent meals. Avoid pepper, citrus, caffeine, and NSAIDs (like Ibuprofen).\n* For Diarrhea / Vomiting: Take Oral Rehydration Salts (ORS) or plenty clean fluids to prevent dehydration.\n* Red Flag Alert: Severe sharp pain that makes you double over, vomiting blood, or black stool needs immediate hospital visit.\n\nWhere exactly the pain dey (upper or lower belly), and e dey pain you before or after food?`
      : `Abdominal symptoms may stem from peptic ulcer disease, acute gastritis, gastroenteritis, or localized peritoneal irritation.\n\n* Clinical Care: Avoid gastric irritants (NSAIDs like Ibuprofen, spicy foods, alcohol, caffeine) and consume bland, small meals.\n* Hydration Protocol: For diarrheal illness, initiate Oral Rehydration Salts (ORS) to maintain electrolyte balance.\n* Red Flags: Rebound tenderness, hematemesis, melena (black tarry stools), or rigid abdomen require emergency triage.\n\nIs the pain localized to the epigastrium or lower abdomen, and does food relieve or worsen it?`;

    return {
      content: cleanMarkdownFormatting(`${stomachText}\n\n---\n${STATUTORY_MEDICAL_DISCLAIMER}`),
      sources: [
        { title: 'NHS UK - Stomach Ache & Ulcer Guidance', url: 'https://www.nhs.uk/conditions/stomach-ache' },
        { title: 'Mayo Clinic - Gastritis & Ulcer Care', url: 'https://www.mayoclinic.org/diseases-conditions/peptic-ulcer' },
      ],
      urgency: 'URGENT',
      modelUsed: 'dokita-clinical-engine',
      searchGrounded: false,
    };
  }

  // Headache, Migraine & Dizziness
  if (
    query.includes('headache') ||
    query.includes('head dey pain') ||
    query.includes('migraine') ||
    query.includes('dizzy') ||
    query.includes('dizziness')
  ) {
    const headText = isPidgin
      ? `Headache with dizziness fit be due to stress, dehydration, malaria, eye strain, or elevated blood pressure.\n\n* Immediate Relief: Drink at least 2 large glasses of water, rest in a dim quiet room, and take Paracetamol if needed.\n* Safety Check: If you have access to a pharmacy, check your blood pressure (BP).\n* Red Flags: Sudden thunderclap headache, stiff neck, confusion, or weakness in one side of your body requires immediate hospital care.\n\nHow long the headache don dey, and you get any nausea, fever, or vision changes?`
      : `Cephalea (headache) and lightheadedness frequently correlate with tension, dehydration, systemic infection (malaria/flu), or blood pressure fluctuation.\n\n* Immediate Interventions: Oral hydration (500-1000 mL water), resting in a low-stimulus environment, and first-line Paracetamol.\n* Diagnostic Recommendation: Check your resting blood pressure at a nearby pharmacy or clinic.\n* Red Flag Signs: Sudden 'thunderclap' onset, nuchal rigidity (stiff neck), photophobia, or focal neurological deficits warrant emergency evaluation.\n\nIs the pain throbbing or dull, and does it affect one side or your entire head?`;

    return {
      content: cleanMarkdownFormatting(`${headText}\n\n---\n${STATUTORY_MEDICAL_DISCLAIMER}`),
      sources: [
        { title: 'Mayo Clinic - Headache Triage', url: 'https://www.mayoclinic.org/symptoms/headache' },
        { title: 'NHS UK - Headache & Migraine Guide', url: 'https://www.nhs.uk/conditions/headaches' },
      ],
      urgency: 'ROUTINE',
      modelUsed: 'dokita-clinical-engine',
      searchGrounded: false,
    };
  }

  // Respiratory, Cough, Sore Throat & Cold
  if (
    query.includes('cough') ||
    query.includes('throat') ||
    query.includes('catarrh') ||
    query.includes('cold') ||
    query.includes('flu') ||
    query.includes('swallow')
  ) {
    const respText = isPidgin
      ? `Cough, sore throat, and catarrh na common signs of upper respiratory tract infection (mostly viral).\n\n* Relief Routine: Gargle warm salt water 3 times daily, drink warm water or tea with honey, and get plenty rest.\n* Drug Precautions: Most colds are viral - antibiotics no go help unless doctor confirms bacterial infection.\n* Red Flags: Difficulty breathing, coughing up blood, or high fever over 3 days requires hospital evaluation.\n\nHow many days you don dey cough, and the cough dry or e get catarrh/phlegm?`
      : `Upper respiratory symptoms (cough, pharyngitis, rhinorrhea) are predominantly viral in etiology.\n\n* Supportive Management: Warm saline gargles (1/2 tsp salt in warm water), steam inhalation, adequate oral hydration, and honey/lemon tea.\n* Antimicrobial Stewardship: Antibiotics are ineffective against viral respiratory infections and should only be used if a physician confirms bacterial etiology.\n* Urgent Criteria: Stridor, chest indrawing, hemoptysis (blood in sputum), or dyspnea require immediate medical review.\n\nIs the cough productive with sputum, and do you have an accompanying fever?`;

    return {
      content: cleanMarkdownFormatting(`${respText}\n\n---\n${STATUTORY_MEDICAL_DISCLAIMER}`),
      sources: [
        { title: 'CDC - Upper Respiratory Illness Guidelines', url: 'https://www.cdc.gov/antibiotic-use' },
        { title: 'NHS UK - Cough & Cold Management', url: 'https://www.nhs.uk/conditions/cough' },
      ],
      urgency: 'SELF_CARE',
      modelUsed: 'dokita-clinical-engine',
      searchGrounded: false,
    };
  }

  // Hypertension & Blood Pressure Checks
  if (
    query.includes('blood pressure') ||
    query.includes('hypertension') ||
    query.includes('bp') ||
    query.includes('high pressure')
  ) {
    const bpText = isPidgin
      ? `Blood pressure management dey very crucial for heart and brain health.\n\n* Normal target: Systolic under 120 mmHg and Diastolic under 80 mmHg (120/80).\n* Routine Care: Reduce salt in food, do regular 30-minute walks, manage stress, and never skip prescribed BP medications.\n* Emergency Alert: BP above 180/120 mmHg with severe headache, chest pain, or blurred vision needs emergency hospital care.\n\nWetin be your recent BP reading, and doctor don prescribe any medication for you before?`
      : `Blood pressure regulation is critical for preventing cardiovascular disease and cerebrovascular accidents.\n\n* Target Thresholds: Optimal resting BP is below 120/80 mmHg. Hypertension stage 1 begins at 130/80 mmHg.\n* Lifestyle & Safety: Dietary sodium restriction, regular moderate aerobic exercise, and strict adherence to antihypertensive regimens.\n* Hypertensive Crisis: Blood pressure exceeding 180/120 mmHg accompanied by chest tightness, headache, or visual disturbance requires immediate emergency stabilization.\n\nWhat was your most recent blood pressure measurement, and are you currently on prescribed therapy?`;

    return {
      content: cleanMarkdownFormatting(`${bpText}\n\n---\n${STATUTORY_MEDICAL_DISCLAIMER}`),
      sources: [
        { title: 'WHO - Hypertension Fact Sheet', url: 'https://www.who.int/news-room/fact-sheets/detail/hypertension' },
        { title: 'American Heart Association - Blood Pressure Guidelines', url: 'https://www.heart.org' },
      ],
      urgency: 'ROUTINE',
      modelUsed: 'dokita-clinical-engine',
      searchGrounded: false,
    };
  }

  // General Clinical Inquiry Fallback
  const generalText = isPidgin
    ? `Thank you for sharing your health concern with DokitaAI.\n\n* Clinical Recommendation: For accurate triage, rest well, stay hydrated, and monitor your symptoms closely.\n* Medication Safety: Avoid combining medicines without a pharmacist or doctor's advice.\n* Hospital Guidance: If symptoms worsen or you develop high fever, difficulty breathing, or severe pain, visit a clinic promptly.\n\nCan you describe exactly when dis symptom start, how severe e be, and if you get any other symptoms?`
    : `Thank you for consulting DokitaAI regarding your symptoms.\n\n* Clinical Insight: Proper assessment requires monitoring the symptom duration, progression, and specific aggravating factors.\n* General Safety: Ensure optimal hydration, adequate physical rest, and avoid self-medicating with unverified pharmaceutical combinations.\n* When to Seek Care: If your symptoms intensify or are accompanied by fever, pain, or functional impairment, arrange a clinical evaluation.\n\nCould you describe the exact duration, severity, and any other associated symptoms you are experiencing?`;

  return {
    content: cleanMarkdownFormatting(`${generalText}\n\n---\n${STATUTORY_MEDICAL_DISCLAIMER}`),
    sources: MEDICAL_AUTHORITY_SOURCES.slice(0, 2),
    urgency: 'ROUTINE',
    modelUsed: 'dokita-clinical-engine',
    searchGrounded: false,
  };
};

/**
 * MASTER MEDICAL TRIAGE DISPATCHER
 * Priority:
 * (1) Gemini Web Search Grounding (if websearch mode and key available)
 * (2) Standard Gemini Multi-Model Pool (with fast failover)
 * (3) OpenAI Fallback (if configured)
 * (4) Offline Clinical Telehealth Intelligence Engine (Guaranteed Zero-Downtime Response)
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
            `${i + 1}. ${h.name} - ${h.address}, ${h.city}, ${h.state} | Phone: ${h.phone} | ${
              h.is24Hours ? '24/7 Emergency Care' : 'Standard Hours'
            }${h.distanceKm ? ` | ~${h.distanceKm} km away` : ''}`
        )
        .join('\n');
    }
  }

  // 1. Primary: If mode is websearch and Gemini Key is available, try Google Search Grounding
  if (mode === 'websearch' && geminiKey) {
    try {
      console.log('[AI Engine] Attempting Gemini Web Search grounding...');
      return await callGeminiWebSearch(prompt, history, geminiKey, hospitalContext);
    } catch (webErr) {
      console.log(`[AI Engine] Web search grounding failed (${webErr.message}). Falling back to standard Gemini...`);
    }
  }

  // 2. Standard Gemini Multi-Model Pool (if key available)
  if (geminiKey) {
    try {
      console.log('[AI Engine] Attempting standard Gemini with multi-model pool...');
      return await callGeminiStandard(prompt, history, geminiKey, hospitalContext);
    } catch (stdErr) {
      console.warn(`[AI Engine] Standard Gemini pool failed (${stdErr.message}). Trying secondary providers...`);
    }
  }

  // 3. Tertiary: OpenAI API (if key available)
  if (openaiKey) {
    try {
      console.log('[AI Engine] Attempting OpenAI fallback...');
      return await callOpenAIAPI(prompt, history, openaiKey, hospitalContext);
    } catch (openaiErr) {
      console.warn(`[AI Engine] OpenAI also failed (${openaiErr.message}).`);
    }
  }

  // 4. Final Tier: Resilient Offline Clinical Telehealth Intelligence Engine
  console.log('[AI Engine] Serving responsive clinical telehealth triage engine...');
  return generateClinicalFallback(prompt, history, hospitalContext);
};

module.exports = {
  generateMedicalTriage,
  STATUTORY_MEDICAL_DISCLAIMER,
  MEDICAL_AUTHORITY_SOURCES,
  generateClinicalFallback,
};
