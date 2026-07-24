const express = require('express');
const { protect } = require('../middleware/auth');
const orders = require('../controllers/orderController');

const router = express.Router();
router.use(protect);

router.post('/create', orders.createOrder);
router.post('/preview-coupon', orders.previewCoupon);
router.get('/my', orders.getMyOrders);
router.get('/pending/:softwareId', orders.getMyPendingOrderForSoftware);

module.exports = router;
