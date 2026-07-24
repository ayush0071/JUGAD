const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    adminName: { type: String, required: true },
    action: { type: String, required: true },
    detail: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ActivityLog', activityLogSchema);
