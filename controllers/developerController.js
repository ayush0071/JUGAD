const Developer = require('../models/Developer');
const { catchAsync } = require('../middleware/errorHandler');
const { logActivity } = require('./activityController');

exports.getAllDevelopers = catchAsync(async (req, res) => {
  const developers = await Developer.find().sort('-createdAt');
  res.status(200).json({ success: true, data: developers });
});

exports.adminCreateDeveloper = catchAsync(async (req, res) => {
  const { name, bio } = req.body;
  const photo = req.file ? `/uploads/developers/${req.file.filename}` : '';
  const developer = await Developer.create({ name, bio, photo });
  await logActivity(req.user.name, 'added a developer profile', name);
  res.status(201).json({ success: true, data: developer });
});

exports.adminDeleteDeveloper = catchAsync(async (req, res) => {
  const developer = await Developer.findById(req.params.id);
  if (!developer) return res.status(404).json({ success: false, message: 'Developer not found.' });
  await developer.deleteOne();
  await logActivity(req.user.name, 'removed a developer profile', developer.name);
  res.status(200).json({ success: true });
});
