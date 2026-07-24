const express = require('express');
const settings = require('../controllers/settingsController');

const router = express.Router();
router.get('/', settings.getSettings);

module.exports = router;
