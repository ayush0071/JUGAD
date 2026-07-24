const User = require('../models/User');
const { catchAsync } = require('../middleware/errorHandler');
const { logActivity } = require('./activityController');

exports.getMyLibrary = catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id).populate({
    path: 'purchasedSoftware.software',
    select: 'title coverImage slug category',
  });
  res.status(200).json({ success: true, data: user.purchasedSoftware });
});

exports.getWishlist = catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id).populate('wishlist', 'title coverImage slug price isFree discountPrice');
  res.status(200).json({ success: true, data: user.wishlist });
});

exports.toggleWishlist = catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id);
  const idx = user.wishlist.findIndex((id) => id.toString() === req.params.softwareId);
  if (idx > -1) user.wishlist.splice(idx, 1);
  else user.wishlist.push(req.params.softwareId);
  await user.save({ validateBeforeSave: false });
  res.status(200).json({ success: true, wishlist: user.wishlist });
});

exports.addPaymentMethod = catchAsync(async (req, res) => {
  const { type, label } = req.body;
  const user = await User.findById(req.user.id);
  user.savedPaymentMethods.push({ type, label });
  await user.save({ validateBeforeSave: false });
  res.status(201).json({ success: true, data: user.savedPaymentMethods });
});

exports.removePaymentMethod = catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id);
  user.savedPaymentMethods = user.savedPaymentMethods.filter((m) => m._id.toString() !== req.params.methodId);
  await user.save({ validateBeforeSave: false });
  res.status(200).json({ success: true, data: user.savedPaymentMethods });
});

// ---------- ADMIN ----------

exports.adminListUsers = catchAsync(async (req, res) => {
  const users = await User.find().sort('-createdAt');
  res.status(200).json({ success: true, count: users.length, data: users });
});

exports.adminToggleUserActive = catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
  user.isActive = !user.isActive;
  await user.save({ validateBeforeSave: false });
  await logActivity(req.user.name, user.isActive ? 'activated user' : 'deactivated user', user.email);
  res.status(200).json({ success: true, data: user });
});
