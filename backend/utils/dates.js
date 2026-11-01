// Appointment dates are stored as plain "YYYY-MM-DD" strings in the clinic's timezone,
// so "today's queue" never shifts because of server/UTC offsets.

const clinicTimezone = () => process.env.CLINIC_TIMEZONE || 'Africa/Mogadishu';

// "en-CA" formats dates as YYYY-MM-DD
const todayStr = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: clinicTimezone() });

const isValidDate = (s) =>
  typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

const isValidTime = (s) =>
  typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

module.exports = { todayStr, isValidDate, isValidTime };
