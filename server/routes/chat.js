const express = require('express');
const router = express.Router();
const ChatSession = require('../models/ChatSession');
const { optionalToken, verifyToken } = require('../middleware/auth');
const { chatLimiter } = require('../middleware/rateLimiter');
const { generateMedicalTriage } = require('../services/aiService');

/**
 * @route   POST /api/chat/ask
 * @desc    Submit a medical symptom or question for AI triage with optional GPS coordinates
 * @access  Public / Authenticated (with rate limiting)
 */
router.post('/ask', chatLimiter, optionalToken, async (req, res) => {
  try {
    const { prompt, sessionId, conversationHistory, location } = req.body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A valid symptom or medical question is required.',
      });
    }

    const trimmedPrompt = prompt.trim();
    const userId = req.user ? req.user.id : null;

    // Find existing session or initialize new one
    let session = null;
    if (sessionId) {
      session = await ChatSession.findOne({
        sessionId,
        ...(userId ? { userId } : {}),
      });
    }

    if (!session) {
      const newSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      session = new ChatSession({
        userId,
        platform: 'web',
        sessionId: newSessionId,
        messages: [],
      });
    }

    // Build context history from session or passed conversationHistory
    const pastMessages = session.messages.length > 0
      ? session.messages.slice(-8)
      : Array.isArray(conversationHistory)
      ? conversationHistory.slice(-8)
      : [];

    // Append user message
    session.messages.push({
      role: 'user',
      content: trimmedPrompt,
      sources: [],
      timestamp: new Date(),
    });

    // Generate clinical triage response (with optional GPS / location context)
    const triageResult = await generateMedicalTriage(trimmedPrompt, pastMessages, location);

    // Append assistant triage response
    session.messages.push({
      role: 'assistant',
      content: triageResult.content,
      sources: triageResult.sources,
      timestamp: new Date(),
    });

    await session.save();

    return res.status(200).json({
      success: true,
      sessionId: session.sessionId,
      message: {
        role: 'assistant',
        content: triageResult.content,
        sources: triageResult.sources,
        urgency: triageResult.urgency,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    console.error('[Chat Ask Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate medical triage response. Please try again.',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/chat/sessions
 * @desc    Get user's chat sessions
 * @access  Private (verifyToken)
 */
router.get('/sessions', verifyToken, async (req, res) => {
  try {
    const sessions = await ChatSession.find({ userId: req.user.id })
      .sort({ updatedAt: -1 })
      .limit(30)
      .select('sessionId platform messages updatedAt createdAt');

    return res.status(200).json({
      success: true,
      sessions,
    });
  } catch (error) {
    console.error('[Chat Sessions Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching chat sessions.',
    });
  }
});

/**
 * @route   GET /api/chat/sessions/:sessionId
 * @desc    Get single chat session messages
 * @access  Public / Protected
 */
router.get('/sessions/:sessionId', optionalToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const query = { sessionId };
    if (req.user) {
      query.userId = req.user.id;
    }

    const session = await ChatSession.findOne(query);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Chat session not found.',
      });
    }

    return res.status(200).json({
      success: true,
      session,
    });
  } catch (error) {
    console.error('[Get Session Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving chat session.',
    });
  }
});

/**
 * @route   DELETE /api/chat/sessions/:sessionId
 * @desc    Delete a specific consultation session for privacy
 * @access  Public / Protected
 */
router.delete('/sessions/:sessionId', optionalToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const query = { sessionId };
    if (req.user) {
      query.userId = req.user.id;
    }

    const deleted = await ChatSession.findOneAndDelete(query);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Consultation session record not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Consultation session deleted successfully for privacy.',
      sessionId,
    });
  } catch (error) {
    console.error('[Delete Session Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete consultation record.',
      error: error.message,
    });
  }
});

/**
 * @route   DELETE /api/chat/sessions
 * @desc    Delete ALL consultation history for user (Full Privacy Wipe)
 * @access  Private (verifyToken)
 */
router.delete('/sessions', verifyToken, async (req, res) => {
  try {
    await ChatSession.deleteMany({ userId: req.user.id });
    return res.status(200).json({
      success: true,
      message: 'All consultation records permanently cleared.',
    });
  } catch (error) {
    console.error('[Clear History Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to clear consultation history.',
      error: error.message,
    });
  }
});

module.exports = router;
