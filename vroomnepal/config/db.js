'use strict';

require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'car_rental_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
});
pool.isDemo = false;

const schemaName = process.env.DB_NAME || 'car_rental_db';

const columnExists = async (table, column) => {
  const [rows] = await pool.execute(
    `SELECT COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [schemaName, table, column]
  );
  return rows.length > 0;
};

const ensureEsewaTransactionColumn = async () => {
  if (!(await columnExists('payments', 'transaction_uuid'))) {
    await pool.execute(
      `ALTER TABLE payments
       ADD COLUMN transaction_uuid VARCHAR(255) DEFAULT NULL AFTER payment_status`
    );
    console.log('Added missing payments.transaction_uuid column');
  }
};

const ensurePasswordOtpTable = async () => {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS password_otps (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(150) NOT NULL,
      otp VARCHAR(6) NOT NULL,
      used BOOLEAN NOT NULL DEFAULT FALSE,
      expires_at DATETIME NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_password_otps_email (email),
      INDEX idx_password_otps_lookup (email, otp, used)
    ) ENGINE=InnoDB
      DEFAULT CHARSET=utf8mb4
      COLLATE=utf8mb4_unicode_ci
  `);
};

const ensureUserRoleEnum = async () => {
  const [rows] = await pool.execute(
    `SELECT COLUMN_TYPE
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'users'
       AND COLUMN_NAME = 'role'`,
    [schemaName]
  );

  if (rows.length > 0 && !String(rows[0].COLUMN_TYPE).includes("'vendor'")) {
    await pool.execute(
      `ALTER TABLE users
       MODIFY role ENUM('user','vendor','admin') NOT NULL DEFAULT 'user'`
    );
    console.log('Updated users.role enum to include vendor');
  }
};

const ensureCarsVendorColumn = async () => {
  if (!(await columnExists('cars', 'vendor_id'))) {
    await pool.execute(
      `ALTER TABLE cars
       ADD COLUMN vendor_id INT UNSIGNED DEFAULT NULL AFTER image,
       ADD INDEX idx_cars_vendor (vendor_id)`
    );
    console.log('Added cars.vendor_id column');
  }
};

const ensureBookingTimeColumns = async () => {
  if (!(await columnExists('bookings', 'pickup_time'))) {
    await pool.execute(
      `ALTER TABLE bookings
       ADD COLUMN pickup_time TIME DEFAULT NULL AFTER end_date`
    );
    console.log('Added bookings.pickup_time column');
  }

  if (!(await columnExists('bookings', 'dropoff_time'))) {
    await pool.execute(
      `ALTER TABLE bookings
       ADD COLUMN dropoff_time TIME DEFAULT NULL AFTER pickup_time`
    );
    console.log('Added bookings.dropoff_time column');
  }
};

const ensureNotificationsTable = async () => {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL,
      type VARCHAR(50) NOT NULL DEFAULT 'info',
      title VARCHAR(150) NOT NULL,
      message VARCHAR(500) NOT NULL,
      booking_id INT UNSIGNED DEFAULT NULL,
      car_id INT UNSIGNED DEFAULT NULL,
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_notifications_user_read (user_id, is_read),
      INDEX idx_notifications_created (created_at),
      CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_notification_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
      CONSTRAINT fk_notification_car FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE SET NULL
    ) ENGINE=InnoDB
      DEFAULT CHARSET=utf8mb4
      COLLATE=utf8mb4_unicode_ci
  `);
};

const ensureVendorDocumentsTable = async () => {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS vendor_documents (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      vendor_id INT UNSIGNED NOT NULL,
      document_type ENUM('national_id','driving_license','business_license') NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      file_type VARCHAR(120) DEFAULT NULL,
      file_size INT UNSIGNED DEFAULT NULL,
      file_data MEDIUMTEXT DEFAULT NULL,
      status ENUM('missing','pending','verified','rejected') NOT NULL DEFAULT 'pending',
      rejection_reason VARCHAR(500) DEFAULT NULL,
      reviewed_at DATETIME DEFAULT NULL,
      uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_vendor_document_user FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY uniq_vendor_document_type (vendor_id, document_type),
      INDEX idx_vendor_documents_status (status)
    ) ENGINE=InnoDB
      DEFAULT CHARSET=utf8mb4
      COLLATE=utf8mb4_unicode_ci
  `);

  if (!(await columnExists('vendor_documents', 'file_data'))) {
    await pool.execute(
      `ALTER TABLE vendor_documents
       ADD COLUMN file_data MEDIUMTEXT DEFAULT NULL AFTER file_size`
    );
    console.log('Added vendor_documents.file_data column');
  }
};

