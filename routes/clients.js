const express = require('express');
const router = express.Router();
const { createClient, getClients } = require('../controllers/clientController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createClient);
router.get('/', protect, getClients);

module.exports = router;
