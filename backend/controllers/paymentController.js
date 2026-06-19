const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// @desc    Process a payment (Initialize gateway)
// @route   POST /api/payments
// @access  Private
const processPayment = async (req, res) => {
  try {
    const { bookingId, paymentMethod, amount } = req.body;

    if (!bookingId || !paymentMethod || !amount) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Verify booking belongs to user (if booking has an associated user)
    if (booking.user && (!req.user || booking.user.toString() !== req.user.id)) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    let paymentStatus = 'Pending';
    let newBookingStatus = 'Pending';
    let responseData = {};

    if (paymentMethod === 'Pay at Clinic' && booking.bookingType === 'Visit to Clinic') {
      paymentStatus = 'Pending';
      newBookingStatus = 'Confirmed';
    } else if (paymentMethod === 'Card') {
      // 1. Create a Stripe PaymentIntent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Stripe expects smallest currency unit (e.g. cents/paise). PKR * 100
        currency: 'pkr',
        metadata: { bookingId: booking._id.toString() },
      });
      responseData.clientSecret = paymentIntent.client_secret;
      
    } else if (['Easypaisa', 'JazzCash'].includes(paymentMethod)) {
      // 2. Safepay initialization
      // Using global.fetch which is available in Node >= 18
      const safepayRes = await fetch('https://sandbox.api.getsafepay.com/order/v1/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: process.env.SAFEPAY_PUBLIC_KEY,
          amount: amount,
          currency: 'PKR',
          environment: 'sandbox'
        })
      });
      
      const safepayData = await safepayRes.json();
      if (!safepayRes.ok || !safepayData.data || !safepayData.data.token) {
        console.error("Safepay Init Error:", safepayData);
        throw new Error(safepayData.message || 'Safepay initialization failed');
      }
      
      const tracker = safepayData.data.token;
      // Redirect URL with custom source
      const redirectUrl = `https://sandbox.api.getsafepay.com/checkout/pay?env=sandbox&tracker=${tracker}&source=custom&order_id=${booking._id.toString()}&redirect_url=http://localhost:5173/?safepay_callback=true`;
      
      responseData.redirectUrl = redirectUrl;
      responseData.tracker = tracker;
      
    } else {
      return res.status(400).json({ message: 'Invalid payment method for this booking type' });
    }

    // Create payment record (initial state)
    const paymentData = {
      booking: bookingId,
      paymentMethod,
      paymentStatus,
      amount,
    };

    if (req.user && req.user.id) {
      paymentData.user = req.user.id;
    }

    const payment = await Payment.create(paymentData);

    // Only update booking status immediately if it's Pay at Clinic
    if (paymentMethod === 'Pay at Clinic') {
      booking.status = newBookingStatus;
      await booking.save();
    }

    res.status(201).json({
      payment,
      booking,
      ...responseData
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Verify a payment (from Stripe or Safepay callback)
// @route   POST /api/payments/verify
// @access  Public
const verifyPayment = async (req, res) => {
  try {
    const { bookingId, paymentMethod, paymentIntentId, tracker, reference } = req.body;
    
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const payment = await Payment.findOne({ booking: bookingId }).sort({ createdAt: -1 });
    if (!payment) return res.status(404).json({ message: 'Payment record not found' });

    if (paymentMethod === 'Card') {
      // Verify via Stripe
      const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (intent.status === 'succeeded') {
        payment.paymentStatus = 'Paid';
        booking.status = 'Confirmed';
      } else {
        payment.paymentStatus = 'Failed';
      }
    } else if (['Easypaisa', 'JazzCash'].includes(paymentMethod)) {
      // Verify via Safepay (simplified check for sandbox)
      if (tracker && reference) {
        payment.paymentStatus = 'Paid';
        booking.status = 'Confirmed';
      } else {
        payment.paymentStatus = 'Failed';
      }
    }

    await payment.save();
    await booking.save();

    res.status(200).json({ payment, booking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all payments (Admin)
// @route   GET /api/payments
// @access  Private/Admin
const getPayments = async (req, res) => {
  try {
    const payments = await Payment.find({})
      .populate('user', 'name email')
      .populate('booking')
      .sort({ createdAt: -1 });
    res.status(200).json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  processPayment,
  verifyPayment,
  getPayments,
};
