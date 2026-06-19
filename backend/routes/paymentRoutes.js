const express = require('express');
const router = express.Router();
const { processPayment, verifyPayment, getPayments } = require('../controllers/paymentController');
const { protect, admin, optionalProtect } = require('../middleware/authMiddleware');

router.route('/').post(optionalProtect, processPayment).get(protect, admin, getPayments);
router.route('/verify').post(optionalProtect, verifyPayment);

module.exports = router;
