// routes/esewaRoutes.js
'use strict';

const express = require('express');
const { body } = require('express-validator');
const router  = express.Router();

const esewaController = require('../controllers/esewaController');
const { protect }     = require('../middleware/auth');
const validate        = require('../middleware/validate');

// POST /api/esewa/initiate  – logged-in user starts eSewa payment
router.post(
  '/initiate',
  protect,
  [body('booking_id').isInt({ min: 1 }).withMessage('Valid booking_id is required')],
  validate,
  esewaController.initiatePayment
);

// POST /api/esewa/verify  – frontend sends eSewa callback data for verification
router.post('/verify', protect, esewaController.verifyPayment);

// POST /api/esewa/failure  – eSewa redirects here on failure
router.post('/failure', esewaController.handleFailure);

module.exports = router;
// hello world 