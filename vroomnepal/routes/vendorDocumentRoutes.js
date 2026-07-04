'use strict';

const express = require('express');
const { body, param, query } = require('express-validator');
const vendorDocumentController = require('../controllers/vendorDocumentController');
const { protect, restrictTo } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();
const documentTypes = ['national_id', 'driving_license', 'business_license'];

router.use(protect);

router.get(
  '/',
  restrictTo('vendor', 'admin'),
  [
    query('vendor_id')
      .optional()
      .isInt({ min: 1 })
      .withMessage('vendor_id must be valid'),
  ],
  validate,
  vendorDocumentController.getMyDocuments
);

router.post(
  '/',
  restrictTo('vendor'),
  [
    body('document_type')
      .isIn(documentTypes)
      .withMessage('Unsupported document type'),
    body('file_name')
      .trim()
      .notEmpty()
      .withMessage('File name is required')
      .isLength({ max: 255 })
      .withMessage('File name is too long'),
    body('file_type')
      .optional({ nullable: true })
      .isString()
      .isLength({ max: 120 })
      .withMessage('File type is too long'),
    body('file_size')
      .optional({ nullable: true })
      .isInt({ min: 0, max: 15 * 1024 * 1024 })
      .withMessage('File size must be under 15MB'),
    body('file_data')
      .optional({ nullable: true })
      .isString()
      .isLength({ max: 20 * 1024 * 1024 })
      .withMessage('File data is too large'),
  ],
  validate,
  vendorDocumentController.uploadDocument
);

router.patch(
  '/:vendorId/:type/status',
  restrictTo('admin'),
  [
    param('vendorId').isInt({ min: 1 }).withMessage('Valid vendor id required'),
    param('type').isIn(documentTypes).withMessage('Unsupported document type'),
    body('status').isIn(['pending', 'verified', 'rejected']).withMessage('Invalid status'),
    body('rejection_reason')
      .optional({ nullable: true })
      .isString()
      .isLength({ max: 500 })
      .withMessage('Rejection reason is too long'),
  ],
  validate,
  vendorDocumentController.updateDocumentStatus
);

module.exports = router;
