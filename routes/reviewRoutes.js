const express = require('express');
const { protect } = require('../middleware/auth');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const reviews = require('../controllers/reviewController');

const router = express.Router();

router.get('/software/:id', reviews.getReviewsForSoftware);
router.post('/software/:id', protect, [body('rating').isInt({ min: 1, max: 5 }), body('comment').trim().notEmpty()], validate, reviews.createReview);

module.exports = router;
