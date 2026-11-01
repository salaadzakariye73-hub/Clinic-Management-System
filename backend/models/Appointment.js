const mongoose = require('mongoose');

// One entry per SMS / WhatsApp attempt, so staff can see exactly what the patient was told.
const notificationSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ['booked', 'next', 'called', 'cancelled', 'custom'] },
    status: { type: String, enum: ['sent', 'simulated', 'partial', 'failed'] },
    channels: [String],
    error: String,
    message: String,
    sentAt: Date,
  },
  { _id: false }
);

const appointmentSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    // "YYYY-MM-DD" in clinic timezone
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    // optional "HH:mm"; empty = walk-in queue ticket
    time: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    // per doctor, per day: 1, 2, 3 ...
    queueNumber: { type: Number, required: true },
    reason: { type: String, trim: true },
    status: {
      type: String,
      enum: ['waiting', 'in_progress', 'completed', 'cancelled', 'no_show'],
      default: 'waiting',
    },
    source: { type: String, enum: ['staff', 'patient'], default: 'staff' },
    bookedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    calledAt: Date,
    completedAt: Date,
    notifications: [notificationSchema],
  },
  { timestamps: true }
);

// A queue number is unique for a doctor on a given day
appointmentSchema.index({ doctor: 1, date: 1, queueNumber: 1 }, { unique: true });
appointmentSchema.index({ patient: 1, date: -1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
