'use strict';

const crypto = require('crypto');
const axios = require('axios');

const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');

const ESEWA_SECRET_KEY = process.env.ESEWA_SECRET_KEY || '8gBm/:&EnhH.1/q';
const ESEWA_PRODUCT_CODE = process.env.ESEWA_PRODUCT_CODE || 'EPAYTEST';
const ESEWA_VERIFY_URL =
  process.env.ESEWA_VERIFY_URL || 'https://rc-epay.esewa.com.np/api/epay/transaction/status/';
const FRONTEND_URL = process.env.FRONTEND_URL || null;

const isOwnerOrAdmin = (user, ownerId) =>
  user.role === 'admin' || Number(ownerId) === Number(user.id);

const generateSignature = (message) =>
  crypto.createHmac('sha256', ESEWA_SECRET_KEY).update(message).digest('base64');

const notifyPaymentCompleted = async (booking) => {
  const amount = Number(booking.total_price || 0).toLocaleString('en-IN');

  if (booking.vendor_id) {
    await Notification.create({
      user_id: booking.vendor_id,
      type: 'vendor_payment_received',
      title: 'Customer eSewa payment received',
      message: `${booking.user_name || 'A customer'} paid Rs. ${amount} for ${booking.car_name || 'your vehicle'}`,
      booking_id: booking.id,
      car_id: booking.car_id,
    });
  }

  await Notification.create({
    user_id: booking.user_id,
    type: 'customer_payment_completed',
    title: 'eSewa payment successful',
    message: `Your eSewa payment of Rs. ${amount} for ${booking.car_name || 'your booking'} is complete. Your booking is confirmed.`,
    booking_id: booking.id,
    car_id: booking.car_id,
  });
};

exports.initiatePayment = async (req, res, next) => {
  try {
    const { booking_id } = req.body;

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
        message: `Cannot pay for a ${booking.status} booking`,
      });
    }

    const existingPayment = await Payment.findByBookingId(booking_id);
    if (existingPayment && existingPayment.payment_status === 'completed') {
      return res.status(409).json({ success: false, message: 'Booking already paid' });
    }

    const amount = Number(booking.total_price).toFixed(2);
    const transactionUuid = `booking-${booking_id}-${Date.now()}`;
    const signatureMessage =
      `total_amount=${amount},transaction_uuid=${transactionUuid},product_code=${ESEWA_PRODUCT_CODE}`;
    const frontendBaseUrl = FRONTEND_URL || `${req.protocol}://${req.get('host')}`;

    if (!existingPayment) {
      await Payment.create({
        booking_id,
        amount: booking.total_price,
        payment_method: 'esewa',
      });
      await Payment.updateForBooking(booking_id, { transaction_uuid: transactionUuid });
    } else {
      await Payment.updateForBooking(booking_id, {
        transaction_uuid: transactionUuid,
        payment_method: 'esewa',
      });
    }

    res.json({
      success: true,
      esewa: {
        url: 'https://rc-epay.esewa.com.np/api/epay/main/v2/form',
        fields: {
          amount,
          tax_amount: '0',
          total_amount: amount,
          transaction_uuid: transactionUuid,
          product_code: ESEWA_PRODUCT_CODE,
          product_service_charge: '0',
          product_delivery_charge: '0',
          success_url: `${frontendBaseUrl}/payment_Ewallet.html?booking_id=${booking_id}&esewa=success`,
          failure_url: `${frontendBaseUrl}/payment_Ewallet.html?booking_id=${booking_id}&esewa=failure`,
          signed_field_names: 'total_amount,transaction_uuid,product_code',
          signature: generateSignature(signatureMessage),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.verifyPayment = async (req, res, next) => {
  try {
    const { data } = req.body;
    if (!data) {
      return res.status(400).json({ success: false, message: 'No data received from eSewa' });
    }

    let esewaResponse;
    try {
      esewaResponse = JSON.parse(Buffer.from(data, 'base64').toString('utf8'));
    } catch (error) {
      return res.status(400).json({ success: false, message: 'Invalid eSewa response data' });
    }

    const {
      transaction_uuid,
      total_amount,
      status,
      signature: receivedSignature,
    } = esewaResponse;

    const signatureMessage =
      `total_amount=${total_amount},transaction_uuid=${transaction_uuid},product_code=${ESEWA_PRODUCT_CODE}`;
    const expectedSignature = generateSignature(signatureMessage);

    if (expectedSignature !== receivedSignature) {
      return res.status(400).json({
        success: false,
        message: 'Signature mismatch - possible tampering',
      });
    }

    if (status !== 'COMPLETE') {
      return res.status(400).json({ success: false, message: `Payment not completed. Status: ${status}` });
    }

    const payment = await Payment.findByTransactionUuid(transaction_uuid);

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }

    if (payment.payment_status === 'completed') {
      return res.json({ success: true, message: 'Payment already verified', payment });
    }

    const verificationResponse = await axios.get(ESEWA_VERIFY_URL, {
      params: {
        product_code: ESEWA_PRODUCT_CODE,
        total_amount,
        transaction_uuid,
      },
    });

    if (verificationResponse.data?.status !== 'COMPLETE') {
      await Payment.updateStatus(payment.id, 'failed');
      return res.status(400).json({ success: false, message: 'eSewa verification failed' });
    }

    await Payment.updateStatus(payment.id, 'completed');
    await Booking.updateStatus(payment.booking_id, 'confirmed');
    const booking = await Booking.findById(payment.booking_id);
    if (booking) await notifyPaymentCompleted(booking);

    const updatedPayment = await Payment.findById(payment.id);

    res.json({
      success: true,
      message: 'Payment verified and booking confirmed!',
      payment: updatedPayment,
    });
  } catch (error) {
    next(error);
  }
};

exports.handleFailure = async (req, res, next) => {
  try {
    const { data } = req.body;

    if (data) {
      try {
        const decodedData = JSON.parse(Buffer.from(data, 'base64').toString('utf8'));
        const { transaction_uuid } = decodedData;

        if (transaction_uuid) {
          const payment = await Payment.findByTransactionUuid(transaction_uuid);
          if (payment) await Payment.updateStatus(payment.id, 'failed');
        }
      } catch (error) {
      }
    }

    res.json({ success: false, message: 'Payment failed or was cancelled by user' });
  } catch (error) {
    next(error);
  }
};
