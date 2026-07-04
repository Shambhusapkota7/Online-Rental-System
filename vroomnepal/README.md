# Car Rental Backend — MySQL Workbench Setup

## Prerequisites
- Node.js 18+
- MySQL Workbench (MySQL 8.x recommended)

---

## 1. Set up the Database in MySQL Workbench

1. Open **MySQL Workbench** and connect to your local MySQL instance.
2. Go to **File → Open SQL Script** and select `config/schema.sql`.
3. Click the ⚡ **Run All** button (or press `Ctrl+Shift+Enter`).
4. The script creates the `car_rental_db` database, all tables, and a default admin user.

> **Default admin credentials**
> - Email: `admin@carrental.com`
> - Password: `Admin@123`

---

## 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your MySQL Workbench password:

```bash
cp .env.example .env
```

```
PORT=5001
NODE_ENV=development

# MySQL Workbench connection
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_workbench_password   ← set this
DB_NAME=car_rental_db

JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=7d
```

> **MySQL 8 Auth Note:** If you see `caching_sha2_password` errors, run this once in Workbench:
> ```sql
> ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'yourpassword';
> FLUSH PRIVILEGES;
> ```

---

## 3. Install & Run

```bash
npm install
npm run dev      # development (nodemon)
npm start        # production
```

Server starts at `http://localhost:5001`

---

## API Endpoints

### Auth
| Method | Route               | Auth  | Description                        |
|--------|---------------------|-------|------------------------------------|
| POST   | /api/auth/register  | No    | Register (role always = 'user')    |
| POST   | /api/auth/login     | No    | Login – returns JWT token          |
| GET    | /api/auth/me        | JWT   | Current user info                  |

### Cars
| Method | Route           | Auth  | Description            |
|--------|-----------------|-------|------------------------|
| GET    | /api/cars       | No    | List all cars          |
| GET    | /api/cars/:id   | No    | Get single car         |
| POST   | /api/cars       | Admin | Add a car              |
| PUT    | /api/cars/:id   | Admin | Update a car           |
| DELETE | /api/cars/:id   | Admin | Delete a car           |

### Bookings
| Method | Route                       | Auth  | Description              |
|--------|-----------------------------|-------|--------------------------|
| POST   | /api/bookings               | JWT   | Create booking           |
| GET    | /api/bookings/my            | JWT   | My bookings              |
| GET    | /api/bookings               | Admin | All bookings             |
| GET    | /api/bookings/:id           | JWT   | Single booking           |
| PATCH  | /api/bookings/:id/cancel    | JWT   | Cancel booking           |
| PATCH  | /api/bookings/:id/status    | Admin | Update booking status    |

### Payments
| Method | Route                            | Auth  | Description              |
|--------|----------------------------------|-------|--------------------------|
| POST   | /api/payments                    | JWT   | Create payment           |
| GET    | /api/payments/booking/:bookingId | JWT   | Payment for booking      |
| PATCH  | /api/payments/:id/status         | Admin | Update payment status    |

### Users
| Method | Route               | Auth  | Description                      |
|--------|---------------------|-------|----------------------------------|
| GET    | /api/users/profile  | JWT   | Get own profile                  |
| PUT    | /api/users/profile  | JWT   | Update own profile               |
| GET    | /api/users          | Admin | List all users                   |
| POST   | /api/users          | Admin | Create user (can assign role)    |

---

## Bug Fixes Applied

1. **`config/db.js`** — Removed broken `authPlugins` override that caused MySQL 8 connection failures; `mysql2` handles `caching_sha2_password` natively.
2. **`config/schema.sql`** — Added `UNIQUE` constraint on `users.phone` column (was missing, causing duplicate phone bypass).
3. **`controllers/authController.js`** — Public `/register` now always assigns `role = 'user'`; prevented attackers from self-assigning admin role.
4. **`controllers/bookingController.js`** — Fixed `user_id` type mismatch (`Number()` coercion) in ownership checks that caused legitimate users to get 403 errors.
5. **`controllers/paymentController.js`** — Same `user_id` type mismatch fix in two ownership checks.
6. **`controllers/userController.js`** — Fixed `updateProfile`: added phone uniqueness check, and corrected field-defaulting logic (`||` replaced with explicit `!== undefined` guard so empty string can clear phone).
7. **`models/Booking.js`** — Fixed `calcTotalPrice`: changed `days <= 0` to `days < 1` so a 1-day rental (same-day return) is correctly priced at 1 day instead of throwing an error.
8. **`routes/carRoutes.js`** — Added `param('id')` integer validation to GET/PUT/DELETE routes to prevent 500 errors on non-numeric IDs.
9. **`routes/bookingRoutes.js`** — Added `param('id')` integer validation to all `/:id` routes; confirmed `/my` route is registered before `/:id` to avoid route-order ambiguity.
10. **`routes/paymentRoutes.js`** — Added `param('id')` and `param('bookingId')` integer validation.
11. **`routes/userRoutes.js`** — Added new `POST /api/users` admin endpoint to create users with any role (since public register is now locked to 'user').
