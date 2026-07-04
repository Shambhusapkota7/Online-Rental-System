const db = require('../config/db');
const demoStore = require('../config/demoStore');

const Notification = {
  async create({ user_id, type = 'info', title, message, booking_id = null, car_id = null }) {
    if (!user_id) return null;

    if (db.isDemo) {
      const store = await demoStore.ensureReady();
      const notification = {
        id: store.counters.notification++,
        user_id,
        type,
        title,
        message,
        booking_id,
        car_id,
        is_read: false,
        created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      };
      store.notifications.unshift(notification);
      return notification.id;
    }

    const [result] = await db.execute(
      `INSERT INTO notifications (user_id, type, title, message, booking_id, car_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user_id, type, title, message, booking_id, car_id]
    );
    return result.insertId;
  },

  async findByUser(userId) {
    if (db.isDemo) {
      const store = await demoStore.ensureReady();
      return store.notifications
        .filter(notification => Number(notification.user_id) === Number(userId))
        .slice(0, 50);
    }

    const [rows] = await db.execute(
      `SELECT n.*, b.status AS booking_status, b.user_id AS booking_user_id,
              c.name AS car_name, c.vendor_id AS booking_vendor_id
       FROM notifications n
       LEFT JOIN bookings b ON b.id = n.booking_id
       LEFT JOIN cars c ON c.id = n.car_id
       WHERE n.user_id = ?
       ORDER BY n.created_at DESC
       LIMIT 50`,
      [userId]
    );
    return rows;
  },

  async unreadCount(userId) {
    if (db.isDemo) {
      const store = await demoStore.ensureReady();
      return store.notifications.filter(notification =>
        Number(notification.user_id) === Number(userId) && !notification.is_read
      ).length;
    }

    const [rows] = await db.execute(
      'SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );
    return rows[0]?.count || 0;
  },

  async markAllRead(userId) {
    if (db.isDemo) {
      const store = await demoStore.ensureReady();
      let count = 0;
      store.notifications.forEach(notification => {
        if (Number(notification.user_id) === Number(userId) && !notification.is_read) {
          notification.is_read = true;
          count += 1;
        }
      });
      return count;
    }

    const [result] = await db.execute(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = ?',
      [userId]
    );
    return result.affectedRows;
  },
};

module.exports = Notification;
