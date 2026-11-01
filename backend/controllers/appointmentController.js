/**
 * Business logic for appointments + the live queue.
 *
 * Queue numbers are per doctor, per day (1, 2, 3 ...) and are generated atomically.
 * Every important queue event triggers an SMS / WhatsApp message:
 *   booked    -> patient books / is booked   (queue number + time)
 *   called    -> doctor calls the patient    ("it is your turn")
 *   next      -> the following patient       ("you are next")
 *   cancelled -> staff cancels an appointment
 */
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Counter = require('../models/Counter');
const asyncHandler = require('../utils/asyncHandler');
const { todayStr, isValidDate, isValidTime } = require('../utils/dates');
const { buildMessage, sendNotification } = require('../utils/smsService');

const STATUSES = ['waiting', 'in_progress', 'completed', 'cancelled', 'no_show'];
const ACTIVE = ['waiting', 'in_progress'];
const FINISHED = ['completed', 'cancelled', 'no_show'];

const populateOpts = [
  { path: 'patient' },
  { path: 'doctor', populate: { path: 'user', select: 'name phone' } },
];

/* ------------------------------------------------------------------ */
/* Notification helper (never throws, always records the attempt)      */
/* ------------------------------------------------------------------ */
async function sendAndRecord(appt, kind) {
  try {
    const body = buildMessage(kind, appt);
    const r = await sendNotification({ to: appt.patient.phone, body });
    appt.notifications.push({
      kind,
      status: r.status,
      channels: r.channels,
      error: r.error,
      message: body,
      sentAt: new Date(),
    });
  } catch (err) {
    appt.notifications.push({
      kind,
      status: 'failed',
      channels: [],
      error: err.message,
      sentAt: new Date(),
    });
  }
  await appt.save();
  return appt.notifications[appt.notifications.length - 1];
}

// "It is your turn" to the called patient + "you are next" to the one behind them
async function notifyCalled(appt) {
  await sendAndRecord(appt, 'called');

  const following = await Appointment.findOne({
    doctor: appt.doctor._id,
    date: appt.date,
    status: 'waiting',
    queueNumber: { $gt: appt.queueNumber },
  })
    .sort({ queueNumber: 1 })
    .populate(populateOpts);

  if (following) await sendAndRecord(following, 'next');
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
const getOwnPatient = (user) => Patient.findOne({ user: user._id });
const getOwnDoctor = (user) => Doctor.findOne({ user: user._id });

/* ------------------------------------------------------------------ */
/* POST /api/appointments — book an appointment / take a queue number  */
/* ------------------------------------------------------------------ */
exports.book = asyncHandler(async (req, res) => {
  const { doctorId, reason } = req.body;
  let { date, time } = req.body;

  // 1) who is the patient?
  let patient;
  if (req.user.role === 'patient') {
    patient = await getOwnPatient(req.user);
    if (!patient) return res.status(400).json({ message: 'Profile-ka bukaanka lama helin' });
  } else {
    if (!req.body.patientId) return res.status(400).json({ message: 'Dooro bukaanka' });
    patient = await Patient.findById(req.body.patientId);
    if (!patient) return res.status(404).json({ message: 'Bukaanka lama helin' });
  }

  // 2) doctor
  if (!doctorId) return res.status(400).json({ message: 'Dooro dhakhtarka' });
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) return res.status(404).json({ message: 'Dhakhtarka lama helin' });
  if (!doctor.isAvailable) {
    return res.status(400).json({ message: 'Dhakhtarkan hadda ma shaqeynayo' });
  }

  // 3) date / time
  date = date || todayStr();
  if (!isValidDate(date)) return res.status(400).json({ message: 'Taariikhdu waa khalad' });
  if (date < todayStr()) {
    return res.status(400).json({ message: 'Ma qabsan kartid ballan taariikh hore ah' });
  }
  if (time) {
    if (!isValidTime(time)) return res.status(400).json({ message: 'Waqtigu waa khalad (HH:mm)' });
    const clash = await Appointment.exists({
      doctor: doctor._id,
      date,
      time,
      status: { $in: ACTIVE },
    });
    if (clash) {
      return res.status(409).json({ message: 'Waqtigaas dhakhtarka waa mashquul, dooro waqti kale' });
    }
  } else {
    time = undefined;
  }

  // 4) one active booking per patient / doctor / day
  const duplicate = await Appointment.exists({
    patient: patient._id,
    doctor: doctor._id,
    date,
    status: { $in: ACTIVE },
  });
  if (duplicate) {
    return res
      .status(409)
      .json({ message: 'Bukaankan hore ayuu ballan ugu leeyahay dhakhtarkan maalintaas' });
  }

  // 5) atomic queue number + save
  const queueNumber = await Counter.next(`queue:${doctor._id}:${date}`);
  const appt = await Appointment.create({
    patient: patient._id,
    doctor: doctor._id,
    date,
    time,
    reason,
    queueNumber,
    source: req.user.role === 'patient' ? 'patient' : 'staff',
    bookedBy: req.user._id,
  });
  await appt.populate(populateOpts);

  // 6) SMS / WhatsApp confirmation (a failed message never fails the booking)
  const notification = await sendAndRecord(appt, 'booked');

  res.status(201).json({ appointment: appt, notification });
});

/* ------------------------------------------------------------------ */
/* GET /api/appointments?date=&doctorId=&status=&patientId=            */
/* ------------------------------------------------------------------ */
exports.list = asyncHandler(async (req, res) => {
  const { date, doctorId, status, patientId } = req.query;
  const filter = {};
  if (date) filter.date = date;
  if (status) filter.status = status;

  if (req.user.role === 'patient') {
    const own = await getOwnPatient(req.user);
    filter.patient = own ? own._id : null; // null matches nothing
  } else {
    if (patientId) filter.patient = patientId;
    if (req.user.role === 'doctor') {
      const own = await getOwnDoctor(req.user);
      filter.doctor = own ? own._id : null;
    } else if (doctorId) {
      filter.doctor = doctorId;
    }
  }

  const limit = Math.min(Number(req.query.limit) || 200, 500);
  const items = await Appointment.find(filter)
    .populate(populateOpts)
    .sort({ date: -1, queueNumber: 1 })
    .limit(limit);
  res.json(items);
});

