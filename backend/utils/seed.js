/**
 * Demo data: npm run seed
 * Creates an admin, receptionist, doctor and a demo patient (only if they do not exist yet).
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');

async function findOrCreateUser(data) {
  return (await User.findOne({ email: data.email })) || User.create(data);
}

(async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/clinic_db');

  await findOrCreateUser({
    name: 'Admin',
    email: 'admin@clinic.com',
    password: 'Admin@123',
    phone: '+252610000001',
    role: 'admin',
  });
  await findOrCreateUser({
    name: 'Receptionist',
    email: 'reception@clinic.com',
    password: 'Reception@123',
    phone: '+252610000002',
    role: 'receptionist',
  });

  const doctorUser = await findOrCreateUser({
    name: 'Cabdi Axmed',
    email: 'doctor@clinic.com',
    password: 'Doctor@123',
    phone: '+252610000003',
    role: 'doctor',
  });
  if (!(await Doctor.findOne({ user: doctorUser._id }))) {
    await Doctor.create({ user: doctorUser._id, specialty: 'Daawaynta Guud', room: 'Qolka 1' });
  }

  const patientUser = await findOrCreateUser({
    name: 'Xaawo Maxamed',
    email: 'patient@clinic.com',
    password: 'Patient@123',
    phone: process.env.SEED_PATIENT_PHONE || '+252610000004',
    role: 'patient',
  });
  if (!(await Patient.findOne({ user: patientUser._id }))) {
    await Patient.create({
      user: patientUser._id,
      fullName: patientUser.name,
      phone: patientUser.phone,
      gender: 'female',
    });
  }

  console.log('\nSeed complete. Demo logins:');
  console.log('  admin         admin@clinic.com      / Admin@123');
  console.log('  receptionist  reception@clinic.com  / Reception@123');
  console.log('  doctor        doctor@clinic.com     / Doctor@123');
  console.log('  patient       patient@clinic.com    / Patient@123\n');
  await mongoose.disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
