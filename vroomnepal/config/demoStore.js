'use strict';

const bcrypt = require('bcryptjs');

const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

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

const store = {
  ready: false,
  users: [],
  cars: [],
  bookings: [],
  payments: [],
  notifications: [],
  vendorDocuments: [],
  passwordOtps: [],
  counters: {
    user: 1,
    car: 1,
    booking: 1,
    payment: 1,
    notification: 1,
    vendorDocument: 1,
    passwordOtp: 1,
  },
};

async function ensureReady() {
  if (store.ready) return store;

  const adminPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@123', 12);
  const userPassword = await bcrypt.hash('Customer@123', 12);
  const vendorPassword = await bcrypt.hash('Vendor@123', 12);

  store.users.push(
    { id: store.counters.user++, name: 'Admin', email: 'admin@carrental.com', password: adminPassword, phone: '0000000000', role: 'admin', created_at: now() },
    { id: store.counters.user++, name: 'Demo Customer', email: 'customer@vroomnepal.com', password: userPassword, phone: '9812345678', role: 'user', created_at: now() },
    { id: store.counters.user++, name: 'Demo Vendor', email: 'vendor@vroomnepal.com', password: vendorPassword, phone: '9812345679', role: 'vendor', created_at: now() }
  );

  store.cars = vehicles.map(([name, brand, model, year, price_per_day, image]) => ({
    id: store.counters.car++,
    name,
    brand,
    model,
    year,
    price_per_day,
    availability: 1,
    image,
    vendor_id: null,
    vendor_name: null,
    vendor_email: null,
    created_at: now(),
  }));

  store.ready = true;
  return store;
}

module.exports = { store, ensureReady };
