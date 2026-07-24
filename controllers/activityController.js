const ActivityLog = require('../models/ActivityLog');
const { catchAsync } = require('../middleware/errorHandler');

exports.logActivity = async (adminName, action, detail = '') => {
  try {
    await ActivityLog.create({ adminName, action, detail });
  } catch (err) {
    console.warn('Failed to log activity:', err.message);
  }
};

exports.getActivityLog = catchAsync(async (req, res) => {
  const logs = await ActivityLog.find().sort('-createdAt').limit(200);
  res.status(200).json({ success: true, data: logs });
});
