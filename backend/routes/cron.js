const express = require('express');
const { scheduleCodeforcesSync } = require('../cron/codeforcesSyncCron');
const router = express.Router();

router.get('/trigger-sync', async (req, res) => {
    try {
        await scheduleCodeforcesSync();
        console.log(res);
        res.status(200).send('✅ Sync triggered successfully.');
    } catch (err) {
        console.error('❌ Error in manual sync trigger:', err);
        res.status(500).send('❌ Sync failed: ' + err.message);
    }
});

module.exports = router;