const seedDefaultVehicles = async () => {
  const vehicles = [
    ['Mercedes AMG GT-R', 'Mercedes', 'AMG GT-R', 2024, 28000.00, 'image/car.img.jpg'],
    ['Porsche 911 GT3', 'Porsche', '911 GT3', 2024, 32000.00, 'image/GT3.jpg'],
    ['Porsche Carrera S', 'Porsche', 'Carrera S', 2023, 26000.00, 'veh%20section/Porsche.jpg'],
    ['Lamborghini Huracan Evo', 'Lamborghini', 'Huracan Evo', 2024, 45000.00, 'veh%20section/car4.jpg'],
    ['Ferrari Roma', 'Ferrari', 'Roma', 2024, 42000.00, 'veh%20section/spencer.jpg'],
    ['McLaren 720S', 'McLaren', '720S', 2024, 48000.00, 'veh%20section/panyukov.jpg'],
    ['Aether Velocity', 'Aether', 'Velocity', 2025, 12500.00, 'veh%20section/Aether%20velocity.jpg'],
    ['Ignis Spider', 'Ignis', 'Spider', 2025, 14000.00, 'veh%20section/Ignis%20Spider.jpg'],
    ['Zenith Spectre', 'Zenith', 'Spectre', 2025, 15500.00, 'veh%20section/Zenith%20Spectre.jpg'],
    ['Urban Compact', 'Urban', 'Compact', 2022, 3500.00, 'veh%20section/car1.webp'],
    ['Everest SUV', 'Everest', 'SUV', 2023, 9500.00, 'veh%20section/car3.jpg'],
    ['Duke 200', 'KTM', 'Duke 200', 2024, 2200.00, 'image/bike.img.jpg'],
    ['Falcon Sportbike', 'Falcon', 'Sportbike', 2024, 3000.00, 'image/sportbike.png'],
    ['Vespa ZX 125', 'Vespa', 'ZX 125', 2024, 1200.00, 'image/scooter.img.jpg'],
    ['F-150 Lightning Truck', 'Ford', 'F-150 Lightning', 2024, 8500.00, 'image/truck.img.jpg'],
    ['Cargo Delivery Van', 'Cargo', 'Delivery Van', 2023, 12000.00, 'image/delivery-van.png'],
    ['70HP 4WD Tractor', 'AgroMax', '70HP 4WD', 2024, 7000.00, 'image/tractor.img.jpg'],
    ['Grove GHC30 Crane', 'Grove', 'GHC30', 2024, 55000.00, 'image/crane.img.jpg'],
    ['Crane Truck', 'Hydra', 'Crane Truck', 2023, 65000.00, 'image/crane-truck.png'],
    ['Deluxe Night Bus', 'Volvo', '7900 Electric', 2024, 15000.00, 'image/bus.img.jpg'],
    ['JCB Bull Dozer', 'JCB', '3DXL PLUS', 2024, 18000.00, 'image/jcb.img.jpg'],
  ];

  for (const [name, brand, model, year, price, image] of vehicles) {
    await pool.execute(
      `INSERT INTO cars (name, brand, model, year, price_per_day, availability, image)
       SELECT ?, ?, ?, ?, ?, TRUE, ?
       WHERE NOT EXISTS (SELECT 1 FROM cars WHERE name = ?)`,
      [name, brand, model, year, price, image, name]
    );
    await pool.execute(
      `UPDATE cars
       SET brand = ?, model = ?, year = ?, price_per_day = ?, image = COALESCE(NULLIF(image, ''), ?)
       WHERE name = ? AND vendor_id IS NULL`,
      [brand, model, year, price, image, name]
    );
  }

  const legacyFixes = [
    ['Toyota Corolla', 'Toyota', 'Corolla', 2022, 4000.00, 'veh%20section/car1.webp', 'Toyota Corolla'],
    ['Toyota Corolla Altis', 'Toyota', 'Corolla Altis', 2022, 4500.00, 'veh%20section/car1.webp', 'Toyota Corolla', 2],
    ['Hyundai i20', 'Hyundai', 'i20', 2024, 3500.00, 'veh%20section/car2.webp', 'eSewa Car'],
    ['Kia Rio', 'Kia', 'Rio', 2024, 3500.00, 'veh%20section/car3.jpg', 'eSewa Fixed Car'],
    ['Vendor Compact Car', 'Vendor', 'Compact', 2023, 3500.00, 'veh%20section/car1.webp', 'sdgsdg'],
  ];

  for (const [name, brand, model, year, price, image, oldName, id] of legacyFixes) {
    const whereClause = id ? 'id = ?' : 'name = ?';
    const params = [name, brand, model, year, price, image, id || oldName];
    await pool.execute(
      `UPDATE cars
       SET name = ?, brand = ?, model = ?, year = ?, price_per_day = ?, image = COALESCE(NULLIF(image, ''), ?)
       WHERE ${whereClause}`,
      params
    );
  }
};

const ensureDefaultAdminPassword = async () => {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@carrental.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
  const [rows] = await pool.execute(
    'SELECT id, password FROM users WHERE email = ? LIMIT 1',
    [adminEmail]
  );

  if (rows.length === 0) return;

  const passwordMatches = await bcrypt.compare(adminPassword, rows[0].password);
  if (passwordMatches) return;

  const hashedPassword = await bcrypt.hash(adminPassword, 12);
  await pool.execute('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, rows[0].id]);
  console.log('Updated default admin password hash');
};

(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('MySQL connected successfully');
    connection.release();
    await ensureUserRoleEnum();
    await ensureCarsVendorColumn();
    await ensureBookingTimeColumns();
    await ensureEsewaTransactionColumn();
    await ensurePasswordOtpTable();
    await ensureNotificationsTable();
    await ensureVendorDocumentsTable();
    await ensureDefaultAdminPassword();
    await seedDefaultVehicles();
  } catch (error) {
    console.error('MySQL connection failed:', error.message);
    console.error('Using in-memory demo data so the website can still be showcased.');
    pool.isDemo = true;
  }
})();

module.exports = pool;
