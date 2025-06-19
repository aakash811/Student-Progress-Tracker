const express = require('express');
const router = express.Router();
const codeforcesController = require('../controllers/codeforcesController');

router.get('/sync/:handle', codeforcesController.syncCodeforcesData);

router.get('/stats/:handle', codeforcesController.getCodeforcesStats);

router.get('/contest/:handle', codeforcesController.getContestStats);

module.exports = router;
