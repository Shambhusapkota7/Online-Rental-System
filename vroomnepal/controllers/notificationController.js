'use strict';

const Notification = require('../models/Notification');

const normalizePaymentNotificationForRole = (notification, user) => {
  if (user.role !== 'user') return notification;

  const isPaymentNotice = [
    'payment_completed',
    'customer_payment_completed',
    'vendor_payment_received',
  ].includes(notification.type);

  if (!isPaymentNotice) return notification;

  if (notification.booking_user_id && Number(notification.booking_user_id) !== Number(user.id)) {
    return null;
  }

  const amountMatch = String(notification.message || '').match(/Rs\.\s*[\d,]+(?:\.\d+)?/);
  const amount = amountMatch ? amountMatch[0] : 'your rental amount';
  const carName = notification.car_name || 'your booking';

  return {
    ...notification,
    type: 'customer_payment_completed',
    title: notification.title && notification.title.toLowerCase().includes('esewa')
      ? 'eSewa payment successful'
      : 'Payment successful',
    message: `Your payment of ${amount} for ${carName} is complete. Your booking is confirmed.`,
  };
};

const normalizeNotificationsForUser = (notifications, user) =>
  notifications
    .map(notification => normalizePaymentNotificationForRole(notification, user))
    .filter(Boolean);

exports.getMyNotifications = async (req, res, next) => {
  try {
    const notifications = normalizeNotificationsForUser(
      await Notification.findByUser(req.user.id),
      req.user
    );
    const unread = await Notification.unreadCount(req.user.id);
    res.json({ success: true, count: notifications.length, unread, notifications });
  } catch (error) {
    next(error);
  }
};

exports.markMyNotificationsRead = async (req, res, next) => {
  try {
    await Notification.markAllRead(req.user.id);
    res.json({ success: true, message: 'Notifications marked as read' });
  } catch (error) {
    next(error);
  }
};
