const express = require('express');
const router = express.Router();
const { runCodeforcesSync } = require('../cron/codeforcesSyncCron');

// ── POST /cron/sync ────────────────────────────────────────────────────────────
// This is called by cron-job.org (or any external scheduler) on a schedule.
// Protected by a secret token so random people can't trigger mass syncs.
//
// Setup on cron-job.org:
//   URL:    https://your-app.onrender.com/cron/sync
//   Method: POST
//   Header: x-cron-secret: <value of your CRON_SECRET env var>
//   Schedule: Every day at 02:00 UTC (or whatever you prefer)
//
// Add to Render env vars:
//   CRON_SECRET=any-long-random-string-you-choose

router.post('/sync', async (req, res) => {
    const secret = req.headers['x-cron-secret'];
    if (secret !== process.env.CRON_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        // Respond immediately so cron-job.org doesn't timeout (syncing takes time)
        res.json({ message: 'Sync started', time: new Date() });

        // Run sync after response is sent
        await runCodeforcesSync();
    } catch (err) {
        console.error('[/cron/sync] Error:', err.message);
    }
});

// ── GET /cron/ping ─────────────────────────────────────────────────────────────
// Use a SECOND cron-job.org job hitting this every 14 minutes to keep
// Render free tier warm and avoid the 10-second cold start on page load.
router.get('/ping', (req, res) => {
    res.json({ status: 'alive', time: new Date() });
});

module.exports = router;