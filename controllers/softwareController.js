const path = require('path');
const fs = require('fs');
const Software = require('../models/Software');
const { catchAsync } = require('../middleware/errorHandler');
const slugify = require('../utils/slugify');
const { logActivity } = require('./activityController');
const { createNotification, emailAllSubscribers } = require('./notificationController');

// ---------- PUBLIC ----------

exports.getAllSoftware = catchAsync(async (req, res) => {
  const { search, category, sort, page = 1, limit = 12, free } = req.query;
  const query = { status: 'published' };

  if (category) query.category = category;
  if (free === 'true') query.isFree = true;
  if (search) query.$text = { $search: search };

  const sortMap = {
    newest: '-createdAt', popular: '-totalDownloads',
    priceLow: 'price', priceHigh: '-price', rating: '-ratingAverage',
  };
  const sortBy = sortMap[sort] || '-createdAt';
  const skip = (Number(page) - 1) * Number(limit);

  const [items, total] = await Promise.all([
    Software.find(query).sort(sortBy).skip(skip).limit(Number(limit)).select('-versions.fileUrl'),
    Software.countDocuments(query),
  ]);

  res.status(200).json({
    success: true, count: items.length, total,
    totalPages: Math.ceil(total / Number(limit)), currentPage: Number(page), data: items,
  });
});

exports.getFeatured = catchAsync(async (req, res) => {
  const items = await Software.find({ status: 'published', featured: true }).limit(8);
  res.status(200).json({ success: true, data: items });
});

exports.getUpcoming = catchAsync(async (req, res) => {
  const items = await Software.find({ status: 'coming-soon' }).sort('-createdAt');
  res.status(200).json({ success: true, data: items });
});

exports.getSoftwareBySlug = catchAsync(async (req, res) => {
  const item = await Software.findOne({ slug: req.params.slug, status: 'published' });
  if (!item) return res.status(404).json({ success: false, message: 'Software not found.' });
  res.status(200).json({ success: true, data: item });
});

// @route GET /api/software/:id/download/:versionId — protected, gated by ownership
exports.downloadVersion = catchAsync(async (req, res) => {
  const item = await Software.findById(req.params.id);
  if (!item) return res.status(404).json({ success: false, message: 'Software not found.' });

  const version = item.versions.id(req.params.versionId);
  if (!version) return res.status(404).json({ success: false, message: 'Version not found.' });

  const isFree = item.isFree || item.price === 0;
  if (!isFree) {
    const owns = req.user.purchasedSoftware.some((p) => p.software.toString() === item._id.toString());
    if (!owns && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'This unlocks once the admin confirms your payment.' });
    }
  }

  version.downloadCount += 1;
  item.totalDownloads += 1;
  await item.save();

  const filePath = path.join(__dirname, '..', version.fileUrl);
  if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, message: 'File missing on server.' });
  res.download(filePath, version.fileName);
});

// ---------- ADMIN ----------

exports.createSoftware = catchAsync(async (req, res) => {
  const { title, tagline, description, category, tags, price, discountPrice, isFree, developer, status, featured } = req.body;

  let slug = slugify(title);
  if (await Software.findOne({ slug })) slug = `${slug}-${Date.now().toString(36)}`;

  const coverImage = req.file ? `/uploads/covers/${req.file.filename}` : '';

  const item = await Software.create({
    title, slug, tagline, description, category,
    tags: tags ? tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean) : [],
    price: Number(price) || 0, discountPrice: Number(discountPrice) || 0,
    isFree: isFree === 'true' || isFree === true,
    developer, coverImage, status: status || 'published', featured: featured === 'true' || featured === true,
    createdBy: req.user.id,
  });

  await logActivity(req.user.name, 'created software', item.title);

  if (item.status === 'published') {
    await createNotification({ type: 'new_software', title: `New: ${item.title}`, message: item.tagline || 'Just published — check it out.', softwareSlug: item.slug });
    emailAllSubscribers(`New on JUGAD: ${item.title}`, `${item.title} just went live.\n\n${item.tagline || ''}\n\nCheck it out on the site.`);
  }

  res.status(201).json({ success: true, data: item });
});

exports.adminListSoftware = catchAsync(async (req, res) => {
  const items = await Software.find().sort('-createdAt');
  res.status(200).json({ success: true, count: items.length, data: items });
});

