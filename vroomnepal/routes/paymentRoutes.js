// routes/paymentRoutes.js
'use strict';

const express = require('express');
const { body, param } = require('express-validator');
const router  = express.Router();

const paymentController = require('../controllers/paymentController');
const { protect, restrictTo } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(protect);

// POST /api/payments
router.post(
  '/',
  [
    body('booking_id').isInt({ min: 1 }).withMessage('Valid booking_id is required'),
    body('payment_method')
      .optional()
      .isIn(['cash', 'card', 'online', 'bank', 'esewa'])
      .withMessage('payment_method must be cash, card, online, bank, or esewa'),
    body('payment_details').optional().isObject().withMessage('payment_details must be an object'),
    body('payment_details.cardholder_name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Valid cardholder name is required'),
    body('payment_details.card_last4').optional().matches(/^\d{4}$/).withMessage('card_last4 must be 4 digits'),
    body('payment_details.expiry').optional().matches(/^\d{2}\/(\d{2}|\d{4})$/).withMessage('expiry must use MM/YYYY format'),
    body('payment_details.bank_name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Valid bank name is required'),
    body('payment_details.bank_account_last4').optional().matches(/^\d{4}$/).withMessage('bank_account_last4 must be 4 digits'),
    body('payment_details.account_holder').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Valid account holder name is required'),
  ],
  validate,
  paymentController.createPayment
);

// GET /api/payments/booking/:bookingId
router.get(
  '/booking/:bookingId',
  [param('bookingId').isInt({ min: 1 }).withMessage('Valid bookingId required')],
  validate,
  paymentController.getPaymentByBooking
);

// PATCH /api/payments/:id/status  – admin only
router.patch(
  '/:id/status',
  restrictTo('admin'),
  [
    param('id').isInt({ min: 1 }).withMessage('Valid payment id required'),
    body('payment_status').notEmpty().withMessage('payment_status is required'),
  ],
  validate,
  paymentController.updatePaymentStatus
);

module.exports = router;
