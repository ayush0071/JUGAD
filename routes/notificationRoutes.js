const express = require('express');
const { protect } = require('../middleware/auth');
const notif = require('../controllers/notificationController');

const router = express.Router();

router.get('/', protect, notif.getMyNotifications);
router.get('/stream', protect, notif.streamNotifications);

module.exports = router;
