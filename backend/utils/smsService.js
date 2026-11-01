/**
 * smsService.js — SMS / WhatsApp notifications through Twilio.
 *
 *  - NOTIFY_CHANNEL = sms | whatsapp | both
 *  - Without Twilio credentials the service runs in SIMULATION mode
 *    (messages are logged to the console), so the whole system can be tested for free.
 */
const twilio = require('twilio');

let _client = null;

const isConfigured = () =>
  Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      (process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_WHATSAPP_NUMBER)
  );

const getClient = () => {
  if (!_client) {
    _client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return _client;
};

/* ------------------------------------------------------------------ */
/* Phone numbers                                                       */
/* ------------------------------------------------------------------ */

const E164 = /^\+[1-9]\d{7,14}$/;

/**
 * Converts local input to E.164, e.g.
 *   "0615123456"    -> "+252615123456"
 *   "615123456"     -> "+252615123456"
 *   "252615123456"  -> "+252615123456"
 *   "+252615123456" -> "+252615123456"
 * Returns null when the number is not valid.
 */
function normalizePhone(input) {
  if (!input) return null;
  let p = String(input).trim().replace(/[\s\-().]/g, '');
  if (p.startsWith('00')) p = `+${p.slice(2)}`;
  if (p.startsWith('+')) return E164.test(p) ? p : null;
  if (!/^\d+$/.test(p)) return null;

  const cc = String(process.env.DEFAULT_COUNTRY_CODE || '252');
  if (p.startsWith(cc) && p.length >= cc.length + 8) return `+${p}`;

  const full = `+${cc}${p.replace(/^0+/, '')}`;
  return E164.test(full) ? full : null;
}

/* ------------------------------------------------------------------ */
/* Message templates                                                   */
/* ------------------------------------------------------------------ */

const TEMPLATES = {
  so: {
    booked: (d) =>
      `${d.clinic}: Salaan ${d.name}, ballantaadu waa la xaqiijiyay. Lambarka safka: #${d.queue}. ` +
      `Dhakhtar: ${d.doctor}. Taariikh: ${d.date}${d.time ? `, saacad ${d.time}` : ''}. ` +
      `Fadlan yimaad 10 daqiiqo ka hor ballanta.`,
    next: (d) =>
      `${d.clinic}: Salaan ${d.name}, waxaad tahay qofka xiga ee safka (lambar #${d.queue}). Fadlan diyaar u ahow.`,
    called: (d) =>
      `${d.clinic}: Salaan ${d.name}, hadda waa lambarkaaga #${d.queue}. ` +
      `Fadlan gal qolka dhakhtarka${d.room ? ` (${d.room})` : ''}.`,
    cancelled: (d) =>
      `${d.clinic}: Salaan ${d.name}, ballantaadii ${d.date} (lambar #${d.queue}) waa la joojiyay. ` +
      `Fadlan nala soo xiriir si aad mid kale u qabsato.`,
  },
  en: {
    booked: (d) =>
      `${d.clinic}: Hello ${d.name}, your appointment is confirmed. Queue number: #${d.queue}. ` +
      `Doctor: ${d.doctor}. Date: ${d.date}${d.time ? ` at ${d.time}` : ''}. ` +
      `Please arrive 10 minutes early.`,
    next: (d) =>
      `${d.clinic}: Hello ${d.name}, you are next in the queue (number #${d.queue}). Please be ready.`,
    called: (d) =>
      `${d.clinic}: Hello ${d.name}, it is now your turn (#${d.queue}). ` +
      `Please go to the doctor's room${d.room ? ` (${d.room})` : ''}.`,
    cancelled: (d) =>
      `${d.clinic}: Hello ${d.name}, your appointment on ${d.date} (#${d.queue}) was cancelled. ` +
      `Please contact us to book a new one.`,
  },
};

/**
 * kind: 'booked' | 'next' | 'called' | 'cancelled'
 * appt must be populated: patient + doctor (doctor.user)
 */
function buildMessage(kind, appt) {
  const lang = process.env.MESSAGE_LANG === 'en' ? 'en' : 'so';
  const doctorName = appt.doctor?.user?.name;
  const data = {
    clinic: process.env.CLINIC_NAME || 'Rugta Caafimaadka',
    name: appt.patient?.fullName || '',
    queue: appt.queueNumber,
    doctor: doctorName ? `Dr. ${doctorName}` : '',
    room: appt.doctor?.room || '',
    date: appt.date,
    time: appt.time || '',
  };
  const tpl = TEMPLATES[lang][kind];
  if (!tpl) throw new Error(`Unknown message kind: ${kind}`);
  return tpl(data);
}

/* ------------------------------------------------------------------ */
/* Sending                                                             */
/* ------------------------------------------------------------------ */

const channelsFor = (override) => {
  const v = String(override || process.env.NOTIFY_CHANNEL || 'sms').toLowerCase();
  if (v === 'both') return ['sms', 'whatsapp'];
  return v === 'whatsapp' ? ['whatsapp'] : ['sms'];
};

const asWhatsApp = (n) => (String(n).startsWith('whatsapp:') ? n : `whatsapp:${n}`);

async function sendOne(channel, to, body) {
  if (!isConfigured()) {
    console.log(`[notify:SIMULATED:${channel}] -> ${to}\n  ${body}`);
    return { channel, ok: true, simulated: true };
  }

  const from =
    channel === 'whatsapp' ? process.env.TWILIO_WHATSAPP_NUMBER : process.env.TWILIO_PHONE_NUMBER;
  if (!from) {
    return {
      channel,
      ok: false,
      error: channel === 'whatsapp' ? 'TWILIO_WHATSAPP_NUMBER lama dhigin' : 'TWILIO_PHONE_NUMBER lama dhigin',
    };
  }

  try {
    const msg = await getClient().messages.create(
      channel === 'whatsapp'
        ? { from: asWhatsApp(from), to: asWhatsApp(to), body }
        : { from, to, body }
    );
    return { channel, ok: true, sid: msg.sid };
  } catch (err) {
    return { channel, ok: false, error: err.message };
  }
}

/**
 * Sends one message over the configured channel(s). Never throws.
 * @returns {{status:'sent'|'simulated'|'partial'|'failed', channels:string[], results:object[], error?:string, phone?:string}}
 */
async function sendNotification({ to, body, channel }) {
  const phone = normalizePhone(to);
  if (!phone) {
    return { status: 'failed', channels: [], results: [], error: 'Lambarka taleefanka waa khalad' };
  }

  const results = await Promise.all(channelsFor(channel).map((ch) => sendOne(ch, phone, body)));
  const ok = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);

  let status = 'failed';
  if (ok.length === results.length) status = results.every((r) => r.simulated) ? 'simulated' : 'sent';
  else if (ok.length > 0) status = 'partial';

  return {
    status,
    phone,
    channels: results.map((r) => r.channel),
    results,
    error: failed.length ? failed.map((r) => `${r.channel}: ${r.error}`).join('; ') : undefined,
  };
}

module.exports = {
  isConfigured,
  normalizePhone,
  buildMessage,
  sendNotification,
  channelsFor,
};
