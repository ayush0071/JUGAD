const mongoose = require('mongoose');

const developerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    bio: { type: String, default: '', maxlength: 200 },
    photo: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Developer', developerSchema);
