-- ============================================================
--  Car Rental DB — Schema for XAMPP (MySQL/MariaDB)
--  HOW TO RUN:
--    1. Open your browser and go to: http://localhost/phpmyadmin
--    2. Click the "SQL" tab
--    3. Paste this entire script and click "Go"
--  OR use the Import tab to import this .sql file directly.
-- ============================================================

CREATE DATABASE IF NOT EXISTS car_rental_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE car_rental_db;

-- ── USERS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100)         NOT NULL,
  email       VARCHAR(150)         NOT NULL UNIQUE,
  password    VARCHAR(255)         NOT NULL,
  phone       VARCHAR(20)          DEFAULT NULL UNIQUE,
  role        ENUM('user','vendor','admin') NOT NULL DEFAULT 'user',
  created_at  TIMESTAMP            NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ── CARS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cars (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(150)  NOT NULL,
  brand         VARCHAR(100)  NOT NULL,
  model         VARCHAR(100)  NOT NULL,
  year          YEAR          NOT NULL,
  price_per_day DECIMAL(10,2) NOT NULL,
  availability  BOOLEAN       NOT NULL DEFAULT TRUE,
  image         VARCHAR(500)  DEFAULT NULL,
  vendor_id     INT UNSIGNED  DEFAULT NULL,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_car_vendor FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_cars_vendor (vendor_id)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ── BOOKINGS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED  NOT NULL,
  car_id      INT UNSIGNED  NOT NULL,
  start_date  DATE          NOT NULL,
  end_date    DATE          NOT NULL,
  pickup_time TIME          DEFAULT NULL,
  dropoff_time TIME         DEFAULT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  status      ENUM('pending','confirmed','cancelled','completed')
              NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_booking_user FOREIGN KEY (user_id) REFERENCES users(id)  ON DELETE CASCADE,
  CONSTRAINT fk_booking_car  FOREIGN KEY (car_id)  REFERENCES cars(id)   ON DELETE CASCADE,
  INDEX idx_car_dates (car_id, start_date, end_date),
  INDEX idx_user      (user_id)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ── PAYMENTS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  booking_id     INT UNSIGNED  NOT NULL UNIQUE,
  amount         DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50)   NOT NULL DEFAULT 'cash',
  payment_status ENUM('pending','completed','failed','refunded')
                 NOT NULL DEFAULT 'pending',
  transaction_uuid VARCHAR(255) DEFAULT NULL,
  created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_payment_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- PASSWORD RESET OTPS
