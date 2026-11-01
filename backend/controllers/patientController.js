const Patient = require('../models/Patient');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const asyncHandler = require('../utils/asyncHandler');
const { normalizePhone } = require('../utils/smsService');

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const EDITABLE = ['fullName', 'phone', 'gender', 'dateOfBirth', 'address', 'medicalNotes'];

// GET /api/patients?q=&limit=
exports.list = asyncHandler(async (req, res) => {
  const { q } = req.query;
  const limit = Math.min(Number(req.query.limit) || 200, 500);
  const filter = {};
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ fullName: rx }, { phone: rx }, { patientCode: rx }];
  }
  const patients = await Patient.find(filter).sort({ createdAt: -1 }).limit(limit);
  res.json(patients);
});

// GET /api/patients/me — the logged-in patient's own profile
exports.getMe = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ user: req.user._id });
  if (!patient) return res.status(404).json({ message: 'Profile-ka bukaanka lama helin' });
  res.json(patient);
});

// GET /api/patients/:id
exports.getOne = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.params.id);
  if (!patient) return res.status(404).json({ message: 'Bukaanka lama helin' });
  res.json(patient);
});

// POST /api/patients
exports.create = asyncHandler(async (req, res) => {
  const { fullName, phone } = req.body;
  if (!fullName || !phone) {
    return res.status(400).json({ message: 'Magaca iyo taleefanka waa loo baahan yahay' });
  }
  const normalized = normalizePhone(phone);
  if (!normalized) return res.status(400).json({ message: 'Lambarka taleefanka waa khalad' });

  const patient = await Patient.create({
    fullName,
    phone: normalized,
    gender: req.body.gender || undefined,
    dateOfBirth: req.body.dateOfBirth || undefined,
    address: req.body.address,
    medicalNotes: req.body.medicalNotes,
    createdBy: req.user._id,
  });
  res.status(201).json(patient);
});

// PUT /api/patients/:id
exports.update = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.params.id);
  if (!patient) return res.status(404).json({ message: 'Bukaanka lama helin' });

  EDITABLE.forEach((key) => {
    if (req.body[key] !== undefined) patient[key] = req.body[key] === '' ? undefined : req.body[key];
  });
  if (req.body.phone !== undefined) {
    const normalized = normalizePhone(req.body.phone);
    if (!normalized) return res.status(400).json({ message: 'Lambarka taleefanka waa khalad' });
    patient.phone = normalized;
  }

  await patient.save();
  res.json(patient);
});

// DELETE /api/patients/:id (admin) — blocked when the patient has appointment history
exports.remove = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.params.id);
  if (!patient) return res.status(404).json({ message: 'Bukaanka lama helin' });

  if (await Appointment.exists({ patient: patient._id })) {
    return res
      .status(409)
      .json({ message: 'Bukaankan wuxuu leeyahay taariikh ballan, lama tirtiri karo' });
  }

  if (patient.user) await User.findByIdAndDelete(patient.user);
  await patient.deleteOne();
  res.json({ message: 'Bukaanka waa la tirtiray' });
});
