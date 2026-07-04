'use strict';

const db = require('../config/db');
const demoStore = require('../config/demoStore');

const nowPlusMinutes = (minutes) => new Date(Date.now() + minutes * 60 * 1000);

const PasswordOtp = {
  // Remove any previous unused/used OTPs for this email, then insert a fresh one.
  async createForEmail(email, otp, expiresInMinutes = 10) {
    if (db.isDemo) {
      const store = await demoStore.ensureReady();
      store.passwordOtps = store.passwordOtps.filter(record => record.email !== email);
      const record = {
        id: store.counters.passwordOtp++,
        email,
        otp,
        used: false,
        expires_at: nowPlusMinutes(expiresInMinutes),
        created_at: new Date(),
      };
      store.passwordOtps.push(record);
      return record;
    }

    await db.execute('DELETE FROM password_otps WHERE email = ?', [email]);
    await db.execute(
      'INSERT INTO password_otps (email, otp, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))',
      [email, otp, expiresInMinutes]
    );
    return { email, otp };
  },

  // Find the most recent unused OTP matching email + otp, along with whether it has expired.
  async findValid(email, otp) {
    if (db.isDemo) {
      const store = await demoStore.ensureReady();
      const matches = store.passwordOtps
        .filter(record => record.email === email && record.otp === otp && !record.used)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const record = matches[0];
      if (!record) return null;
      return { ...record, expired: new Date(record.expires_at) <= new Date() };
    }

    const [rows] = await db.execute(
      'SELECT *, expires_at <= NOW() AS expired FROM password_otps WHERE email = ? AND otp = ? AND used = FALSE ORDER BY created_at DESC LIMIT 1',
      [email, otp]
    );
    if (rows.length === 0) return null;
    return { ...rows[0], expired: !!rows[0].expired };
  },

  async markUsed(id) {
    if (db.isDemo) {
      const store = await demoStore.ensureReady();
      const record = store.passwordOtps.find(item => Number(item.id) === Number(id));
      if (record) record.used = true;
      return;
    }

    await db.execute('UPDATE password_otps SET used = TRUE WHERE id = ?', [id]);
  },
};

module.exports = PasswordOtp;
