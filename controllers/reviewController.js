const Review = require('../models/Review');
const Software = require('../models/Software');
const { catchAsync } = require('../middleware/errorHandler');
const { logActivity } = require('./activityController');

async function recomputeRating(softwareId) {
  const visible = await Review.find({ software: softwareId, status: 'visible' });
  const software = await Software.findById(softwareId);
  if (!software) return;
  software.ratingCount = visible.length;
  software.ratingAverage = visible.length ? visible.reduce((s, r) => s + r.rating, 0) / visible.length : 0;
  await software.save();
}

exports.getReviewsForSoftware = catchAsync(async (req, res) => {
  const reviews = await Review.find({ software: req.params.id, status: 'visible' }).sort('-createdAt');
  res.status(200).json({ success: true, data: reviews });
});

exports.createReview = catchAsync(async (req, res) => {
  const { rating, comment } = req.body;
  const existing = await Review.findOne({ software: req.params.id, user: req.user.id });
  if (existing) return res.status(400).json({ success: false, message: "You've already reviewed this software." });

  const review = await Review.create({
    software: req.params.id, user: req.user.id, userName: req.user.name, rating, comment,
  });
  await recomputeRating(req.params.id);
  res.status(201).json({ success: true, data: review });
});

// ---------- ADMIN ----------

exports.adminGetAllReviews = catchAsync(async (req, res) => {
  const reviews = await Review.find().populate('software', 'title').sort('-createdAt');
  res.status(200).json({ success: true, data: reviews });
});

exports.adminToggleReview = catchAsync(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) return res.status(404).json({ success: false, message: 'Review not found.' });
  review.status = review.status === 'hidden' ? 'visible' : 'hidden';
  await review.save();
  await recomputeRating(review.software);
  res.status(200).json({ success: true, data: review });
});

exports.adminDeleteReview = catchAsync(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) return res.status(404).json({ success: false, message: 'Review not found.' });
  const softwareId = review.software;
  await review.deleteOne();
  await recomputeRating(softwareId);
  res.status(200).json({ success: true });
});
