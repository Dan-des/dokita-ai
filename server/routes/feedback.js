const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');
const { optionalToken, verifyToken, requireRole } = require('../middleware/auth');

/**
 * @route   POST /api/feedback
 * @desc    Submit user feedback and rating
 * @access  Public / Authenticated
 */
router.post('/', optionalToken, async (req, res) => {
  try {
    const { rating, comment } = req.body;

    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be an integer between 1 and 5.',
      });
    }

    if (!comment || typeof comment !== 'string' || !comment.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Feedback commentary is required.',
      });
    }

    const feedback = new Feedback({
      userId: req.user ? req.user.id : null,
      rating,
      comment: comment.trim(),
    });

    await feedback.save();

    return res.status(201).json({
      success: true,
      message: 'Thank you for your feedback! Your review helps DokitaAI improve.',
      feedback,
    });
  } catch (error) {
    console.error('[Feedback Submission Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit feedback.',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/feedback
 * @desc    Get all feedback entries (Admin only)
 * @access  Private (verifyToken + requireRole('admin'))
 */
router.get('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const feedbacks = await Feedback.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    const totalRatings = feedbacks.reduce((acc, curr) => acc + curr.rating, 0);
    const averageRating = feedbacks.length > 0 ? (totalRatings / feedbacks.length).toFixed(1) : 0;

    return res.status(200).json({
      success: true,
      count: feedbacks.length,
      averageRating: Number(averageRating),
      feedbacks,
    });
  } catch (error) {
    console.error('[Get Feedback Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch feedback logs.',
      error: error.message,
    });
  }
});

module.exports = router;
