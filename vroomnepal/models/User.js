'use strict';

const bcrypt = require('bcryptjs');
const db = require('../config/db');
const demoStore = require('../config/demoStore');

const SALT_ROUNDS = 12;
const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const normalizePhone = (phone) => {
  const cleaned = String(phone || '').replace(/[^\d+]/g, '');
  return cleaned || null;
};

const User = {
  async findByEmail(email) {
    if (db.isDemo) {
      const store = await demoStore.ensureReady();
      return store.users.find(user => user.email === normalizeEmail(email)) || null;
    }

    const [rows] = await db.execute('SELECT * FROM users WHERE email = ? LIMIT 1', [normalizeEmail(email)]);
    return rows[0] || null;
  },

  async findByPhone(phone) {
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) return null;

    if (db.isDemo) {
      const store = await demoStore.ensureReady();
      return store.users.find(user => user.phone === normalizedPhone) || null;
    }

    const [rows] = await db.execute('SELECT * FROM users WHERE phone = ? LIMIT 1', [normalizedPhone]);
    return rows[0] || null;
  },

  async findByCredential(identifier) {
    const credential = String(identifier || '').trim();
    if (credential.includes('@')) {
      return this.findByEmail(identifier);
    }
    return this.findByPhone(credential);
  },

  async findById(id) {
    if (db.isDemo) {
      const store = await demoStore.ensureReady();
      const user = store.users.find(item => Number(item.id) === Number(id));
      if (!user) return null;
      const { password: _password, ...safeUser } = user;
      return safeUser;
    }

    const [rows] = await db.execute(
      'SELECT id, name, email, phone, role, created_at FROM users WHERE id = ? LIMIT 1',
      [id]
    );
    return rows[0] || null;
  },

  async create({ name, email, password, phone = null, role = 'user' }) {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    if (db.isDemo) {
      const store = await demoStore.ensureReady();
      const user = {
        id: store.counters.user++,
        name: String(name || '').trim(),
        email: normalizeEmail(email),
        password: hashedPassword,
        phone: normalizePhone(phone),
        role,
        created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      };
      store.users.push(user);
      return user.id;
    }

    const [result] = await db.execute(
      'INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)',
      [String(name || '').trim(), normalizeEmail(email), hashedPassword, normalizePhone(phone), role]
    );
    return result.insertId;
  },

  async comparePassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  },

  // NEW: update password by email
  async updatePassword(email, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    if (db.isDemo) {
      const store = await demoStore.ensureReady();
      const user = store.users.find(item => item.email === normalizeEmail(email));
      if (user) user.password = hashedPassword;
      return;
    }

    await db.execute('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, normalizeEmail(email)]);
  },

  async updateProfile(userId, { name, phone }) {
    if (db.isDemo) {
      const store = await demoStore.ensureReady();
      const user = store.users.find(item => Number(item.id) === Number(userId));
      if (!user) return null;
      if (name !== undefined) user.name = name;
      if (phone !== undefined) user.phone = phone;
      const { password: _password, ...safeUser } = user;
      return safeUser;
    }

    await db.execute('UPDATE users SET name = ?, phone = ? WHERE id = ?', [name, phone, userId]);
    const [rows] = await db.execute(
      'SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?',
      [userId]
    );
    return rows[0] || null;
  },

  async list() {
    if (db.isDemo) {
      const store = await demoStore.ensureReady();
      return store.users
        .map(({ password: _password, ...safeUser }) => safeUser)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    const [rows] = await db.execute(
      'SELECT id, name, email, phone, role, created_at FROM users ORDER BY created_at DESC'
    );
    return rows;
  },

  normalizePhone,
};

module.exports = User;
