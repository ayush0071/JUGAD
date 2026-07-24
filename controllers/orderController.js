const Order = require('../models/Order');
const Software = require('../models/Software');
const Coupon = require('../models/Coupon');
const User = require('../models/User');
const { catchAsync } = require('../middleware/errorHandler');
const { logActivity } = require('./activityController');
const { createNotification } = require('./notificationController');
const { sendMail } = require('../utils/mailer');

// @route POST /api/orders/preview-coupon  { softwareId, couponCode }
exports.previewCoupon = catchAsync(async (req, res) => {
  const { softwareId, couponCode } = req.body;
  const software = await Software.findById(softwareId);
  if (!software) return res.status(404).json({ success: false, message: 'Software not found.' });

  const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), active: true });
  if (!coupon) return res.status(400).json({ success: false, message: 'Invalid or inactive coupon code.' });
  if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
    return res.status(400).json({ success: false, message: 'This coupon has reached its usage limit.' });
  }

  const basePrice = software.discountPrice > 0 ? software.discountPrice : software.price;
  const discount = coupon.type === 'percent' ? Math.round(basePrice * (coupon.value / 100)) : Math.min(coupon.value, basePrice);
  const finalPrice = Math.max(0, basePrice - discount);

  res.status(200).json({ success: true, discount, finalPrice, code: coupon.code });
});

// @route POST /api/orders/create  { softwareId, paymentMethod, couponCode }
exports.createOrder = catchAsync(async (req, res) => {
  const { softwareId, paymentMethod, couponCode } = req.body;
  const software = await Software.findById(softwareId);
  if (!software) return res.status(404).json({ success: false, message: 'Software not found.' });
  if (software.isFree || software.price === 0) {
    return res.status(400).json({ success: false, message: 'This software is free — no order needed.' });
  }

  const alreadyOwns = req.user.purchasedSoftware.some((p) => p.software.toString() === software._id.toString());
  if (alreadyOwns) return res.status(400).json({ success: false, message: 'You already own this software.' });

  const existingPending = await Order.findOne({ user: req.user.id, software: software._id, status: 'pending' });
  if (existingPending) return res.status(400).json({ success: false, message: 'You already have a pending order for this software.' });

  let basePrice = software.discountPrice > 0 ? software.discountPrice : software.price;
  let coupon = null;

  if (couponCode) {
    coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), active: true });
    if (!coupon) return res.status(400).json({ success: false, message: 'Invalid or inactive coupon code.' });
    if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({ success: false, message: 'This coupon has reached its usage limit.' });
    }
  }

  const discount = coupon ? (coupon.type === 'percent' ? Math.round(basePrice * (coupon.value / 100)) : Math.min(coupon.value, basePrice)) : 0;
  const finalPrice = Math.max(0, basePrice - discount);

  const manualUpiMethods = ['gpay', 'phonepe', 'paytm', 'upi'];
  const verification = manualUpiMethods.includes(paymentMethod) ? 'self-reported' : 'simulated';

  const order = await Order.create({
    user: req.user.id, software: software._id, amount: finalPrice * 100,
    couponCode: coupon?.code || null, paymentMethod, status: 'pending', verification,
  });

  if (coupon) {
    coupon.usedCount += 1;
    await coupon.save();
  }

  res.status(201).json({ success: true, data: order, finalPrice, discount });
});

exports.getMyOrders = catchAsync(async (req, res) => {
  const orders = await Order.find({ user: req.user.id }).populate('software', 'title coverImage slug').sort('-createdAt');
  res.status(200).json({ success: true, data: orders });
});

// Is there a pending order for this user+software? (used to show "awaiting confirmation" on the detail page)
exports.getMyPendingOrderForSoftware = catchAsync(async (req, res) => {
  const order = await Order.findOne({ user: req.user.id, software: req.params.softwareId, status: 'pending' });
  res.status(200).json({ success: true, data: order });
});

// ---------- ADMIN ----------

exports.adminGetAllOrders = catchAsync(async (req, res) => {
  const orders = await Order.find().populate('user', 'name email').populate('software', 'title price').sort('-createdAt');
  res.status(200).json({ success: true, count: orders.length, data: orders });
});

// The ONLY place that actually grants access to the download.
exports.confirmOrder = catchAsync(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
  if (order.status !== 'pending') return res.status(400).json({ success: false, message: 'This order is not pending.' });

  order.status = 'paid';
  order.verification = 'admin-verified';
  await order.save();

  const buyer = await User.findById(order.user);
  const software = await Software.findById(order.software);

  if (buyer && !buyer.purchasedSoftware.some((p) => p.order.toString() === order._id.toString())) {
    buyer.purchasedSoftware.push({ software: order.software, order: order._id, purchasedAt: new Date() });
    await buyer.save({ validateBeforeSave: false });
  }
  if (software) {
    software.totalPurchases += 1;
    await software.save();
  }

  await createNotification({
    type: 'order_confirmed', title: 'Payment confirmed!',
    message: `Your payment for ${software?.title || 'your order'} was confirmed — you can download it now.`,
    softwareSlug: software?.slug, userId: order.user,
  });
  if (buyer) sendMail(buyer.email, 'JUGAD: your payment was confirmed', `Your payment for ${software?.title || 'your order'} has been confirmed. Log in and head to the software page to download it.`);

  await logActivity(req.user.name, 'confirmed a payment', software?.title || order.id);
  res.status(200).json({ success: true, data: order });
});

exports.rejectOrder = catchAsync(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
  order.status = 'rejected';
  await order.save();
  await logActivity(req.user.name, 'rejected an order', order.id);
  res.status(200).json({ success: true, data: order });
});

// Pull back access after it was already confirmed (e.g. payment turned out to be fake)
exports.revokeOrder = catchAsync(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

  order.status = 'rejected';
  await order.save();

  const buyer = await User.findById(order.user);
  if (buyer) {
    buyer.purchasedSoftware = buyer.purchasedSoftware.filter((p) => p.order.toString() !== order._id.toString());
    await buyer.save({ validateBeforeSave: false });
  }

  await logActivity(req.user.name, 'revoked access for an order', order.id);
  res.status(200).json({ success: true, data: order });
});
