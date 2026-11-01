const mongoose = require('mongoose');
const Counter = require('./Counter');

const patientSchema = new mongoose.Schema(
  {
    // e.g. P-00042, generated automatically
    patientCode: { type: String, unique: true },
    // set only when the patient has a portal account
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, sparse: true },
    fullName: { type: String, required: [true, 'Magaca bukaanka waa loo baahan yahay'], trim: true },
    phone: { type: String, required: [true, 'Lambarka taleefanka waa loo baahan yahay'], trim: true },
    gender: { type: String, enum: ['male', 'female', 'other'] },
    dateOfBirth: { type: Date },
    address: { type: String, trim: true },
    medicalNotes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

patientSchema.pre('validate', async function generateCode() {
  if (this.isNew && !this.patientCode) {
    const n = await Counter.next('patient');
    this.patientCode = `P-${String(n).padStart(5, '0')}`;
  }
});

module.exports = mongoose.model('Patient', patientSchema);
