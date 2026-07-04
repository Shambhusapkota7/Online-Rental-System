const db = require('../config/db');
const demoStore = require('../config/demoStore');

const Payment = {
  async create({ booking_id, amount, payment_method = 'cash', payment_status = 'pending' }) {
    if (db.isDemo) {
      const store = await demoStore.ensureReady();
      const payment = {
        id: store.counters.payment++,
        booking_id,
        amount,
        payment_method,
        payment_status,
        transaction_uuid: null,
        created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      };
      store.payments.unshift(payment);
      return payment.id;
    }

    const [result] = await db.execute(
      `INSERT INTO payments (booking_id, amount, payment_method, payment_status)
       VALUES (?, ?, ?, ?)`,
      [booking_id, amount, payment_method, payment_status]
    );
    return result.insertId;
  },

  async findByBookingId(bookingId) {
    if (db.isDemo) {
      const store = await demoStore.ensureReady();
      return store.payments.find(payment => Number(payment.booking_id) === Number(bookingId)) || null;
    }

    const [rows] = await db.execute(
      'SELECT * FROM payments WHERE booking_id = ? LIMIT 1',
      [bookingId]
    );
    return rows[0] || null;
  },

  async findById(id) {
    if (db.isDemo) {
      const store = await demoStore.ensureReady();
      return store.payments.find(payment => Number(payment.id) === Number(id)) || null;
    }

    const [rows] = await db.execute(
      'SELECT * FROM payments WHERE id = ? LIMIT 1',
      [id]
    );
    return rows[0] || null;
  },

  async findByTransactionUuid(transactionUuid) {
    if (db.isDemo) {
      const store = await demoStore.ensureReady();
      return store.payments.find(payment => payment.transaction_uuid === transactionUuid) || null;
    }

    const [rows] = await db.execute(
      'SELECT * FROM payments WHERE transaction_uuid = ? LIMIT 1',
      [transactionUuid]
    );
    return rows[0] || null;
  },

  async findByTransactionUuid(transactionUuid) {
    if (db.isDemo) {
      const store = await demoStore.ensureReady();
      return store.payments.find(payment => payment.transaction_uuid === transactionUuid) || null;
    }

    const [rows] = await db.execute(
      'SELECT * FROM payments WHERE transaction_uuid = ? LIMIT 1',
      [transactionUuid]
    );
    return rows[0] || null;
  },

  async updateStatusByTransactionUuid(transactionUuid, payment_status) {
    if (db.isDemo) {
      const store = await demoStore.ensureReady();
      const payment = store.payments.find(item => item.transaction_uuid === transactionUuid);
      if (!payment) return false;
      payment.payment_status = payment_status;
      return true;
    }

    const [result] = await db.execute(
      'UPDATE payments SET payment_status = ? WHERE transaction_uuid = ?',
      [payment_status, transactionUuid]
    );
    return result.affectedRows > 0;
  },

  async updateStatus(id, payment_status) {
    if (db.isDemo) {
      const store = await demoStore.ensureReady();
      const payment = store.payments.find(item => Number(item.id) === Number(id));
      if (!payment) return false;
      payment.payment_status = payment_status;
      return true;
    }

    const [result] = await db.execute(
      'UPDATE payments SET payment_status = ? WHERE id = ?',
      [payment_status, id]
    );
    return result.affectedRows > 0;
  },

  async updateForBooking(bookingId, fields) {
    const allowed = ['amount', 'payment_method', 'payment_status', 'transaction_uuid'];
    const keys = Object.keys(fields).filter(key => allowed.includes(key));
    if (keys.length === 0) return false;

    if (db.isDemo) {
      const store = await demoStore.ensureReady();
      const payment = store.payments.find(item => Number(item.booking_id) === Number(bookingId));
      if (!payment) return false;
      keys.forEach(key => {
        payment[key] = fields[key];
      });
      return true;
    }

    const setParts = keys.map(key => `${key} = ?`).join(', ');
    const values = keys.map(key => fields[key]);
    values.push(bookingId);

    const [result] = await db.execute(
      `UPDATE payments SET ${setParts} WHERE booking_id = ?`,
      values
    );
    return result.affectedRows > 0;
  },
};

module.exports = Payment;
