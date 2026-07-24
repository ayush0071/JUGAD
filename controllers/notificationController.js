const Notification = require('../models/Notification');
const Subscriber = require('../models/Subscriber');
const User = require('../models/User');
const { catchAsync } = require('../middleware/errorHandler');
const { sendMail } = require('../utils/mailer');
const sse = require('../utils/sse');

// Internal helper used by other controllers (software publish/update, order confirmed, etc.)
exports.createNotification = async ({ type, title, message, softwareSlug = null, userId = null }) => {
  const notif = await Notification.create({ type, title, message, softwareSlug, user: userId || null });
  sse.broadcast({
    id: notif._id, type: notif.type, title: notif.title, message: notif.message,
    softwareSlug: notif.softwareSlug, user: notif.user, createdAt: notif.createdAt,
  });
  return notif;
};

// Best-effort email fan-out to subscribers + opted-in users. Never throws.
exports.emailAllSubscribers = async (subject, message) => {
  const [subscribers, users] = await Promise.all([
    Subscriber.find(),
    User.find({ role: 'user', emailNotifications: true }),
  ]);
  const emails = new Set(subscribers.map((s) => s.email));
  users.forEach((u) => emails.add(u.email));

  let sent = 0;
  for (const email of emails) {
    const result = await sendMail(email, subject, message);
    if (result.sent) sent += 1;
  }
  return { attempted: emails.size, sent };
};

// @route GET /api/notifications  (global ones + this user's personal ones)
exports.getMyNotifications = catchAsync(async (req, res) => {
  const notifs = await Notification.find({ $or: [{ user: null }, { user: req.user.id }] })
    .sort('-createdAt')
    .limit(50);
  res.status(200).json({ success: true, data: notifs });
});

// @route GET /api/notifications/stream  (Server-Sent Events — real-time push)
exports.streamNotifications = (req, res) => {
  sse.subscribe(req, res);
};

// @route POST /api/subscribe
exports.subscribe = catchAsync(async (req, res) => {
  const { email } = req.body;
  const existing = await Subscriber.findOne({ email: email.toLowerCase() });
  if (!existing) await Subscriber.create({ email: email.toLowerCase() });
  res.status(200).json({ success: true });
});
