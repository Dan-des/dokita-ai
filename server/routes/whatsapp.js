const express = require('express');
const router = express.Router();
const { verifyWebhook, processIncomingMessage } = require('../services/whatsappService');

/**
 * @route   GET /api/webhook/whatsapp
 * @desc    Meta WhatsApp Cloud API Webhook Handshake
 * @access  Public (Validated with process.env.WHATSAPP_VERIFY_TOKEN)
 */
router.get('/whatsapp', verifyWebhook);

/**
 * @route   POST /api/webhook/whatsapp
 * @desc    Meta WhatsApp Cloud API Inbound Message Webhook
 * @access  Public
 */
router.post('/whatsapp', processIncomingMessage);

module.exports = router;
