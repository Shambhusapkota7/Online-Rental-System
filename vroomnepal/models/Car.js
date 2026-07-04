const db = require('../config/db');
const demoStore = require('../config/demoStore');

const Car = {
  async findAll(availableOnly = false, vendorId = null) {
    if (db.isDemo) {
      const store = await demoStore.ensureReady();
      return store.cars.filter(car =>
        (!availableOnly || car.availability) &&
        (!vendorId || Number(car.vendor_id) === Number(vendorId))
      );
    }

    const where = [];
    const params = [];

    if (availableOnly) where.push('c.availability = TRUE');
    if (vendorId) {
      where.push('c.vendor_id = ?');
      params.push(vendorId);
    }

    const sql = `
      SELECT c.*, u.name AS vendor_name, u.email AS vendor_email
      FROM cars c
      LEFT JOIN users u ON u.id = c.vendor_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY c.created_at DESC
    `;
    const [rows] = await db.execute(sql, params);
    return rows;
  },

  async findById(id) {
    if (db.isDemo) {
      const store = await demoStore.ensureReady();
      return store.cars.find(car => Number(car.id) === Number(id)) || null;
    }

    const [rows] = await db.execute(
      `SELECT c.*, u.name AS vendor_name, u.email AS vendor_email
       FROM cars c
       LEFT JOIN users u ON u.id = c.vendor_id
       WHERE c.id = ? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  async create({ name, brand, model, year, price_per_day, availability = true, image, vendor_id = null }) {
    if (db.isDemo) {
      const store = await demoStore.ensureReady();
      const vendor = store.users.find(user => Number(user.id) === Number(vendor_id));
      const car = {
        id: store.counters.car++,
        name,
        brand,
        model,
        year,
        price_per_day,
        availability: availability === false ? 0 : 1,
        image: image || null,
        vendor_id,
        vendor_name: vendor?.name || null,
        vendor_email: vendor?.email || null,
        created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      };
      store.cars.unshift(car);
      return car.id;
    }

    const [result] = await db.execute(
      `INSERT INTO cars (name, brand, model, year, price_per_day, availability, image, vendor_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, brand, model, year, price_per_day, availability, image || null, vendor_id]
    );
    return result.insertId;
  },

  async update(id, fields) {
    const allowed = ['name', 'brand', 'model', 'year', 'price_per_day', 'availability', 'image', 'vendor_id'];
    const keys = Object.keys(fields).filter(k => allowed.includes(k));

    if (keys.length === 0) return false;

    if (db.isDemo) {
      const store = await demoStore.ensureReady();
      const car = store.cars.find(item => Number(item.id) === Number(id));
      if (!car) return false;
      keys.forEach(key => {
        car[key] = fields[key];
      });
      return true;
    }

    const setParts = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => fields[k]);
    values.push(id);

    const [result] = await db.execute(
      `UPDATE cars SET ${setParts} WHERE id = ?`,
      values
    );
    return result.affectedRows > 0;
  },

  async delete(id) {
    if (db.isDemo) {
      const store = await demoStore.ensureReady();
      const before = store.cars.length;
      store.cars = store.cars.filter(car => Number(car.id) !== Number(id));
      return store.cars.length !== before;
    }

    const [result] = await db.execute(
      'DELETE FROM cars WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  },
};

module.exports = Car;
