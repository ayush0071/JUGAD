const express = require('express');
const { protect } = require('../middleware/auth');
const users = require('../controllers/userController');

const router = express.Router();
router.use(protect);

router.get('/library', users.getMyLibrary);
router.get('/wishlist', users.getWishlist);
router.post('/wishlist/:softwareId', users.toggleWishlist);
router.post('/payment-methods', users.addPaymentMethod);
router.delete('/payment-methods/:methodId', users.removePaymentMethod);

module.exports = router;
