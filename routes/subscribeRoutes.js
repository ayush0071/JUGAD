const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const notif = require('../controllers/notificationController');

const router = express.Router();
router.post('/', [body('email').isEmail()], validate, notif.subscribe);

module.exports = router;
