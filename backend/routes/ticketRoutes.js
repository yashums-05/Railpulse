
const express = require('express');
const router = express.Router();
const controller = require('../controllers/ticketController');

router.get('/', controller.getTickets);
router.post('/', controller.addTicket);

module.exports = router;
