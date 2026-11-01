require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

const app = express();

/* ---------------- Middleware ---------------- */
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',').map((s) => s.trim()) : true,
  })
);
app.use(express.json({ limit: '1mb' }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// brute-force protection: only FAILED login / register attempts count, so a whole clinic
// sharing one IP address is never locked out by normal use.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Isku day badan, fadlan dib u day daqiiqado kadib' },
});

/* ---------------- Routes ---------------- */
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth', require('./routes/auth'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/doctors', require('./routes/doctors'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/notifications', require('./routes/notifications'));

app.use('/api', (req, res) => res.status(404).json({ message: 'Route lama helin' }));

/* ---------------- Error handler ---------------- */
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: Object.values(err.errors).map((e) => e.message).join(', ') });
  }
  if (err.code === 11000) {
    return res
      .status(409)
      .json({ message: 'Qiimahan hore ayaa loo isticmaalay', fields: err.keyValue });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ message: `Qiime khalad ah: ${err.path}` });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'JSON-ku waa khalad' });
  }

  console.error(err);
  res.status(err.status || 500).json({
    message: process.env.NODE_ENV === 'production' ? 'Server error' : err.message || 'Server error',
  });
});

/* ---------------- Start ---------------- */
async function start() {
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is missing. Copy .env.example to .env and set it.');
    process.exit(1);
  }
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/clinic_db';
  await mongoose.connect(uri);
  console.log('MongoDB connected');

  const { isConfigured, channelsFor } = require('./utils/smsService');
  console.log(
    isConfigured()
      ? `Notifications: LIVE via Twilio (${channelsFor().join(' + ')})`
      : 'Notifications: SIMULATION mode (set TWILIO_* in .env to send real SMS/WhatsApp)'
  );

  const port = process.env.PORT || 5000;
  app.listen(port, () => console.log(`API running on http://localhost:${port}`));
}

if (require.main === module) {
  start().catch((err) => {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  });
}

module.exports = app;
