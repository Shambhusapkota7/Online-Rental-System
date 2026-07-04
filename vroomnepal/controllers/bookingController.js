'use strict';

const Booking = require('../models/Booking');
const Car = require('../models/Car');
const Notification = require('../models/Notification');

const BOOKING_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed'];

const isOwnerOrAdmin = (user, ownerId) =>
  user.role === 'admin' || Number(ownerId) === Number(user.id);

const isBookingVendorOrAdmin = (user, booking) =>
  user.role === 'admin' || (user.role === 'vendor' && Number(booking.vendor_id) === Number(user.id));

const canAccessBooking = (user, booking) =>
  isOwnerOrAdmin(user, booking.user_id) || isBookingVendorOrAdmin(user, booking);

const todayDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

exports.createBooking = async (req, res, next) => {
  try {
    if (req.user.role !== 'user') {
      return res.status(403).json({
        success: false,
        message: 'Please log in with a customer account to book a vehicle',
      });
    }

    const { car_id, start_date, end_date, pickup_time, dropoff_time } = req.body;
    const user_id = req.user.id;

    if (start_date < todayDateString()) {
      return res.status(400).json({
        success: false,
        message: 'start_date cannot be in the past',
      });
    }

    if (end_date <= start_date) {
      return res.status(400).json({
        success: false,
        message: 'end_date must be after start_date',
      });
    }

    const car = await Car.findById(car_id);
    if (!car) {
      return res.status(404).json({ success: false, message: 'Car not found' });
    }

    if (!car.availability) {
      return res.status(400).json({
        success: false,
        message: 'Car is not available for booking',
      });
    }

    const alreadyBooked = await Booking.isCarBooked(car_id, start_date, end_date);
    if (alreadyBooked) {
      return res.status(409).json({
        success: false,
        message: 'Car is already booked for the selected dates',
      });
    }

    let total_price;
    try {
      total_price = Booking.calcTotalPrice(start_date, end_date, car.price_per_day);
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    const bookingId = await Booking.create({
      user_id,
      car_id,
      start_date,
      end_date,
      pickup_time: pickup_time || null,
      dropoff_time: dropoff_time || null,
      total_price,
    });

    const booking = await Booking.findById(bookingId);
    if (booking.vendor_id) {
      await Notification.create({
        user_id: booking.vendor_id,
        type: 'booking_created',
        title: 'New booking request',
        message: `${booking.user_name || 'A customer'} booked ${booking.car_name || 'your vehicle'}`,
        booking_id: booking.id,
        car_id,
      });
    }
    res.status(201).json({ success: true, booking });
  } catch (error) {
    next(error);
  }
};

exports.getMyBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.findByUser(req.user.id);
    res.json({ success: true, count: bookings.length, bookings });
  } catch (error) {
    next(error);
  }
};

exports.getAllBookings = async (req, res, next) => {
  try {
    const bookings = req.user.role === 'vendor'
      ? await Booking.findByVendor(req.user.id)
      : await Booking.findAll();
    res.json({ success: true, count: bookings.length, bookings });
  } catch (error) {
    next(error);
  }
};

exports.getBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (!canAccessBooking(req.user, booking)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, booking });
  } catch (error) {
    next(error);
  }
};

exports.cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (!canAccessBooking(req.user, booking)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (['cancelled', 'completed'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Booking is already ${booking.status}`,
      });
    }

    await Booking.updateStatus(req.params.id, 'cancelled');
    if (req.user.role !== 'vendor' && booking.vendor_id) {
      await Notification.create({
        user_id: booking.vendor_id,
        type: 'booking_cancelled',
        title: 'Booking cancelled',
        message: `${booking.user_name || 'A customer'} cancelled ${booking.car_name || 'a booking'}`,
        booking_id: booking.id,
        car_id: booking.car_id,
      });
    }
    res.json({ success: true, message: 'Booking cancelled successfully' });
  } catch (error) {
    next(error);
  }
};

exports.updateBookingStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!BOOKING_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${BOOKING_STATUSES.join(', ')}`,
      });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (!isBookingVendorOrAdmin(req.user, booking)) {
      return res.status(403).json({ success: false, message: 'You can only manage bookings for your own vehicles' });
    }

    await Booking.updateStatus(req.params.id, status);
    await Notification.create({
      user_id: booking.user_id,
      type: 'booking_status',
      title: 'Booking status updated',
      message: `${booking.car_name || 'Your booking'} is now ${status}`,
      booking_id: booking.id,
      car_id: booking.car_id,
    });
    res.json({ success: true, message: `Booking status updated to '${status}'` });
  } catch (error) {
    next(error);
  }
};
