const express = require('express');
const { protect } = require('../middleware/auth');
const sw = require('../controllers/softwareController');

const router = express.Router();

router.get('/', sw.getAllSoftware);
router.get('/featured', sw.getFeatured);
router.get('/upcoming', sw.getUpcoming);
router.get('/:slug', sw.getSoftwareBySlug);
router.get('/:id/download/:versionId', protect, sw.downloadVersion);

module.exports = router;
