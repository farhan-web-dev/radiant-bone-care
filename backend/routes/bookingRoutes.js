const express = require('express');
const router = express.Router();
const {
  createBooking,
  getBookings,
  getAllBookings,
  updateBookingStatus,
} = require('../controllers/bookingController');
const { protect, admin, optionalProtect } = require('../middleware/authMiddleware');

router.route('/').post(optionalProtect, createBooking).get(protect, getBookings);
router.route('/all').get(protect, admin, getAllBookings);
router.route('/:id/status').put(protect, admin, updateBookingStatus);

module.exports = router;
