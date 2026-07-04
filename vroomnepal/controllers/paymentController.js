'use strict';

const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');

const PAYMENT_STATUSES = ['pending', 'completed', 'failed', 'refunded'];

const isOwnerOrAdmin = (user, ownerId) =>
  user.role === 'admin' || Number(ownerId) === Number(user.id);

const canViewBookingPayment = (user, booking) =>
  isOwnerOrAdmin(user, booking.user_id) ||
  (user.role === 'vendor' && Number(booking.vendor_id) === Number(user.id));

const isFutureExpiry = (value) => {
  const match = String(value || '').trim().match(/^(\d{2})\/(\d{2}|\d{4})$/);
  if (!match) return false;

  const month = Number(match[1]);
  const year = match[2].length === 2 ? 2000 + Number(match[2]) : Number(match[2]);
  if (month < 1 || month > 12) return false;

  return new Date(year, month, 0, 23, 59, 59, 999) >= new Date();
};

const validatePaymentDetails = (method, details = {}) => {
  if (method === 'card') {
    if (!details.cardholder_name || String(details.cardholder_name).trim().length < 2) {
      return 'Cardholder name is required';
    }
    if (!/^\d{4}$/.test(String(details.card_last4 || ''))) {
      return 'Valid card details are required';
    }
    if (!isFutureExpiry(details.expiry)) {
      return 'Valid future card expiry is required';
    }
  }

  if (method === 'bank') {
    if (!details.bank_name || String(details.bank_name).trim().length < 2) {
      return 'Bank name is required';
    }
    if (!/^\d{4}$/.test(String(details.bank_account_last4 || ''))) {
      return 'Valid bank account details are required';
    }
    if (!details.account_holder || String(details.account_holder).trim().length < 2) {
      return 'Account holder name is required';
    }
  }

  if (['online', 'esewa'].includes(method)) {
    return 'Please complete wallet payment through the eSewa checkout';
  }

  return null;
};

const notifyPaymentCompleted = async (booking) => {
  const amount = Number(booking.total_price || 0).toLocaleString('en-IN');

  if (booking.vendor_id) {
    await Notification.create({
      user_id: booking.vendor_id,
      type: 'vendor_payment_received',
      title: 'Customer payment received',
      message: `${booking.user_name || 'A customer'} paid Rs. ${amount} for ${booking.car_name || 'your vehicle'}`,
      booking_id: booking.id,
      car_id: booking.car_id,
    });
  }

  await Notification.create({
    user_id: booking.user_id,
    type: 'customer_payment_completed',
    title: 'Payment successful',
    message: `Your payment of Rs. ${amount} for ${booking.car_name || 'your booking'} is complete. Your booking is confirmed.`,
    booking_id: booking.id,
    car_id: booking.car_id,
  });
};

exports.createPayment = async (req, res, next) => {
  try {
    const { booking_id, payment_method, payment_details } = req.body;
    const method = payment_method || 'cash';

    const booking = await Booking.findById(booking_id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (!isOwnerOrAdmin(req.user, booking.user_id)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (['cancelled', 'completed'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot create payment for a ${booking.status} booking`,
      });
    }

    const paymentError = validatePaymentDetails(method, payment_details);
    if (paymentError) {
      return res.status(400).json({ success: false, message: paymentError });
    }

    const existingPayment = await Payment.findByBookingId(booking_id);
    if (existingPayment) {
      if (existingPayment.payment_status === 'completed') {
        await Booking.updateStatus(booking_id, 'confirmed');
        return res.json({ success: true, payment: existingPayment });
      }

      await Payment.updateForBooking(booking_id, {
        amount: booking.total_price,
        payment_method: method || existingPayment.payment_method || 'cash',
        payment_status: 'completed',
      });
      await Booking.updateStatus(booking_id, 'confirmed');
      await notifyPaymentCompleted(booking);

      const payment = await Payment.findByBookingId(booking_id);
      return res.json({ success: true, payment });
    }

    const paymentId = await Payment.create({
      booking_id,
      amount: booking.total_price,
      payment_method: method,
      payment_status: 'completed',
    });
    await Booking.updateStatus(booking_id, 'confirmed');
    await notifyPaymentCompleted(booking);

    const payment = await Payment.findById(paymentId);
    res.status(201).json({ success: true, payment });
  } catch (error) {
    next(error);
  }
};

exports.getPaymentByBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (!canViewBookingPayment(req.user, booking)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const payment = await Payment.findByBookingId(req.params.bookingId);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'No payment found for this booking' });
    }

    res.json({ success: true, payment });
  } catch (error) {
    next(error);
  }
};

exports.updatePaymentStatus = async (req, res, next) => {
  try {
    const { payment_status } = req.body;

    if (!PAYMENT_STATUSES.includes(payment_status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${PAYMENT_STATUSES.join(', ')}`,
      });
    }

    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    await Payment.updateStatus(req.params.id, payment_status);

    if (payment_status === 'completed' && payment.payment_status !== 'completed') {
      await Booking.updateStatus(payment.booking_id, 'confirmed');
      const booking = await Booking.findById(payment.booking_id);
      if (booking) await notifyPaymentCompleted(booking);
    }

    res.json({
      success: true,
      message: `Payment status updated to '${payment_status}'`,
    });
  } catch (error) {
    next(error);
  }
};
