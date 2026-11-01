const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const asyncHandler = require('../utils/asyncHandler');
const { sendNotification, isConfigured, channelsFor, normalizePhone } = require('../utils/smsService');
const { sendAndRecord, populateOpts } = require('./appointmentController');

// GET /api/notifications/status — tells the UI whether real messages or simulation are used
exports.status = asyncHandler(async (req, res) => {
  res.json({
    configured: isConfigured(),
    mode: isConfigured() ? 'live' : 'simulation',
    channels: channelsFor(),
    language: process.env.MESSAGE_LANG === 'en' ? 'en' : 'so',
  });
});

// POST /api/notifications/send  { phone | patientId, message, channel? }
exports.sendCustom = asyncHandler(async (req, res) => {
  const { patientId, message, channel } = req.body;
  let { phone } = req.body;

  if (!message || !String(message).trim()) {
    return res.status(400).json({ message: 'Qor fariinta' });
  }
  if (channel && !['sms', 'whatsapp', 'both'].includes(channel)) {
    return res.status(400).json({ message: "Channel waa 'sms', 'whatsapp' ama 'both'" });
  }

  if (patientId) {
    const patient = await Patient.findById(patientId);
    if (!patient) return res.status(404).json({ message: 'Bukaanka lama helin' });
    phone = patient.phone;
  }
  if (!phone || !normalizePhone(phone)) {
    return res.status(400).json({ message: 'Lambarka taleefanka waa khalad' });
  }

  const result = await sendNotification({ to: phone, body: String(message).trim(), channel });
  if (result.status === 'failed') {
    return res.status(502).json({ message: result.error || 'Fariinta lama diri karin', ...result });
  }
  res.json(result);
});

// POST /api/notifications/appointments/:id/resend  { kind? = 'booked' }
exports.resend = asyncHandler(async (req, res) => {
  const kind = req.body.kind || 'booked';
  if (!['booked', 'called', 'next', 'cancelled'].includes(kind)) {
    return res.status(400).json({ message: 'Nooca fariinta waa khalad' });
  }

  const appt = await Appointment.findById(req.params.id).populate(populateOpts);
  if (!appt) return res.status(404).json({ message: 'Ballanta lama helin' });

  const notification = await sendAndRecord(appt, kind);
  if (notification.status === 'failed') {
    return res
      .status(502)
      .json({ message: notification.error || 'Fariinta lama diri karin', notification });
  }
  res.json({ notification });
});
