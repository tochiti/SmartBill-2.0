const express = require('express');
const router = express.Router();
const { createInvoice, getInvoicePDF } = require('../controllers/invoiceController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createInvoice);
router.get('/:id/pdf', protect, getInvoicePDF);

module.exports = router;
