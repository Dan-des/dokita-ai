const axios = require('axios');
const ChatSession = require('../models/ChatSession');
const { generateMedicalTriage } = require('./aiService');

/**
 * Handle WhatsApp Meta Cloud API Webhook Handshake (GET)
 */
const verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (!expectedToken) {
    console.error('[WhatsApp Service Error] process.env.WHATSAPP_VERIFY_TOKEN is not configured.');
    return res.status(500).send('Server configuration missing verify token.');
  }

  if (mode && token) {
    if (mode === 'subscribe' && token === expectedToken) {
      console.log('[WhatsApp Webhook] Handshake verified successfully.');
      return res.status(200).send(challenge);
    } else {
      console.warn('[WhatsApp Webhook] Verification token mismatch.');
      return res.status(403).json({ error: 'Verification token mismatch' });
    }
  }

  return res.status(400).json({ error: 'Invalid verification query parameters' });
};

/**
 * Send WhatsApp text message via Meta Graph API
 */
const sendWhatsAppMessage = async (to, text) => {
  const apiUrl = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v20.0';
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    console.warn('[WhatsApp Service] WhatsApp credentials not fully set. Outbound message simulated for test:', { to, textLength: text.length });
    return { success: true, simulated: true };
  }

  const endpoint = `${apiUrl}/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: to,
    type: 'text',
    text: {
      preview_url: false,
      body: text,
    },
  };

  const response = await axios.post(endpoint, payload, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    timeout: 10000,
  });

  return response.data;
};

/**
 * Process incoming WhatsApp Webhook Notification (POST)
 */
const processIncomingMessage = async (req, res) => {
  try {
    const body = req.body;

    if (body.object !== 'whatsapp_business_account') {
      return res.status(404).json({ error: 'Not a whatsapp business event' });
    }

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    if (!message || message.type !== 'text') {
      return res.status(200).send('EVENT_RECEIVED');
    }

    const from = message.from;
    const messageText = message.text?.body;

    console.log(`[WhatsApp Inbound] Message received from ${from}: "${messageText}"`);

    let session = await ChatSession.findOne({ phoneNumber: from, platform: 'whatsapp' });
    if (!session) {
      session = new ChatSession({
        platform: 'whatsapp',
        phoneNumber: from,
        messages: [],
      });
    }

    session.messages.push({
      role: 'user',
      content: messageText,
      sources: [],
      timestamp: new Date(),
    });

    const triageResult = await generateMedicalTriage(messageText, session.messages.slice(-6));

    session.messages.push({
      role: 'assistant',
      content: triageResult.content,
      sources: triageResult.sources,
      timestamp: new Date(),
    });

    await session.save();

    const reply = `${triageResult.content}\n\nClinical References: ${triageResult.sources.map(s => s.title).join(', ')}`;
    await sendWhatsAppMessage(from, reply);

    return res.status(200).send('EVENT_RECEIVED');
  } catch (error) {
    console.error('[WhatsApp Inbound Error]', error);
    return res.status(500).json({ error: 'Internal processing error' });
  }
};

module.exports = {
  verifyWebhook,
  sendWhatsAppMessage,
  processIncomingMessage,
};
