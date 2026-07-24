const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  singleton: { type: String, default: 'site', unique: true },
  siteName: { type: String, default: 'JUGAD' },
  tagline: { type: String, default: 'Software that works, made for you.' },
  supportEmail: { type: String, default: '' },
  maintenanceMode: { type: Boolean, default: false },
  upiId: { type: String, default: '' },
  qrImage: { type: String, default: '' },
  adBanner: {
    enabled: { type: Boolean, default: false },
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    image: { type: String, default: '' },
    linkUrl: { type: String, default: '' },
  },
});

module.exports = mongoose.model('Settings', settingsSchema);
