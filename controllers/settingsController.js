const Settings = require('../models/Settings');
const { catchAsync } = require('../middleware/errorHandler');
const { logActivity } = require('./activityController');

async function getOrCreateSettings() {
  let settings = await Settings.findOne({ singleton: 'site' });
  if (!settings) settings = await Settings.create({ singleton: 'site' });
  return settings;
}

// Public — safe subset only (no secrets to hide here since email creds live in .env, not this model)
exports.getSettings = catchAsync(async (req, res) => {
  const settings = await getOrCreateSettings();
  res.status(200).json({ success: true, data: settings });
});

exports.adminUpdateGeneral = catchAsync(async (req, res) => {
  const settings = await getOrCreateSettings();
  const { siteName, tagline, supportEmail, maintenanceMode } = req.body;
  if (siteName !== undefined) settings.siteName = siteName;
  if (tagline !== undefined) settings.tagline = tagline;
  if (supportEmail !== undefined) settings.supportEmail = supportEmail;
  if (maintenanceMode !== undefined) settings.maintenanceMode = maintenanceMode;
  await settings.save();
  await logActivity(req.user.name, 'updated site settings');
  res.status(200).json({ success: true, data: settings });
});

exports.adminUpdatePayment = catchAsync(async (req, res) => {
  const settings = await getOrCreateSettings();
  if (req.body.upiId !== undefined) settings.upiId = req.body.upiId;
  if (req.file) settings.qrImage = `/uploads/qr/${req.file.filename}`;
  await settings.save();
  await logActivity(req.user.name, 'updated payment receiving details');
  res.status(200).json({ success: true, data: settings });
});

exports.adminUpdateAdBanner = catchAsync(async (req, res) => {
  const settings = await getOrCreateSettings();
  const { enabled, title, subtitle, linkUrl } = req.body;
  settings.adBanner = {
    enabled: enabled === 'true' || enabled === true,
    title: title || '', subtitle: subtitle || '', linkUrl: linkUrl || '',
    image: req.file ? `/uploads/covers/${req.file.filename}` : settings.adBanner?.image || '',
  };
  await settings.save();
  await logActivity(req.user.name, 'updated homepage ad banner');
  res.status(200).json({ success: true, data: settings });
});

exports.adminResetData = catchAsync(async (req, res) => {
  // Deliberately not exposed as a route — full data wipe is a destructive operation better done
  // directly against the database (see README) than through an API endpoint.
  res.status(501).json({ success: false, message: 'Not implemented via API — see README for how to reset data.' });
});
