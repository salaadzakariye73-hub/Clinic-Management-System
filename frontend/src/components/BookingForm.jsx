import { useEffect, useMemo, useState } from 'react';
import api, { errMsg, todayLocal } from '../api';

/**
 * Used by staff (picks a patient) and by patients (books for themselves).
 * Leave "time" empty for a walk-in queue ticket; set it for a timed appointment.
 */
export default function BookingForm({
  doctors,
  patients = [],
  isPatient = false,
  initialPatientId = '',
  onBooked,
}) {
  const [patientId, setPatientId] = useState(initialPatientId);
  const [search, setSearch] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [date, setDate] = useState(todayLocal());
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialPatientId) setPatientId(initialPatientId);
  }, [initialPatientId]);

  // preselect the first doctor once the list arrives
  useEffect(() => {
    if (!doctorId && doctors.length) setDoctorId(doctors[0]._id);
  }, [doctors, doctorId]);

  const visiblePatients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) =>
        p.fullName.toLowerCase().includes(q) ||
        (p.phone || '').includes(q) ||
        (p.patientCode || '').toLowerCase().includes(q)
    );
  }, [patients, search]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!isPatient && !patientId) return setError('Dooro bukaanka');
    if (!doctorId) return setError('Dooro dhakhtarka');

    setBusy(true);
    try {
      const payload = { doctorId, date, reason };
      if (time) payload.time = time;
      if (!isPatient) payload.patientId = patientId;

      const { data } = await api.post('/appointments', payload);
      setReason('');
      setTime('');
      onBooked(data);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {!isPatient && (
        <div>
          <label className="label">Bukaanka</label>
          <input
            className="input mb-2"
            placeholder="Raadi magac, taleefan ama koodh..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="input"
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            required
          >
            <option value="">— Dooro bukaan —</option>
            {visiblePatients.map((p) => (
              <option key={p._id} value={p._id}>
                {p.fullName} · {p.phone} · {p.patientCode}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="label">Dhakhtarka</label>
        <select
          className="input"
          value={doctorId}
          onChange={(e) => setDoctorId(e.target.value)}
          required
        >
          {doctors.length === 0 && <option value="">Dhakhtar ma jiro</option>}
          {doctors.map((d) => (
            <option key={d._id} value={d._id}>
              Dr. {d.user?.name} — {d.specialty}
              {d.room ? ` (${d.room})` : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Taariikh</label>
          <input
            type="date"
            className="input"
            min={todayLocal()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">Waqti (ikhtiyaari)</label>
          <input
            type="time"
            className="input"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="label">Sababta imaanshaha</label>
        <textarea
          className="input"
          rows={2}
          placeholder="Tusaale: madax-xanuun, baaritaan guud..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <button type="submit" className="btn btn-primary w-full" disabled={busy}>
        {busy ? 'Waa la qabanayaa...' : 'Qabso ballanta & hel lambarka safka'}
      </button>
      <p className="text-center text-xs text-slate-500">
        Bukaanka waxaa si otomaatig ah loogu soo diri doonaa SMS / WhatsApp oo ay ku jiraan lambarka
        safka iyo waqtiga.
      </p>
    </form>
  );
}
