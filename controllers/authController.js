const crypto = require('crypto');
const User = require('../models/User');
const { catchAsync } = require('../middleware/errorHandler');
const { sendTokenResponse } = require('../utils/generateToken');
const { sendMail } = require('../utils/mailer');
const { logActivity } = require('./activityController');

const MAX_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60 * 1000;

exports.adminExists = catchAsync(async (req, res) => {
  const exists = await User.exists({ role: 'admin' });
  res.status(200).json({ success: true, exists: Boolean(exists) });
});

// First-run only — works exactly once, until an admin exists.
exports.setupAdmin = catchAsync(async (req, res) => {
  const alreadyExists = await User.exists({ role: 'admin' });
  if (alreadyExists) {
    return res.status(403).json({ success: false, message: 'An admin account already exists.' });
  }

  const { name, email, password } = req.body;
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) return res.status(400).json({ success: false, message: 'An account with this email already exists.' });

  const admin = await User.create({ name, email, password, role: 'admin' });
  await logActivity(admin.name, 'created the admin account', 'First-run setup.');
  sendTokenResponse(admin, 201, res);
});

exports.register = catchAsync(async (req, res) => {
  const { name, email, password } = req.body;
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) return res.status(400).json({ success: false, message: 'An account with this email already exists.' });

  const user = await User.create({ name, email, password, role: 'user' });
  sendTokenResponse(user, 201, res);
});

exports.login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, message: 'Please provide email and password.' });

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user) return res.status(401).json({ success: false, message: 'Invalid email or password.' });

  if (user.isLocked()) {
    const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
    return res.status(423).json({ success: false, message: `Account locked. Try again in ${minutesLeft} minute(s).` });
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    user.loginAttempts += 1;
    if (user.loginAttempts >= MAX_ATTEMPTS) {
      user.lockUntil = Date.now() + LOCK_TIME;
      user.loginAttempts = 0;
    }
    await user.save({ validateBeforeSave: false });
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }

  if (!user.isActive) return res.status(403).json({ success: false, message: 'This account has been deactivated.' });

  user.loginAttempts = 0;
  user.lockUntil = undefined;
  await user.save({ validateBeforeSave: false });

  sendTokenResponse(user, 200, res);
});

exports.logout = (req, res) => {
  res.cookie('token', 'none', { expires: new Date(Date.now() + 5000), httpOnly: true });
  res.status(200).json({ success: true });
};

exports.getMe = catchAsync(async (req, res) => {
  res.status(200).json({ success: true, user: req.user });
});

exports.updateProfile = catchAsync(async (req, res) => {
  const { name, phone, location, bio } = req.body;
  const update = {};
  if (name !== undefined) update.name = name;
  if (phone !== undefined) update.phone = phone;
  if (location !== undefined) update.location = location;
  if (bio !== undefined) update.bio = bio;
  if (req.file) update.avatar = `/uploads/covers/${req.file.filename}`;

  const user = await User.findByIdAndUpdate(req.user.id, update, { new: true, runValidators: true });
  res.status(200).json({ success: true, user });
});

exports.updatePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user.id).select('+password');
  if (!(await user.comparePassword(currentPassword))) {
    return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
  }
  user.password = newPassword;
  await user.save();
  res.status(200).json({ success: true, message: 'Password updated.' });
});

exports.updateNotificationPref = catchAsync(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.user.id, { emailNotifications: req.body.emailNotifications }, { new: true });
  res.status(200).json({ success: true, user });
});

exports.deleteAccount = catchAsync(async (req, res) => {
  await require('../models/User').findByIdAndDelete(req.user.id);
  res.cookie('token', 'none', { expires: new Date(Date.now() + 5000) });
  res.status(200).json({ success: true });
});

exports.forgotPassword = catchAsync(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) return res.status(404).json({ success: false, message: 'No account found with that email.' });

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  user.otpCode = otp;
  user.otpExpiresAt = Date.now() + 10 * 60 * 1000;
  await user.save({ validateBeforeSave: false });

  const result = await sendMail(user.email, 'Your JUGAD password reset code', `Your password reset code is: ${otp}\nThis expires in 10 minutes.`);

  res.status(200).json({
    success: true,
    emailSent: result.sent,
    // Only included when email isn't configured, so the feature still works for local/dev use.
    devOtp: result.sent ? undefined : otp,
  });
});

exports.resetPassword = catchAsync(async (req, res) => {
  const { email, otp, newPassword } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() }).select('+otpCode +otpExpiresAt');
  if (!user) return res.status(404).json({ success: false, message: 'No account found with that email.' });
  if (!user.otpCode || !user.otpExpiresAt) return res.status(400).json({ success: false, message: 'No password reset was requested.' });
  if (Date.now() > new Date(user.otpExpiresAt).getTime()) return res.status(400).json({ success: false, message: 'This code has expired.' });
  if (String(otp).trim() !== user.otpCode) return res.status(400).json({ success: false, message: 'Incorrect code.' });
  if (newPassword.length < 8) return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });

  user.password = newPassword;
  user.otpCode = undefined;
  user.otpExpiresAt = undefined;
  await user.save();

  res.status(200).json({ success: true, message: 'Password reset. You can log in now.', role: user.role });
});
