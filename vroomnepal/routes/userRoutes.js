// routes/userRoutes.js
'use strict';

const express = require('express');
const { body } = require('express-validator');
const router  = express.Router();

const userController = require('../controllers/userController');
const { protect, restrictTo } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(protect);

const phoneValidator = body('phone')
  .optional({ values: 'falsy' })
  .trim()
  .matches(/^\+?[0-9\s-]{7,20}$/)
  .withMessage('Valid phone number required');

// GET /api/users/profile
router.get('/profile', userController.getProfile);

// PUT /api/users/profile
router.put(
  '/profile',
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    phoneValidator,
  ],
  validate,
  userController.updateProfile
);

// GET /api/users  – admin only
router.get('/', restrictTo('admin'), userController.getAllUsers);

// POST /api/users  – admin creates user (can set role)
router.post(
  '/',
  restrictTo('admin'),
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    phoneValidator,
    body('role').optional().isIn(['user', 'vendor', 'admin']).withMessage('Role must be user, vendor, or admin'),
  ],
  validate,
  userController.createUser
);

module.exports = router;
