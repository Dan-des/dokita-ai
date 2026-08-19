const express = require('express');
const router = express.Router();
const webpush = require('web-push');
const ScheduledReminder = require('../models/ScheduledReminder');
const { verifyToken } = require('../middleware/auth');

// Configure Web Push VAPID keys
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:contact@dokita.ai';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    vapidSubject,
    vapidPublicKey,
    vapidPrivateKey
  );
} else {
  console.warn('[Web Push Warning] VAPID keys are not configured. Background notifications will not fire.');
}

/**
 * Dispatch due medication reminders via Web Push
 */
async function dispatchDueReminders() {
  const now = new Date();
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();

  // Query all active reminders
  const activeReminders = await ScheduledReminder.find({ isActive: true }).lean();
  if (!activeReminders || activeReminders.length === 0) {
    return { totalDue: 0, successCount: 0, failCount: 0 };
  }

  // Filter reminders whose local time matches current time
  const dueReminders = activeReminders.filter((rem) => {
    const offset = rem.timezoneOffset !== undefined ? rem.timezoneOffset : -60; // default WAT (UTC+1)
    let localMinutes = (utcHours * 60) + utcMinutes - offset;
    localMinutes = ((localMinutes % 1440) + 1440) % 1440;
    const localHour = Math.floor(localMinutes / 60);
    const localMinute = localMinutes % 60;
    const localTimeString = `${localHour.toString().padStart(2, '0')}:${localMinute.toString().padStart(2, '0')}`;
    return rem.time === localTimeString;
  });

  let successfulCount = 0;
  let failedCount = 0;

  const pushPromises = dueReminders.map(async (rem) => {
    const payload = JSON.stringify({
      title: `⏰ DokitaAI Medication Reminder`,
      body: `It's time to take your ${rem.medication} (${rem.dosage}). ${rem.instructions || ''}`,
      icon: '/icon-192.svg',
      badge: '/favicon.svg',
      url: '/chat'
    });

    try {
      await webpush.sendNotification(rem.subscription, payload);
      successfulCount++;
    } catch (err) {
      console.warn(`[Push Dispatcher] Push failed for reminder ${rem.reminderId}:`, err.message);
      failedCount++;
      if (err.statusCode === 410 || err.statusCode === 404) {
        console.log(`[Push Dispatcher] Removing invalid subscription for reminder: ${rem.reminderId}`);
        await ScheduledReminder.deleteOne({ _id: rem._id });
      }
    }
  });

  await Promise.all(pushPromises);
  return {
    totalDue: dueReminders.length,
    successCount: successfulCount,
    failCount: failedCount
  };
}

/**
 * @route   GET /api/reminders
 * @desc    Get user's scheduled reminders
 * @access  Private
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const reminders = await ScheduledReminder.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json({ success: true, count: reminders.length, reminders });
  } catch (error) {
    console.error('[Get Reminders Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve reminders.' });
  }
});

/**
 * @route   POST /api/reminders
 * @desc    Schedule/Sync medication reminder with backend and save user push subscription
 * @access  Private
 */
router.post('/', verifyToken, async (req, res) => {
  try {
    const { reminderId, medication, dosage, time, instructions, timezoneOffset, subscription, isActive } = req.body;

    if (!reminderId || !medication || !time || !subscription) {
      return res.status(400).json({
        success: false,
        message: 'ReminderId, medication name, daily time, and subscription object are required.'
      });
    }

    // Upsert reminder
    let reminder = await ScheduledReminder.findOne({ reminderId, userId: req.user.id });
    if (reminder) {
      reminder.medication = medication.trim();
      reminder.dosage = dosage?.trim() || reminder.dosage;
      reminder.time = time.trim();
      reminder.instructions = instructions?.trim() || reminder.instructions;
      if (timezoneOffset !== undefined) reminder.timezoneOffset = Number(timezoneOffset);
      reminder.subscription = subscription;
      if (isActive !== undefined) reminder.isActive = Boolean(isActive);
      await reminder.save();
    } else {
      reminder = new ScheduledReminder({
        reminderId,
        userId: req.user.id,
        medication: medication.trim(),
        dosage: dosage?.trim(),
        time: time.trim(),
        instructions: instructions?.trim(),
        timezoneOffset: timezoneOffset !== undefined ? Number(timezoneOffset) : -60,
        subscription,
        isActive: isActive !== undefined ? Boolean(isActive) : true
      });
      await reminder.save();
    }

    return res.status(200).json({ success: true, reminder });
  } catch (error) {
    console.error('[Schedule Reminder Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to schedule medication reminder.' });
  }
});

/**
 * @route   PUT /api/reminders/:id
 * @desc    Toggle reminder active state
 * @access  Private
 */
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { isActive } = req.body;
    const reminder = await ScheduledReminder.findOneAndUpdate(
      { reminderId: req.params.id, userId: req.user.id },
      { isActive: Boolean(isActive) },
      { new: true }
    );
    if (!reminder) {
      return res.status(404).json({ success: false, message: 'Reminder record not found.' });
    }
    return res.status(200).json({ success: true, reminder });
  } catch (error) {
    console.error('[Toggle Reminder Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to update reminder state.' });
  }
});

/**
 * @route   DELETE /api/reminders/:id
 * @desc    Delete/Unschedule medication reminder
 * @access  Private
 */
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const result = await ScheduledReminder.findOneAndDelete({
      reminderId: req.params.id,
      userId: req.user.id
    });
    if (!result) {
      return res.status(404).json({ success: false, message: 'Reminder record not found.' });
    }
    return res.status(200).json({ success: true, message: 'Reminder deleted successfully.', id: req.params.id });
  } catch (error) {
    console.error('[Delete Reminder Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to delete medication reminder.' });
  }
});

/**
 * @route   GET /api/reminders/cron-trigger
 * @desc    Vercel Cron endpoint triggered every minute to process active reminders and dispatch web push notifications
 * @access  Public (Protected via Vercel-specific x-vercel-cron header or internal cron)
 */
router.get('/cron-trigger', async (req, res) => {
  const isVercelCron = req.headers['x-vercel-cron'] === '1' || process.env.NODE_ENV === 'development';
  if (!isVercelCron) {
    return res.status(401).json({ success: false, message: 'Unauthorized cron access.' });
  }

  try {
    const results = await dispatchDueReminders();
    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      ...results
    });
  } catch (error) {
    console.error('[Cron Dispatcher Error]', error);
    return res.status(500).json({ success: false, message: 'Cron processing failed.', error: error.message });
  }
});

module.exports = { router, dispatchDueReminders };
