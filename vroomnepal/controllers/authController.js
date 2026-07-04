'use strict';

const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const PasswordOtp = require('../models/PasswordOtp');

const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const sanitizeUser = (user) => {
  const { password: _password, ...safeUser } = user;
  return safeUser;
};

const allowedRoles = ['user', 'vendor', 'admin'];
const resolveRequestedRole = (role) => {
  const requestedRole = String(role || 'user').trim().toLowerCase();
  return allowedRoles.includes(requestedRole) ? requestedRole : 'user';
};
const isDevelopment = process.env.NODE_ENV !== 'production';

// ─── Nodemailer transporter ────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

// ─── Register ──────────────────────────────────────────────────────────────
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, phone, role } = req.body;
    const assignedRole = resolveRequestedRole(role);

    const existingEmail = await User.findByEmail(email);
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered',
      });
    }

    if (phone) {
      const existingPhone = await User.findByPhone(phone);
      if (existingPhone) {
        return res.status(409).json({
          success: false,
          message: 'Phone number already registered',
        });
      }
    }

    const newUserId = await User.create({
      name,
      email,
      password,
      phone: phone || null,
      role: assignedRole,
    });

    const user = await User.findById(newUserId);

    return res.status(201).json({
      success: true,
      message: 'Registration successful. Please log in.',
      user: sanitizeUser(user),
    });
  } catch (error) {
    next(error);
  }
};

// ─── Login ─────────────────────────────────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const { identifier, password, role } = req.body;
    const requestedRole = role ? resolveRequestedRole(role) : null;

    const user = await User.findByCredential(identifier);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const passwordMatches = await User.comparePassword(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    if (requestedRole && user.role !== requestedRole) {
      return res.status(403).json({
        success: false,
        message: `Please use a ${requestedRole} account to log in here.`,
      });
    }

    return res.status(200).json({
      success: true,
      token: signToken(user.id),
      user: sanitizeUser(user),
    });
  } catch (error) {
    next(error);
  }
};

// ─── Get Me ────────────────────────────────────────────────────────────────
exports.getMe = async (req, res, next) => {
  try {
    return res.json({ success: true, user: req.user });
  } catch (error) {
    next(error);
  }
};

// ─── Forgot Password — Send OTP ────────────────────────────────────────────
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    // Check if email exists in database
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'This email is not registered. Please sign up first.',
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save OTP (replaces any previous OTP for this email)
    await PasswordOtp.createForEmail(email, otp, 10);

    let emailSent = false;
    let mailError = null;
    if (process.env.MAIL_USER && process.env.MAIL_PASS) {
      try {
        await transporter.sendMail({
          from: `"VroomNepal" <${process.env.MAIL_USER}>`,
          to: email,
          subject: 'Your VroomNepal Password Reset OTP',
          html: `
            <div style="font-family: Inter, sans-serif; max-width: 420px; margin: auto; padding: 32px; background: #f8f8ff; border-radius: 16px;">
              <h2 style="color: #5b5fc7; text-align: center; margin-bottom: 8px;">VroomNepal</h2>
              <p style="color: #333; font-size: 15px; text-align: center;">Your password reset OTP is:</p>
              <div style="text-align: center; margin: 24px 0;">
                <span style="font-size: 40px; font-weight: 700; letter-spacing: 12px; color: #5b5fc7;">${otp}</span>
              </div>
              <p style="color: #888; font-size: 13px; text-align: center;">This OTP expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
              <p style="color: #bbb; font-size: 12px; text-align: center; margin-top: 24px;">If you didn't request this, you can safely ignore this email.</p>
            </div>
          `,
        });
        emailSent = true;
      } catch (error) {
        mailError = error;
      }
    }

    if (!emailSent && !isDevelopment) {
      throw mailError || new Error('Mail service is not configured');
    }

    return res.status(200).json({
      success: true,
      message: emailSent
        ? 'OTP sent to your email. Valid for 10 minutes.'
        : 'Email is unavailable in development. Use the OTP shown below.',
      emailSent,
      ...(isDevelopment && !emailSent ? { otp } : {}),
    });

  } catch (error) {
    next(error);
  }
};

// ─── Verify OTP ────────────────────────────────────────────────────────────
exports.verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }

    const record = await PasswordOtp.findValid(email, otp);

    if (!record) {
      return res.status(400).json({ success: false, message: 'Invalid OTP. Please try again.' });
    }

    // Check expiry
    if (record.expired) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    // Mark OTP as used
    await PasswordOtp.markUsed(record.id);

    // Generate a short-lived reset token (5 min)
    const resetToken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '5m' });

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully.',
      resetToken,
    });

  } catch (error) {
    next(error);
  }
};

// ─── Reset Password ────────────────────────────────────────────────────────
exports.resetPassword = async (req, res, next) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({ success: false, message: 'Token and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    // Verify reset token
    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch {
      return res.status(400).json({ success: false, message: 'Reset link has expired. Please start over.' });
    }

    const { email } = decoded;

    // Update password
    await User.updatePassword(email, newPassword);

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully. You can now log in.',
    });

  } catch (error) {
    next(error);
  }
};
