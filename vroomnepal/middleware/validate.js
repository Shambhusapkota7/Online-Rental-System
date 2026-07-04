// middleware/validate.js
'use strict';

const { validationResult } = require('express-validator');

/**
 * Run after express-validator chains.
 * Returns 400 with structured errors if any chain failed.
 */
const validate = (req, res, next) => {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: result.array().map((e) => ({
        field:   e.path,
        message: e.msg,
      })),
    });
  }
  next();
};

module.exports = validate;
