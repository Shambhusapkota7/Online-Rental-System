'use strict';

const express = require('express');
const notificationController = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.get('/', notificationController.getMyNotifications);
router.patch('/read', notificationController.markMyNotificationsRead);

module.exports = router;
