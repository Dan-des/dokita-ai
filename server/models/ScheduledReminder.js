const mongoose = require('mongoose');

const ScheduledReminderSchema = new mongoose.Schema({
  reminderId: { type: String, required: true },
  userId: { type: String, required: true },
  medication: { type: String, required: true },
  dosage: { type: String, default: '1 standard dose' },
  time: { type: String, required: true }, // "HH:MM" in local 24h format
  instructions: { type: String },
  subscription: { type: Object, required: true }, // PushSubscription
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

// Compound index to ensure clean query search
ScheduledReminderSchema.index({ time: 1, isActive: 1 });

module.exports = mongoose.model('ScheduledReminder', ScheduledReminderSchema);
