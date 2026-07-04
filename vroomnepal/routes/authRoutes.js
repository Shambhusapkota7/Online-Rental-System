// routes/authRoutes.js
'use strict';

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const phoneValidator = body('phone')
  .optional({ values: 'falsy' })
  .trim()
  .matches(/^\+?[0-9\s-]{7,20}$/)
  .withMessage('Valid phone number required');

const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

// POST /api/auth/register
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    phoneValidator,
    body('role').optional().isIn(['user', 'vendor', 'admin']).withMessage('Role must be user, vendor, or admin'),
  ],
  validate,
  authController.register
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('identifier').trim().notEmpty().withMessage('Email or phone is required'),
    body('password').notEmpty().withMessage('Password is required'),
    body('role').optional().isIn(['user', 'vendor', 'admin']).withMessage('Role must be user, vendor, or admin'),
  ],
  validate,
  authController.login
);

// GET /api/auth/me  (protected)
router.get('/me', protect, authController.getMe);

// POST /api/auth/forgot-password  — send OTP
router.post(
  '/forgot-password',
  [body('email').isEmail().normalizeEmail().withMessage('Valid email is required')],
  validate,
  authController.forgotPassword
);

// POST /api/auth/verify-otp  — verify OTP, get reset token
router.post(
  '/verify-otp',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  ],
  validate,
  authController.verifyOtp
);

// POST /api/auth/reset-password  — set new password
router.post(
  '/reset-password',
  [
    body('resetToken').notEmpty().withMessage('Reset token is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  validate,
  authController.resetPassword
);

module.exports = router;
