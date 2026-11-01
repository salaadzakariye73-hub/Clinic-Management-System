const Doctor = require('../models/Doctor');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { normalizePhone } = require('../utils/smsService');

const isStaff = (role) => role === 'admin' || role === 'receptionist';

// GET /api/doctors — patients only see available doctors; staff see everyone
exports.list = asyncHandler(async (req, res) => {
  const filter = {};
  if (!isStaff(req.user.role)) filter.isAvailable = true;

  const fields = req.user.role === 'admin' ? 'name email phone' : 'name';
  const doctors = await Doctor.find(filter).populate('user', fields).sort({ createdAt: 1 });
  res.json(doctors);
});

// GET /api/doctors/me
exports.getMe = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findOne({ user: req.user._id }).populate('user', 'name email phone');
  if (!doctor) return res.status(404).json({ message: 'Profile-ka dhakhtarka lama helin' });
  res.json(doctor);
});

// POST /api/doctors (admin) — creates the login account and the doctor profile together
exports.create = asyncHandler(async (req, res) => {
  const { name, email, password, phone, specialty, room } = req.body;
  if (!name || !email || !password || !specialty) {
    return res
      .status(400)
      .json({ message: 'Magaca, email-ka, furaha iyo takhasuska waa loo baahan yahay' });
  }
  let normalized;
  if (phone) {
    normalized = normalizePhone(phone);
    if (!normalized) return res.status(400).json({ message: 'Lambarka taleefanka waa khalad' });
  }

  const user = await User.create({ name, email, password, phone: normalized, role: 'doctor' });
  try {
    const doctor = await Doctor.create({ user: user._id, specialty, room });
    await doctor.populate('user', 'name email phone');
    res.status(201).json(doctor);
  } catch (err) {
    await User.findByIdAndDelete(user._id);
    throw err;
  }
});

// PUT /api/doctors/:id (admin)
exports.update = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id).populate('user');
  if (!doctor) return res.status(404).json({ message: 'Dhakhtarka lama helin' });

  ['specialty', 'room', 'isAvailable'].forEach((key) => {
    if (req.body[key] !== undefined) doctor[key] = req.body[key];
  });

  let userChanged = false;
  if (req.body.name) {
    doctor.user.name = req.body.name;
    userChanged = true;
  }
  if (req.body.phone !== undefined) {
    const normalized = normalizePhone(req.body.phone);
    if (!normalized) return res.status(400).json({ message: 'Lambarka taleefanka waa khalad' });
    doctor.user.phone = normalized;
    userChanged = true;
  }

  if (userChanged) await doctor.user.save();
  await doctor.save();
  res.json(doctor);
});
