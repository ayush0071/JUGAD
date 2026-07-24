const mongoose = require('mongoose');

const versionSchema = new mongoose.Schema(
  {
    versionNumber: { type: String, required: true, trim: true },
    changelog: { type: String, default: '' },
    fileUrl: { type: String, required: true },
    fileName: { type: String, required: true },
    fileSize: { type: Number, default: 0 },
    platform: {
      type: String,
      enum: ['windows', 'mac', 'linux', 'android', 'ios', 'web', 'cross-platform'],
      default: 'cross-platform',
    },
    isLatest: { type: Boolean, default: false },
    downloadCount: { type: Number, default: 0 },
    releasedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const softwareSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    tagline: { type: String, maxlength: 200, default: '' },
    description: { type: String, required: true },
    category: {
      type: String,
      required: true,
      enum: ['students', 'workers', 'editors', 'developers', 'corporate', 'designers', 'other'],
    },
    tags: [{ type: String, trim: true, lowercase: true }],
    coverImage: { type: String, default: '' },
    screenshots: [{ type: String }],
    price: { type: Number, required: true, default: 0, min: 0 },
    discountPrice: { type: Number, default: 0, min: 0 },
    isFree: { type: Boolean, default: false },
    developer: { type: String, required: true },
    versions: [versionSchema],
    status: { type: String, enum: ['draft', 'published', 'coming-soon', 'archived'], default: 'published' },
    featured: { type: Boolean, default: false },
    totalDownloads: { type: Number, default: 0 },
    totalPurchases: { type: Number, default: 0 },
    ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

softwareSchema.index({ title: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Software', softwareSchema);