exports.getSoftwareByIdAdmin = catchAsync(async (req, res) => {
  const item = await Software.findById(req.params.id);
  if (!item) return res.status(404).json({ success: false, message: 'Software not found.' });
  res.status(200).json({ success: true, data: item });
});

exports.updateSoftware = catchAsync(async (req, res) => {
  const item = await Software.findById(req.params.id);
  if (!item) return res.status(404).json({ success: false, message: 'Software not found.' });

  const fields = ['title', 'tagline', 'description', 'category', 'developer', 'status'];
  fields.forEach((f) => { if (req.body[f] !== undefined) item[f] = req.body[f]; });

  if (req.body.price !== undefined) item.price = Number(req.body.price);
  if (req.body.discountPrice !== undefined) item.discountPrice = Number(req.body.discountPrice);
  if (req.body.isFree !== undefined) item.isFree = req.body.isFree === 'true' || req.body.isFree === true;
  if (req.body.featured !== undefined) item.featured = req.body.featured === 'true' || req.body.featured === true;
  if (req.body.tags !== undefined) item.tags = req.body.tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
  if (req.file) item.coverImage = `/uploads/covers/${req.file.filename}`;

  await item.save();
  await logActivity(req.user.name, 'updated software', item.title);

  if (item.status === 'published') {
    await createNotification({ type: 'update', title: `Updated: ${item.title}`, message: 'The admin just updated this listing.', softwareSlug: item.slug });
    emailAllSubscribers(`JUGAD update: ${item.title}`, `${item.title} was just updated.\n\nCheck out what's new on the site.`);
  }

  res.status(200).json({ success: true, data: item });
});

exports.deleteSoftware = catchAsync(async (req, res) => {
  const item = await Software.findById(req.params.id);
  if (!item) return res.status(404).json({ success: false, message: 'Software not found.' });

  item.versions.forEach((v) => {
    const filePath = path.join(__dirname, '..', v.fileUrl);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  });

  await item.deleteOne();
  await logActivity(req.user.name, 'deleted software', item.title);
  res.status(200).json({ success: true });
});

exports.addVersion = catchAsync(async (req, res) => {
  const item = await Software.findById(req.params.id);
  if (!item) return res.status(404).json({ success: false, message: 'Software not found.' });
  if (!req.file) return res.status(400).json({ success: false, message: 'Software file is required.' });

  const { versionNumber, changelog, platform } = req.body;
  item.versions.forEach((v) => (v.isLatest = false));
  item.versions.push({
    versionNumber, changelog, platform,
    fileUrl: `/uploads/software/${req.file.filename}`,
    fileName: req.file.originalname, fileSize: req.file.size, isLatest: true,
  });
  await item.save();
  await logActivity(req.user.name, 'uploaded a version', `${item.title} v${versionNumber}`);
  res.status(201).json({ success: true, data: item });
});

exports.deleteVersion = catchAsync(async (req, res) => {
  const item = await Software.findById(req.params.id);
  if (!item) return res.status(404).json({ success: false, message: 'Software not found.' });
  const version = item.versions.id(req.params.versionId);
  if (!version) return res.status(404).json({ success: false, message: 'Version not found.' });

  const filePath = path.join(__dirname, '..', version.fileUrl);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  version.deleteOne();
  await item.save();
  res.status(200).json({ success: true, data: item });
});

exports.getAdminStats = catchAsync(async (req, res) => {
  const Order = require('../models/Order');
  const User = require('../models/User');
  const [totalSoftware, published, totalUsers, totalDownloadsAgg, paidOrders, byCategory] = await Promise.all([
    Software.countDocuments(),
    Software.countDocuments({ status: 'published' }),
    User.countDocuments({ role: 'user' }),
    Software.aggregate([{ $group: { _id: null, total: { $sum: '$totalDownloads' } } }]),
    Order.find({ status: 'paid' }),
    Software.aggregate([{ $group: { _id: '$category', downloads: { $sum: '$totalDownloads' } } }]),
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalSoftware, published, totalUsers,
      totalDownloads: totalDownloadsAgg[0]?.total || 0,
      revenue: paidOrders.reduce((s, o) => s + o.amount, 0) / 100,
      paidOrderCount: paidOrders.length,
      byCategory: byCategory.filter((c) => c.downloads > 0).sort((a, b) => b.downloads - a.downloads),
    },
  });
});
