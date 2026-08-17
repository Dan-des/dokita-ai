const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  sources: [
    {
      title: { type: String, required: true },
      url: { type: String, required: true },
    },
  ],
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const chatSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    platform: {
      type: String,
      enum: ['web', 'whatsapp'],
      default: 'web',
      required: true,
    },
    sessionId: {
      type: String,
      index: true,
    },
    phoneNumber: {
      type: String,
      default: null,
    },
    messages: [messageSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('ChatSession', chatSessionSchema);
