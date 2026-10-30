
const express = require('express');
const router = express.Router();
const controller = require('../controllers/crowdController');

router.get('/analysis', controller.getStationCrowd);
router.get('/suggestions', controller.getSuggestions);

module.exports = router;
