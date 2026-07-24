const express = require('express');
const developers = require('../controllers/developerController');

const router = express.Router();
router.get('/', developers.getAllDevelopers);

module.exports = router;
