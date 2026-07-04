'use strict';

const express = require('express');
const { body, param } = require('express-validator');

const carController = require('../controllers/carController');
const { protect, restrictTo } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();
const currentYear = new Date().getFullYear();
const carFields = ['name', 'brand', 'model', 'year', 'price_per_day', 'availability', 'image', 'vendor_id'];

const optionalCarValidators = [
  body('name').optional().trim().notEmpty().withMessage('Car name cannot be empty'),
  body('brand').optional().trim().notEmpty().withMessage('Brand cannot be empty'),
  body('model').optional().trim().notEmpty().withMessage('Model cannot be empty'),
  body('year')
    .optional()
    .isInt({ min: 1900, max: currentYear + 1 })
    .withMessage('Valid year required'),
  body('price_per_day')
    .optional()
    .isFloat({ min: 1000 })
    .withMessage('Price per day must be at least Rs. 1,000'),
  body('availability')
    .optional()
    .isBoolean()
    .withMessage('Availability must be true or false'),
  body('image')
    .optional({ nullable: true })
    .isString()
    .withMessage('Image must be a string URL or path'),
  body('vendor_id')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('Vendor id must be valid'),
];

router.get('/', carController.getAllCars);

router.get(
  '/:id',
  [param('id').isInt({ min: 1 }).withMessage('Valid car id required')],
  validate,
  carController.getCar
);

router.post(
  '/',
  protect,
  restrictTo('admin', 'vendor'),
  [
    body('name').trim().notEmpty().withMessage('Car name is required'),
    body('brand').trim().notEmpty().withMessage('Brand is required'),
    body('model').trim().notEmpty().withMessage('Model is required'),
    body('year')
      .isInt({ min: 1900, max: currentYear + 1 })
      .withMessage('Valid year required'),
    body('price_per_day')
      .isFloat({ min: 1000 })
      .withMessage('Price per day must be at least Rs. 1,000'),
    body('availability')
      .optional()
      .isBoolean()
      .withMessage('Availability must be true or false'),
    body('image')
      .optional({ nullable: true })
      .isString()
      .withMessage('Image must be a string URL or path'),
    body('vendor_id')
      .optional({ nullable: true })
      .isInt({ min: 1 })
      .withMessage('Vendor id must be valid'),
  ],
  validate,
  carController.createCar
);

router.put(
  '/:id',
  protect,
  restrictTo('admin', 'vendor'),
  [
    param('id').isInt({ min: 1 }).withMessage('Valid car id required'),
    ...optionalCarValidators,
    body().custom((value) => {
      const providedFields = Object.keys(value || {});

      if (providedFields.length === 0) {
        throw new Error('At least one field is required to update a car');
      }

      if (!providedFields.some((field) => carFields.includes(field))) {
        throw new Error('No valid fields provided for update');
      }

      return true;
    }),
  ],
  validate,
  carController.updateCar
);

router.delete(
  '/:id',
  protect,
  restrictTo('admin', 'vendor'),
  [param('id').isInt({ min: 1 }).withMessage('Valid car id required')],
  validate,
  carController.deleteCar
);

module.exports = router;
