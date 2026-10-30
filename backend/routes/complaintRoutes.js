const express = require('express');
const router = express.Router();
const controller = require('../controllers/complaintController');
const auth = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/suggestions', controller.getSuggestions);
router.get('/', auth, controller.getComplaints);
router.post('/', auth, upload.single('proofImage'), controller.createComplaint);

router.get('/all', controller.getAllComplaints);
router.get('/staff', auth, controller.getStaffComplaints);
router.put('/:id/resolve', auth, upload.single('resolutionImage'), controller.resolveComplaint);

module.exports = router;

