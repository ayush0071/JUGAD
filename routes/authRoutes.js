const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { uploadCoverImage } = require('../middleware/upload');
const auth = require('../controllers/authController');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 20,
  message: { success: false, message: 'Too many attempts. Please try again later.' },
  standardHeaders: true, legacyHeaders: false,
});

router.get('/admin-exists', auth.adminExists);

router.post('/setup', authLimiter,
  [body('name').trim().notEmpty(), body('email').isEmail().normalizeEmail(), body('password').isLength({ min: 8 })],
  validate, auth.setupAdmin);

router.post('/register', authLimiter,
  [body('name').trim().notEmpty(), body('email').isEmail().normalizeEmail(), body('password').isLength({ min: 8 })],
  validate, auth.register);

router.post('/login', authLimiter, [body('email').isEmail().normalizeEmail(), body('password').notEmpty()], validate, auth.login);
router.post('/logout', auth.logout);
router.get('/me', protect, auth.getMe);
router.put('/profile', protect, uploadCoverImage.single('avatar'), auth.updateProfile);
router.put('/update-password', protect, [body('newPassword').isLength({ min: 8 })], validate, auth.updatePassword);
router.put('/notification-pref', protect, auth.updateNotificationPref);
router.delete('/me', protect, auth.deleteAccount);

router.post('/forgot-password', authLimiter, [body('email').isEmail()], validate, auth.forgotPassword);
router.post('/reset-password', authLimiter, auth.resetPassword);

module.exports = router;
