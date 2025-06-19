const express = require('express');
const router = express.Router();
const Student = require('../models/Student');

router.get('/logs', async(req, res) => {
    const logs = await Student.find({}, 'name email emailRemaindersSent lastActiveAt');
    res.json(logs);
});

router.post('/disable/:id', async(req, res) => {
    await Student.findByIdAndUpdate(req.params.id, { emailRemindersDisabled: true });
    res.json({message: "Email reminders disabled for this student."});
});

router.post('/enable/:id', async(req, res) => {
    await Student.findByIdAndUpdate(req.params.id, {emailRemindersDisabled: false, emailRemindresSent: 0});
    res.json({message: "Email reminders enabled for this student."});
})

module.exports = router;