CREATE TABLE IF NOT EXISTS password_otps (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email      VARCHAR(150) NOT NULL,
  otp        VARCHAR(6)   NOT NULL,
  used       BOOLEAN      NOT NULL DEFAULT FALSE,
  expires_at DATETIME     NOT NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_password_otps_email (email),
  INDEX idx_password_otps_lookup (email, otp, used)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  type       VARCHAR(50)  NOT NULL DEFAULT 'info',
  title      VARCHAR(150) NOT NULL,
  message    VARCHAR(500) NOT NULL,
  booking_id INT UNSIGNED DEFAULT NULL,
  car_id     INT UNSIGNED DEFAULT NULL,
  is_read    BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_notification_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
  CONSTRAINT fk_notification_car FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE SET NULL,
  INDEX idx_notifications_user_read (user_id, is_read),
  INDEX idx_notifications_created (created_at)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- VENDOR VERIFICATION DOCUMENTS
CREATE TABLE IF NOT EXISTS vendor_documents (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vendor_id        INT UNSIGNED NOT NULL,
  document_type    ENUM('national_id','driving_license','business_license') NOT NULL,
  file_name        VARCHAR(255) NOT NULL,
  file_type        VARCHAR(120) DEFAULT NULL,
  file_size        INT UNSIGNED DEFAULT NULL,
  file_data        MEDIUMTEXT DEFAULT NULL,
  status           ENUM('missing','pending','verified','rejected') NOT NULL DEFAULT 'pending',
  rejection_reason VARCHAR(500) DEFAULT NULL,
  reviewed_at      DATETIME DEFAULT NULL,
  uploaded_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_vendor_document_user FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_vendor_document_type (vendor_id, document_type),
  INDEX idx_vendor_documents_status (status)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ── SEED: Default admin account (password = "Admin@123") ─────
INSERT IGNORE INTO users (name, email, password, phone, role)
VALUES (
  'Admin',
  'admin@carrental.com',
  '$2a$12$trgJYC8b1jAo88cxes2pIOrzFbcC8O2963525ynLdcNEklzBmT7B.',
  '0000000000',
  'admin'
);

-- VEHICLE SEED DATA
INSERT INTO cars (name, brand, model, year, price_per_day, availability, image)
SELECT 'Mercedes AMG GT-R', 'Mercedes', 'AMG GT-R', 2024, 28000.00, TRUE, 'image/car.img.jpg'
WHERE NOT EXISTS (SELECT 1 FROM cars WHERE name = 'Mercedes AMG GT-R');

INSERT INTO cars (name, brand, model, year, price_per_day, availability, image)
SELECT 'Porsche 911 GT3', 'Porsche', '911 GT3', 2024, 32000.00, TRUE, 'image/GT3.jpg'
WHERE NOT EXISTS (SELECT 1 FROM cars WHERE name = 'Porsche 911 GT3');

INSERT INTO cars (name, brand, model, year, price_per_day, availability, image)
SELECT 'Porsche Carrera S', 'Porsche', 'Carrera S', 2023, 26000.00, TRUE, 'veh%20section/Porsche.jpg'
WHERE NOT EXISTS (SELECT 1 FROM cars WHERE name = 'Porsche Carrera S');

INSERT INTO cars (name, brand, model, year, price_per_day, availability, image)
SELECT 'Lamborghini Huracan Evo', 'Lamborghini', 'Huracan Evo', 2024, 45000.00, TRUE, 'veh%20section/car4.jpg'
WHERE NOT EXISTS (SELECT 1 FROM cars WHERE name = 'Lamborghini Huracan Evo');

INSERT INTO cars (name, brand, model, year, price_per_day, availability, image)
SELECT 'Ferrari Roma', 'Ferrari', 'Roma', 2024, 42000.00, TRUE, 'veh%20section/spencer.jpg'
WHERE NOT EXISTS (SELECT 1 FROM cars WHERE name = 'Ferrari Roma');

INSERT INTO cars (name, brand, model, year, price_per_day, availability, image)
SELECT 'McLaren 720S', 'McLaren', '720S', 2024, 48000.00, TRUE, 'veh%20section/panyukov.jpg'
WHERE NOT EXISTS (SELECT 1 FROM cars WHERE name = 'McLaren 720S');

INSERT INTO cars (name, brand, model, year, price_per_day, availability, image)
SELECT 'Aether Velocity', 'Aether', 'Velocity', 2025, 12500.00, TRUE, 'veh%20section/Aether%20velocity.jpg'
WHERE NOT EXISTS (SELECT 1 FROM cars WHERE name = 'Aether Velocity');

INSERT INTO cars (name, brand, model, year, price_per_day, availability, image)
SELECT 'Ignis Spider', 'Ignis', 'Spider', 2025, 14000.00, TRUE, 'veh%20section/Ignis%20Spider.jpg'
WHERE NOT EXISTS (SELECT 1 FROM cars WHERE name = 'Ignis Spider');

INSERT INTO cars (name, brand, model, year, price_per_day, availability, image)
SELECT 'Zenith Spectre', 'Zenith', 'Spectre', 2025, 15500.00, TRUE, 'veh%20section/Zenith%20Spectre.jpg'
WHERE NOT EXISTS (SELECT 1 FROM cars WHERE name = 'Zenith Spectre');

INSERT INTO cars (name, brand, model, year, price_per_day, availability, image)
SELECT 'Urban Compact', 'Urban', 'Compact', 2022, 3500.00, TRUE, 'veh%20section/car1.webp'
WHERE NOT EXISTS (SELECT 1 FROM cars WHERE name = 'Urban Compact');

INSERT INTO cars (name, brand, model, year, price_per_day, availability, image)
SELECT 'Everest SUV', 'Everest', 'SUV', 2023, 9500.00, TRUE, 'veh%20section/car3.jpg'
WHERE NOT EXISTS (SELECT 1 FROM cars WHERE name = 'Everest SUV');

INSERT INTO cars (name, brand, model, year, price_per_day, availability, image)
SELECT 'Duke 200', 'KTM', 'Duke 200', 2024, 2200.00, TRUE, 'image/bike.img.jpg'
WHERE NOT EXISTS (SELECT 1 FROM cars WHERE name = 'Duke 200');

INSERT INTO cars (name, brand, model, year, price_per_day, availability, image)
SELECT 'Falcon Sportbike', 'Falcon', 'Sportbike', 2024, 3000.00, TRUE, 'image/sportbike.png'
WHERE NOT EXISTS (SELECT 1 FROM cars WHERE name = 'Falcon Sportbike');

INSERT INTO cars (name, brand, model, year, price_per_day, availability, image)
SELECT 'Vespa ZX 125', 'Vespa', 'ZX 125', 2024, 1200.00, TRUE, 'image/scooter.img.jpg'
WHERE NOT EXISTS (SELECT 1 FROM cars WHERE name = 'Vespa ZX 125');

INSERT INTO cars (name, brand, model, year, price_per_day, availability, image)
SELECT 'F-150 Lightning Truck', 'Ford', 'F-150 Lightning', 2024, 8500.00, TRUE, 'image/truck.img.jpg'
WHERE NOT EXISTS (SELECT 1 FROM cars WHERE name = 'F-150 Lightning Truck');

INSERT INTO cars (name, brand, model, year, price_per_day, availability, image)
SELECT 'Cargo Delivery Van', 'Cargo', 'Delivery Van', 2023, 12000.00, TRUE, 'image/delivery-van.png'
WHERE NOT EXISTS (SELECT 1 FROM cars WHERE name = 'Cargo Delivery Van');

INSERT INTO cars (name, brand, model, year, price_per_day, availability, image)
SELECT '70HP 4WD Tractor', 'AgroMax', '70HP 4WD', 2024, 7000.00, TRUE, 'image/tractor.img.jpg'
WHERE NOT EXISTS (SELECT 1 FROM cars WHERE name = '70HP 4WD Tractor');

INSERT INTO cars (name, brand, model, year, price_per_day, availability, image)
SELECT 'Grove GHC30 Crane', 'Grove', 'GHC30', 2024, 55000.00, TRUE, 'image/crane.img.jpg'
WHERE NOT EXISTS (SELECT 1 FROM cars WHERE name = 'Grove GHC30 Crane');

INSERT INTO cars (name, brand, model, year, price_per_day, availability, image)
SELECT 'Crane Truck', 'Hydra', 'Crane Truck', 2023, 65000.00, TRUE, 'image/crane-truck.png'
WHERE NOT EXISTS (SELECT 1 FROM cars WHERE name = 'Crane Truck');

INSERT INTO cars (name, brand, model, year, price_per_day, availability, image)
SELECT 'Deluxe Night Bus', 'Volvo', '7900 Electric', 2024, 15000.00, TRUE, 'image/bus.img.jpg'
WHERE NOT EXISTS (SELECT 1 FROM cars WHERE name = 'Deluxe Night Bus');

INSERT INTO cars (name, brand, model, year, price_per_day, availability, image)
SELECT 'JCB Bull Dozer', 'JCB', '3DXL PLUS', 2024, 18000.00, TRUE, 'image/jcb.img.jpg'
WHERE NOT EXISTS (SELECT 1 FROM cars WHERE name = 'JCB Bull Dozer');
