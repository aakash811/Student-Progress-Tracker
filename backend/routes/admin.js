const express = require("express");
const router = express.Router();
const { updateCronSchedule } = require("../cron/codeforcesSyncCron");

router.post("/update-cron", (req, res) => {
  const { cronTime } = req.body;

  if (!cronTime || !/^[\d*\/\s]+$/.test(cronTime)) {
    return res.status(400).json({ error: "Invalid cron expression" });
  }

  updateCronSchedule(cronTime);
  res.json({ message: `Cron updated to: ${cronTime}` });
});

module.exports = router;
