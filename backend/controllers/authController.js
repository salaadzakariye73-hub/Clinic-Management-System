const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const asyncHandler = require('../utils/asyncHandler');
const { normalizePhone } = require('../utils/smsService');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const publicUser = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  role: u.role,
});

// POST /api/auth/register — public self-registration, always creates a PATIENT
exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, gender, dateOfBirth } = req.body;

  if (!name || !email || !password || !phone) {
    return res
      .status(400)
      .json({ message: 'Magaca, email-ka, furaha iyo taleefanka waa loo baahan yahay' });
  }
  const normalized = normalizePhone(phone);
  if (!normalized) return res.status(400).json({ message: 'Lambarka taleefanka waa khalad' });
  if (String(password).length < 6) {
    return res.status(400).json({ message: 'Furuhu waa inuu ugu yaraan 6 xaraf ahaadaa' });
  }
  if (await User.findOne({ email: String(email).toLowerCase() })) {
    return res.status(409).json({ message: 'Email-kan hore ayaa loo diiwaangeliyay' });
  }

  const user = await User.create({ name, email, password, phone: normalized, role: 'patient' });
  try {
    await Patient.create({
      user: user._id,
      fullName: name,
      phone: normalized,
      gender,
      dateOfBirth: dateOfBirth || undefined,
    });
  } catch (err) {
    await User.findByIdAndDelete(user._id); // keep data consistent
    throw err;
  }

  res.status(201).json({ token: signToken(user._id), user: publicUser(user) });
});

// POST /api/auth/login
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email-ka iyo furaha geli' });
  }

  const user = await User.findOne({ email: String(email).toLowerCase() }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ message: 'Email ama fure khalad ah' });
  }
  if (!user.isActive) return res.status(403).json({ message: 'Akoonkaan waa la xanibay' });

  res.json({ token: signToken(user._id), user: publicUser(user) });
});

// GET /api/auth/me
exports.me = asyncHandler(async (req, res) => {
  let profile = null;
  if (req.user.role === 'patient') profile = await Patient.findOne({ user: req.user._id });
  if (req.user.role === 'doctor') profile = await Doctor.findOne({ user: req.user._id });
  res.json({ user: publicUser(req.user), profile });
});

// POST /api/auth/staff — admin creates admin / receptionist accounts
exports.createStaff = asyncHandler(async (req, res) => {
  const { name, email, password, phone, role } = req.body;
  if (!['admin', 'receptionist'].includes(role)) {
    return res.status(400).json({ message: "Doorka waa 'admin' ama 'receptionist'" });
  }
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Magaca, email-ka iyo furaha waa loo baahan yahay' });
  }
  const user = await User.create({ name, email, password, phone, role });
  res.status(201).json(publicUser(user));
});
