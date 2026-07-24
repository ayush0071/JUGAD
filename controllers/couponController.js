const Coupon = require('../models/Coupon');
const { catchAsync } = require('../middleware/errorHandler');
const { logActivity } = require('./activityController');

exports.adminListCoupons = catchAsync(async (req, res) => {
  const coupons = await Coupon.find().sort('-createdAt');
  res.status(200).json({ success: true, data: coupons });
});

exports.adminCreateCoupon = catchAsync(async (req, res) => {
  const { code, type, value, usageLimit } = req.body;
  const existing = await Coupon.findOne({ code: code.toUpperCase() });
  if (existing) return res.status(400).json({ success: false, message: 'A coupon with this code already exists.' });

  const coupon = await Coupon.create({ code: code.toUpperCase(), type, value, usageLimit: usageLimit || 0 });
  await logActivity(req.user.name, 'created coupon', coupon.code);
  res.status(201).json({ success: true, data: coupon });
});

exports.adminToggleCoupon = catchAsync(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found.' });
  coupon.active = !coupon.active;
  await coupon.save();
  await logActivity(req.user.name, coupon.active ? 'enabled coupon' : 'disabled coupon', coupon.code);
  res.status(200).json({ success: true, data: coupon });
});

exports.adminDeleteCoupon = catchAsync(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found.' });
  await coupon.deleteOne();
  await logActivity(req.user.name, 'deleted coupon', coupon.code);
  res.status(200).json({ success: true });
});
