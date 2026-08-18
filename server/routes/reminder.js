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
    const { reminderId, medication, dosage, time, instructions, subscription, isActive } = req.body;

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
 * @access  Public (Protected via Vercel-specific x-vercel-cron header)
 */
router.get('/cron-trigger', async (req, res) => {
  const isVercelCron = req.headers['x-vercel-cron'] === '1' || process.env.NODE_ENV === 'development';
  if (!isVercelCron) {
    return res.status(401).json({ success: false, message: 'Unauthorized cron access.' });
  }

  try {
    // Current time in West Africa Time (WAT) (UTC + 1 hour)
    const now = new Date();
    const watHour = (now.getUTCHours() + 1) % 24;
    const watMinute = now.getUTCMinutes();
    const currentTimeString = `${watHour.toString().padStart(2, '0')}:${watMinute.toString().padStart(2, '0')}`;

    console.log(`[Cron Dispatcher] Checking reminders for WAT time: ${currentTimeString}`);

    // Query active reminders matching current time
    const dueReminders = await ScheduledReminder.find({
      time: currentTimeString,
      isActive: true
    }).lean();

    console.log(`[Cron Dispatcher] Found ${dueReminders.length} due reminders.`);

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
        console.warn(`[Cron Dispatcher] Push failed for reminder ${rem.reminderId}:`, err.message);
        failedCount++;
        // If the push service returns 410 Gone or 404, the subscription is expired/invalid, we should delete it
        if (err.statusCode === 410 || err.statusCode === 404) {
          console.log(`[Cron Dispatcher] Removing invalid subscription for reminder: ${rem.reminderId}`);
          await ScheduledReminder.deleteOne({ _id: rem._id });
        }
      }
    });

    await Promise.all(pushPromises);

    return res.status(200).json({
      success: true,
      timeChecked: currentTimeString,
      totalDue: dueReminders.length,
      successCount: successfulCount,
      failCount: failedCount
    });
  } catch (error) {
    console.error('[Cron Dispatcher Error]', error);
    return res.status(500).json({ success: false, message: 'Cron processing failed.', error: error.message });
  }
});

module.exports = router;
