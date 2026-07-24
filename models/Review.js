const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    software: { type: mongoose.Schema.Types.ObjectId, ref: 'Software', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, maxlength: 1000 },
    status: { type: String, enum: ['visible', 'hidden'], default: 'visible' },
  },
  { timestamps: true }
);

reviewSchema.index({ software: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
