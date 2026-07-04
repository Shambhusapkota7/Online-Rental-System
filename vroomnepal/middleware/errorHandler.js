'use strict';

const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

const errorHandler = (error, req, res, _next) => {
  const statusCode = error.statusCode || 500;

  if (error.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      message: 'A record with those details already exists',
    });
  }

  if (error.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(409).json({
      success: false,
      message: 'Cannot delete - related records exist',
    });
  }

  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', error);
    return res.status(statusCode).json({
      success: false,
      message: error.message,
      stack: error.stack,
    });
  }

  return res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? 'Internal server error' : error.message,
  });
};

module.exports = { notFound, errorHandler };
