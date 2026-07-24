const express = require('express');
const { protect, restrictTo } = require('../middleware/auth');
const { uploadSoftwareFile, uploadCoverImage, uploadQrImage, uploadDeveloperPhoto } = require('../middleware/upload');

const sw = require('../controllers/softwareController');
const orders = require('../controllers/orderController');
const coupons = require('../controllers/couponController');
const reviews = require('../controllers/reviewController');
const developers = require('../controllers/developerController');
const users = require('../controllers/userController');
const settings = require('../controllers/settingsController');
const activity = require('../controllers/activityController');

const router = express.Router();
router.use(protect, restrictTo('admin'));

// Dashboard
router.get('/stats', sw.getAdminStats);

// Software
router.get('/software', sw.adminListSoftware);
router.get('/software/:id', sw.getSoftwareByIdAdmin);
router.post('/software', uploadCoverImage.single('coverImage'), sw.createSoftware);
router.put('/software/:id', uploadCoverImage.single('coverImage'), sw.updateSoftware);
router.delete('/software/:id', sw.deleteSoftware);
router.post('/software/:id/versions', uploadSoftwareFile.single('file'), sw.addVersion);
router.delete('/software/:id/versions/:versionId', sw.deleteVersion);

// Orders
router.get('/orders', orders.adminGetAllOrders);
router.post('/orders/:id/confirm', orders.confirmOrder);
router.post('/orders/:id/reject', orders.rejectOrder);
router.post('/orders/:id/revoke', orders.revokeOrder);

// Coupons
router.get('/coupons', coupons.adminListCoupons);
router.post('/coupons', coupons.adminCreateCoupon);
router.put('/coupons/:id/toggle', coupons.adminToggleCoupon);
router.delete('/coupons/:id', coupons.adminDeleteCoupon);

// Reviews
router.get('/reviews', reviews.adminGetAllReviews);
router.put('/reviews/:id/toggle', reviews.adminToggleReview);
router.delete('/reviews/:id', reviews.adminDeleteReview);

// Developers
router.post('/developers', uploadDeveloperPhoto.single('photo'), developers.adminCreateDeveloper);
router.delete('/developers/:id', developers.adminDeleteDeveloper);

// Users
router.get('/users', users.adminListUsers);
router.put('/users/:id/toggle-active', users.adminToggleUserActive);

// Settings
router.put('/settings/general', settings.adminUpdateGeneral);
router.put('/settings/payment', uploadQrImage.single('qrImage'), settings.adminUpdatePayment);
router.put('/settings/ad-banner', uploadCoverImage.single('image'), settings.adminUpdateAdBanner);

// Activity log
router.get('/activity', activity.getActivityLog);

module.exports = router;