/* ------------------------------------------------------------------ */
/* GET /api/appointments/queue?doctorId=&date=  (live queue)           */
/* Patients receive an anonymised view: numbers only, never names.     */
/* ------------------------------------------------------------------ */
exports.getQueue = asyncHandler(async (req, res) => {
  let { doctorId } = req.query;
  const date = req.query.date || todayStr();

  if (req.user.role === 'doctor') {
    const own = await getOwnDoctor(req.user);
    if (!own) return res.status(404).json({ message: 'Profile-ka dhakhtarka lama helin' });
    doctorId = own._id;
  }
  if (!doctorId) return res.status(400).json({ message: 'doctorId waa loo baahan yahay' });

  const items = await Appointment.find({ doctor: doctorId, date })
    .populate('patient', 'fullName phone patientCode')
    .sort({ queueNumber: 1 });

  const isPatient = req.user.role === 'patient';
  const own = isPatient ? await getOwnPatient(req.user) : null;

  const shape = (a) =>
    isPatient
      ? {
          _id: a._id,
          queueNumber: a.queueNumber,
          status: a.status,
          time: a.time,
          isMine: Boolean(own && a.patient && String(a.patient._id) === String(own._id)),
        }
      : a;

  const counts = { total: items.length };
  STATUSES.forEach((s) => {
    counts[s] = items.filter((a) => a.status === s).length;
  });

  const nowServing = items.find((a) => a.status === 'in_progress');
  res.json({
    date,
    doctorId,
    nowServing: nowServing ? shape(nowServing) : null,
    waiting: items.filter((a) => a.status === 'waiting').map(shape),
    counts,
  });
});

/* ------------------------------------------------------------------ */
/* PATCH /api/appointments/:id/status                                  */
/* ------------------------------------------------------------------ */
exports.updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!STATUSES.includes(status)) return res.status(400).json({ message: 'Xaaladdu waa khalad' });

  const appt = await Appointment.findById(req.params.id).populate(populateOpts);
  if (!appt) return res.status(404).json({ message: 'Ballanta lama helin' });

  const { role } = req.user;
  if (role === 'patient') {
    // a patient may only cancel their own waiting appointment
    const own = await getOwnPatient(req.user);
    if (!own || String(appt.patient._id) !== String(own._id)) {
      return res.status(403).json({ message: 'Ballantan adiga ma aha' });
    }
    if (status !== 'cancelled' || appt.status !== 'waiting') {
      return res.status(403).json({ message: 'Waxaad joojin kartaa oo kaliya ballan sugaysa' });
    }
  } else if (role === 'doctor') {
    const own = await getOwnDoctor(req.user);
    if (!own || String(appt.doctor._id) !== String(own._id)) {
      return res.status(403).json({ message: 'Ballantan bukaankaaga ma aha' });
    }
  }

  appt.status = status;
  if (status === 'in_progress') appt.calledAt = new Date();
  if (FINISHED.includes(status)) appt.completedAt = new Date();
  await appt.save();

  if (status === 'in_progress') await notifyCalled(appt);
  if (status === 'cancelled' && role !== 'patient') await sendAndRecord(appt, 'cancelled');

  res.json(appt);
});

/* ------------------------------------------------------------------ */
/* POST /api/appointments/queue/call-next  { doctorId?, date? }        */
/* Finishes the current patient and calls the next waiting number.     */
/* ------------------------------------------------------------------ */
exports.callNext = asyncHandler(async (req, res) => {
  let { doctorId } = req.body;
  const date = req.body.date || todayStr();

  if (req.user.role === 'doctor') {
    const own = await getOwnDoctor(req.user);
    if (!own) return res.status(404).json({ message: 'Profile-ka dhakhtarka lama helin' });
    doctorId = own._id;
  }
  if (!doctorId) return res.status(400).json({ message: 'doctorId waa loo baahan yahay' });

  await Appointment.updateMany(
    { doctor: doctorId, date, status: 'in_progress' },
    { status: 'completed', completedAt: new Date() }
  );

  const next = await Appointment.findOne({ doctor: doctorId, date, status: 'waiting' })
    .sort({ queueNumber: 1 })
    .populate(populateOpts);

  if (!next) return res.json({ appointment: null, message: 'Safka waa madhan yahay' });

  next.status = 'in_progress';
  next.calledAt = new Date();
  await next.save();
  await notifyCalled(next);

  res.json({ appointment: next, message: `Lambar #${next.queueNumber} ayaa la wacay` });
});

/* ------------------------------------------------------------------ */
/* GET /api/appointments/stats — today's numbers for the dashboard     */
/* ------------------------------------------------------------------ */
exports.getStats = asyncHandler(async (req, res) => {
  const date = todayStr();
  const grouped = await Appointment.aggregate([
    { $match: { date } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const today = { total: 0 };
  STATUSES.forEach((s) => {
    today[s] = 0;
  });
  grouped.forEach((g) => {
    today[g._id] = g.count;
    today.total += g.count;
  });

  const [patients, doctors] = await Promise.all([
    Patient.countDocuments(),
    Doctor.countDocuments({ isAvailable: true }),
  ]);

  res.json({ date, today, patients, doctors });
});

exports.sendAndRecord = sendAndRecord;
exports.populateOpts = populateOpts;
