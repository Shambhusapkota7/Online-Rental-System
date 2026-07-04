const db = require('../config/db');
const demoStore = require('../config/demoStore');

const withBookingDetails = (booking, store) => {
  const car = store.cars.find(item => Number(item.id) === Number(booking.car_id)) || {};
  const user = store.users.find(item => Number(item.id) === Number(booking.user_id)) || {};
  const vendor = store.users.find(item => Number(item.id) === Number(car.vendor_id)) || {};
  return {
    ...booking,
    user_name: user.name,
    email: user.email,
    price_per_day: car.price_per_day,
    car_name: car.name,
    brand: car.brand,
    model: car.model,
    image: car.image,
    vendor_id: car.vendor_id,
    vendor_name: vendor.name || null,
    vendor_email: vendor.email || null,
  };
};

const Booking = {
  async isCarBooked(carId, startDate, endDate, excludeBookingId = null) {
    if (db.isDemo) {
      const store = await demoStore.ensureReady();
      return store.bookings.some(booking =>
        Number(booking.car_id) === Number(carId) &&
        (!excludeBookingId || Number(booking.id) !== Number(excludeBookingId)) &&
        ['pending', 'confirmed'].includes(booking.status) &&
        booking.start_date < endDate &&
        booking.end_date > startDate
      );
    }

    let sql = `
      SELECT COUNT(*) AS cnt
      FROM   bookings
      WHERE  car_id = ?
        AND  status IN ('pending', 'confirmed')
        AND  start_date < ?
        AND  end_date > ?
    `;
    const params = [carId, endDate, startDate];

    if (excludeBookingId) {
      sql += ' AND id != ?';
      params.push(excludeBookingId);
    }

    const [rows] = await db.execute(sql, params);
    return rows[0].cnt > 0;
  },

  calcTotalPrice(startDate, endDate, pricePerDay) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    if (days < 1) throw new Error('end_date must be after start_date');
    const base = days * pricePerDay;
    const serviceFee = Math.max(250, Math.round(base * 0.03));
    const insurance = Math.max(500, Math.round(base * 0.05));
    return +(base + serviceFee + insurance).toFixed(2);
  },

  async create({ user_id, car_id, start_date, end_date, pickup_time = null, dropoff_time = null, total_price }) {
    if (db.isDemo) {
      const store = await demoStore.ensureReady();
      const booking = {
        id: store.counters.booking++,
        user_id,
        car_id,
        start_date,
        end_date,
        pickup_time,
        dropoff_time,
        total_price,
        status: 'pending',
        created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      };
      store.bookings.unshift(booking);
      return booking.id;
    }

    const [result] = await db.execute(
      `INSERT INTO bookings (user_id, car_id, start_date, end_date, pickup_time, dropoff_time, total_price)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user_id, car_id, start_date, end_date, pickup_time, dropoff_time, total_price]
    );
    return result.insertId;
  },

  async findByUser(userId) {
    if (db.isDemo) {
      const store = await demoStore.ensureReady();
      return store.bookings
        .filter(booking => Number(booking.user_id) === Number(userId))
        .map(booking => withBookingDetails(booking, store));
    }

    const [rows] = await db.execute(
      `SELECT b.*, DATE_FORMAT(b.start_date, '%Y-%m-%d') AS start_date,
              DATE_FORMAT(b.end_date, '%Y-%m-%d') AS end_date,
              c.name AS car_name, c.brand, c.model, c.image, c.vendor_id,
              v.name AS vendor_name, v.email AS vendor_email
       FROM   bookings b
       JOIN   cars     c ON c.id = b.car_id
       LEFT JOIN users v ON v.id = c.vendor_id
       WHERE  b.user_id = ?
       ORDER BY b.created_at DESC`,
      [userId]
    );
    return rows;
  },

  async findAll() {
    if (db.isDemo) {
      const store = await demoStore.ensureReady();
      return store.bookings.map(booking => withBookingDetails(booking, store));
    }

    const [rows] = await db.execute(
      `SELECT b.*, DATE_FORMAT(b.start_date, '%Y-%m-%d') AS start_date,
              DATE_FORMAT(b.end_date, '%Y-%m-%d') AS end_date,
              u.name AS user_name, u.email,
              c.name AS car_name, c.brand, c.model, c.image, c.vendor_id,
              v.name AS vendor_name, v.email AS vendor_email
       FROM   bookings b
       JOIN   users u ON u.id = b.user_id
       JOIN   cars  c ON c.id = b.car_id
       LEFT JOIN users v ON v.id = c.vendor_id
       ORDER BY b.created_at DESC`
    );
    return rows;
  },

  async findByVendor(vendorId) {
    if (db.isDemo) {
      const store = await demoStore.ensureReady();
      return store.bookings
        .map(booking => withBookingDetails(booking, store))
        .filter(booking => Number(booking.vendor_id) === Number(vendorId));
    }

    const [rows] = await db.execute(
      `SELECT b.*, DATE_FORMAT(b.start_date, '%Y-%m-%d') AS start_date,
              DATE_FORMAT(b.end_date, '%Y-%m-%d') AS end_date,
              u.name AS user_name, u.email,
              c.name AS car_name, c.brand, c.model, c.image, c.vendor_id,
              v.name AS vendor_name, v.email AS vendor_email
       FROM   bookings b
       JOIN   users u ON u.id = b.user_id
       JOIN   cars  c ON c.id = b.car_id
       LEFT JOIN users v ON v.id = c.vendor_id
       WHERE  c.vendor_id = ?
       ORDER BY b.created_at DESC`,
      [vendorId]
    );
    return rows;
  },

  async findById(id) {
    if (db.isDemo) {
      const store = await demoStore.ensureReady();
      const booking = store.bookings.find(item => Number(item.id) === Number(id));
      return booking ? withBookingDetails(booking, store) : null;
    }

    const [rows] = await db.execute(
      `SELECT b.*, DATE_FORMAT(b.start_date, '%Y-%m-%d') AS start_date,
              DATE_FORMAT(b.end_date, '%Y-%m-%d') AS end_date,
              u.name AS user_name, u.email,
              c.price_per_day, c.name AS car_name, c.brand, c.model, c.image, c.vendor_id,
              v.name AS vendor_name, v.email AS vendor_email
       FROM   bookings b
       JOIN   users u ON u.id = b.user_id
       JOIN   cars  c ON c.id = b.car_id
       LEFT JOIN users v ON v.id = c.vendor_id
       WHERE  b.id = ? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  async updateStatus(id, status) {
    if (db.isDemo) {
      const store = await demoStore.ensureReady();
      const booking = store.bookings.find(item => Number(item.id) === Number(id));
      if (!booking) return false;
      booking.status = status;
      return true;
    }

    const [result] = await db.execute(
      'UPDATE bookings SET status = ? WHERE id = ?',
      [status, id]
    );
    return result.affectedRows > 0;
  },
};

module.exports = Booking;
