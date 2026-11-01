import { useCallback, useEffect, useState } from 'react';
import api, { errMsg, todayLocal } from '../api';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import QueueWidget from '../components/QueueWidget';
import BookingForm from '../components/BookingForm';
import BookingSuccess from '../components/BookingSuccess';
import StatusBadge, { NotifBadge, STATUS_LABEL } from '../components/StatusBadge';

const ALL_TABS = [
  { key: 'overview', label: 'Dashboard', icon: '📊' },
  { key: 'book', label: 'Ballan qabso', icon: '📅' },
  { key: 'appointments', label: 'Ballamaha', icon: '🗓️' },
  { key: 'patients', label: 'Bukaanada', icon: '🧑‍🤝‍🧑' },
  { key: 'doctors', label: 'Dhakhaatiirta', icon: '🩺', roles: ['admin'] },
  { key: 'notifications', label: 'Ogeysiisyada', icon: '💬' },
];

const GENDER = { male: 'Lab', female: 'Dumar', other: 'Kale' };

function Notice({ msg }) {
  if (!msg?.text) return null;
  const cls = msg.type === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700';
  return <p className={`rounded-lg p-3 text-sm ${cls}`}>{msg.text}</p>;
}

/* ------------------------------------------------------------------ */
/* Overview: today's numbers + one live queue per doctor               */
/* ------------------------------------------------------------------ */
function Overview({ doctors }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const load = () =>
      api
        .get('/appointments/stats')
        .then((res) => setStats(res.data))
        .catch(() => {});
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

  const cards = [
    ['Ballamaha maanta', stats?.today.total, '📅'],
    ['Sugaya', stats?.today.waiting, '⏳'],
    ['Dhammaaday', stats?.today.completed, '✅'],
    ['Bukaanada guud', stats?.patients, '🧑‍🤝‍🧑'],
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Dashboard-ka</h2>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(([label, value, icon]) => (
          <div key={label} className="card">
            <p className="text-2xl">{icon}</p>
            <p className="mt-1 text-3xl font-extrabold text-teal-800">{value ?? '…'}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      <h3 className="font-bold">Safka dhakhaatiirta (live)</h3>
      {doctors.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {doctors.map((d) => (
            <QueueWidget
              key={d._id}
              doctorId={d._id}
              doctorName={`Dr. ${d.user?.name}`}
              room={d.room}
              showNames
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">Weli dhakhtar lama diiwaangelin.</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Appointments: filter, change status, resend SMS / WhatsApp          */
/* ------------------------------------------------------------------ */
function Appointments({ doctors }) {
  const [filters, setFilters] = useState({ date: todayLocal(), doctorId: '', status: '' });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const { data } = await api.get('/appointments', { params });
      setItems(data);
    } catch (err) {
      setMsg({ type: 'err', text: errMsg(err) });
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const changeStatus = async (id, status) => {
    try {
      await api.patch(`/appointments/${id}/status`, { status });
      await load();
    } catch (err) {
      setMsg({ type: 'err', text: errMsg(err) });
    }
  };

  const resend = async (id) => {
    try {
      const { data } = await api.post(`/notifications/appointments/${id}/resend`, { kind: 'booked' });
      setMsg({ type: 'ok', text: `Ogeysiiska dib ayaa loo diray (${data.notification.status})` });
      await load();
    } catch (err) {
      setMsg({ type: 'err', text: errMsg(err) });
    }
  };

  const setFilter = (key) => (e) => setFilters({ ...filters, [key]: e.target.value });

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Ballamaha</h2>

      <div className="card grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label">Taariikh</label>
          <input type="date" className="input" value={filters.date} onChange={setFilter('date')} />
        </div>
        <div>
          <label className="label">Dhakhtar</label>
          <select className="input" value={filters.doctorId} onChange={setFilter('doctorId')}>
            <option value="">Dhammaan</option>
            {doctors.map((d) => (
              <option key={d._id} value={d._id}>
                Dr. {d.user?.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Xaalad</label>
          <select className="input" value={filters.status} onChange={setFilter('status')}>
            <option value="">Dhammaan</option>
            {Object.entries(STATUS_LABEL).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Notice msg={msg} />

      <div className="card overflow-x-auto p-0 md:p-0">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Lambar</th>
              <th className="px-4 py-3">Bukaan</th>
              <th className="px-4 py-3">Dhakhtar</th>
              <th className="px-4 py-3">Taariikh</th>
              <th className="px-4 py-3">Xaalad</th>
              <th className="px-4 py-3">Ogeysiis</th>
              <th className="px-4 py-3">Ficil</th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => {
              const last = a.notifications?.length ? a.notifications[a.notifications.length - 1] : null;
              return (
                <tr key={a._id} className="border-t border-slate-100">
                  <td className="px-4 py-3 text-lg font-extrabold text-teal-800">#{a.queueNumber}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{a.patient?.fullName}</p>
                    <p className="text-xs text-slate-500">{a.patient?.phone}</p>
                  </td>
                  <td className="px-4 py-3">Dr. {a.doctor?.user?.name}</td>
                  <td className="px-4 py-3">
                    {a.date}
                    {a.time ? ` · ${a.time}` : ''}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="px-4 py-3">
                    <NotifBadge notification={last} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <select
                        className="input !w-auto py-1 text-xs"
                        value={a.status}
                        onChange={(e) => changeStatus(a._id, e.target.value)}
                      >
                        {Object.entries(STATUS_LABEL).map(([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        title="Dib u dir SMS / WhatsApp"
                        onClick={() => resend(a._id)}
                      >
                        💬
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  Ballan lama helin
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {loading && <p className="p-4 text-center text-sm text-slate-400">Waa la raraya...</p>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Patients: register + search + book                                  */
/* ------------------------------------------------------------------ */
const EMPTY_PATIENT = {
  fullName: '',
  phone: '',
  gender: '',
  dateOfBirth: '',
  address: '',
  medicalNotes: '',
};

function Patients({ patients, reload, isAdmin, onBookFor }) {
  const [form, setForm] = useState(EMPTY_PATIENT);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const needle = q.trim().toLowerCase();
  const shown = needle
    ? patients.filter(
        (p) =>
          p.fullName.toLowerCase().includes(needle) ||
          (p.phone || '').includes(needle) ||
          (p.patientCode || '').toLowerCase().includes(needle)
      )
    : patients;

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const payload = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ''));
      await api.post('/patients', payload);
      setForm(EMPTY_PATIENT);
      await reload();
      setMsg({ type: 'ok', text: 'Bukaanka waa la diiwaangeliyay' });
    } catch (err) {
      setMsg({ type: 'err', text: errMsg(err) });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (p) => {
    if (!window.confirm(`Ma hubtaa inaad tirtirto ${p.fullName}?`)) return;
    try {
      await api.delete(`/patients/${p._id}`);
      await reload();
    } catch (err) {
      setMsg({ type: 'err', text: errMsg(err) });
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Bukaanada</h2>
      <Notice msg={msg} />

      <div className="grid gap-4 lg:grid-cols-3">
        <form onSubmit={save} className="card space-y-3 lg:col-span-1">
          <h3 className="font-bold">Bukaan cusub</h3>
          <div>
            <label className="label">Magaca oo dhan</label>
            <input className="input" value={form.fullName} onChange={set('fullName')} required />
          </div>
          <div>
            <label className="label">Taleefan</label>
            <input
              className="input"
              type="tel"
              placeholder="061xxxxxxx"
              value={form.phone}
              onChange={set('phone')}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Jinsi</label>
              <select className="input" value={form.gender} onChange={set('gender')}>
                <option value="">—</option>
                {Object.entries(GENDER).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Dhalasho</label>
              <input
                className="input"
                type="date"
                max={todayLocal()}
                value={form.dateOfBirth}
                onChange={set('dateOfBirth')}
              />
            </div>
          </div>
          <div>
            <label className="label">Cinwaan</label>
            <input className="input" value={form.address} onChange={set('address')} />
          </div>
          <div>
            <label className="label">Xog caafimaad</label>
            <textarea
              className="input"
              rows={2}
              value={form.medicalNotes}
              onChange={set('medicalNotes')}
            />
          </div>
          <button type="submit" className="btn btn-primary w-full" disabled={busy}>
            {busy ? 'Waa la keydinayaa...' : 'Diiwaangeli'}
          </button>
        </form>

        <div className="card lg:col-span-2">
          <input
            className="input mb-3"
            placeholder="Raadi magac, taleefan ama koodh..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <ul className="divide-y divide-slate-100">
            {shown.map((p) => (
              <li key={p._id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="font-semibold">
                    {p.fullName} <span className="text-xs font-normal text-slate-400">{p.patientCode}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    {p.phone}
                    {p.gender ? ` · ${GENDER[p.gender]}` : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => onBookFor(p._id)}
                  >
                    Ballan qabso
                  </button>
                  {isAdmin && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => remove(p)}>
                      🗑️
                    </button>
                  )}
                </div>
              </li>
            ))}
            {shown.length === 0 && (
              <li className="py-6 text-center text-sm text-slate-400">Bukaan lama helin</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Doctors (admin): create account + profile, toggle availability      */
/* ------------------------------------------------------------------ */
const EMPTY_DOCTOR = { name: '', email: '', password: '', phone: '', specialty: '', room: '' };

function Doctors({ doctors, reload }) {
  const [form, setForm] = useState(EMPTY_DOCTOR);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const payload = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ''));
      await api.post('/doctors', payload);
      setForm(EMPTY_DOCTOR);
      await reload();
      setMsg({ type: 'ok', text: 'Dhakhtarka waa la abuuray' });
    } catch (err) {
      setMsg({ type: 'err', text: errMsg(err) });
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (d) => {
    try {
      await api.put(`/doctors/${d._id}`, { isAvailable: !d.isAvailable });
      await reload();
    } catch (err) {
      setMsg({ type: 'err', text: errMsg(err) });
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Dhakhaatiirta</h2>
      <Notice msg={msg} />

      <div className="grid gap-4 lg:grid-cols-3">
        <form onSubmit={save} className="card space-y-3">
          <h3 className="font-bold">Dhakhtar cusub</h3>
          <div>
            <label className="label">Magaca</label>
            <input className="input" value={form.name} onChange={set('name')} required />
          </div>
          <div>
            <label className="label">Takhasus</label>
            <input
              className="input"
              placeholder="Tusaale: Carruurta"
              value={form.specialty}
              onChange={set('specialty')}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Qol</label>
              <input className="input" value={form.room} onChange={set('room')} />
            </div>
            <div>
              <label className="label">Taleefan</label>
              <input className="input" type="tel" value={form.phone} onChange={set('phone')} />
            </div>
          </div>
          <div>
            <label className="label">Email (login)</label>
            <input className="input" type="email" value={form.email} onChange={set('email')} required />
          </div>
          <div>
            <label className="label">Fure</label>
            <input
              className="input"
              type="password"
              minLength={6}
              value={form.password}
              onChange={set('password')}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary w-full" disabled={busy}>
            {busy ? 'Waa la keydinayaa...' : 'Abuur dhakhtar'}
          </button>
        </form>

        <div className="card lg:col-span-2">
          <ul className="divide-y divide-slate-100">
            {doctors.map((d) => (
              <li key={d._id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="font-semibold">Dr. {d.user?.name}</p>
                  <p className="text-xs text-slate-500">
                    {d.specialty}
                    {d.room ? ` · ${d.room}` : ''} · {d.user?.email}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggle(d)}
                  className={`btn btn-sm ${d.isAvailable ? 'btn-ghost' : 'btn-danger'}`}
                >
                  {d.isAvailable ? 'Shaqeynaya ✓' : 'Ma shaqeynayo'}
                </button>
              </li>
            ))}
            {doctors.length === 0 && (
              <li className="py-6 text-center text-sm text-slate-400">Dhakhtar ma jiro</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Notifications: Twilio status + custom SMS / WhatsApp                */
/* ------------------------------------------------------------------ */
function Notifications({ patients }) {
  const [status, setStatus] = useState(null);
  const [form, setForm] = useState({ patientId: '', phone: '', message: '', channel: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    api
      .get('/notifications/status')
      .then((res) => setStatus(res.data))
      .catch(() => {});
  }, []);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const send = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const payload = { message: form.message };
      if (form.patientId) payload.patientId = form.patientId;
      else payload.phone = form.phone;
      if (form.channel) payload.channel = form.channel;

      const { data } = await api.post('/notifications/send', payload);
      setMsg({ type: 'ok', text: `Fariinta waa la diray (${data.status}) → ${data.phone}` });
      setForm({ ...form, message: '' });
    } catch (err) {
      setMsg({ type: 'err', text: errMsg(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h2 className="text-xl font-bold">Ogeysiisyada</h2>

      {status && (
        <div
          className={`rounded-lg p-3 text-sm ${
            status.configured ? 'bg-emerald-50 text-emerald-800' : 'bg-sky-50 text-sky-800'
          }`}
        >
          {status.configured
            ? `✅ Twilio waa shaqeynayaa. Channel: ${status.channels.join(' + ')}`
            : 'ℹ️ Habka tijaabada (simulation): Twilio lama habayn. Geli TWILIO_* gudaha backend/.env si fariimaha dhabta ah loo diro.'}
        </div>
      )}

      <form onSubmit={send} className="card space-y-3">
        <h3 className="font-bold">Fariin gaar ah u dir</h3>
        <div>
          <label className="label">Bukaan</label>
          <select className="input" value={form.patientId} onChange={set('patientId')}>
            <option value="">— ama geli lambar hoose —</option>
            {patients.map((p) => (
              <option key={p._id} value={p._id}>
                {p.fullName} · {p.phone}
              </option>
            ))}
          </select>
        </div>
        {!form.patientId && (
          <div>
            <label className="label">Lambarka taleefanka</label>
            <input
              className="input"
              type="tel"
              placeholder="061xxxxxxx"
              value={form.phone}
              onChange={set('phone')}
              required
            />
          </div>
        )}
        <div>
          <label className="label">Channel</label>
          <select className="input" value={form.channel} onChange={set('channel')}>
            <option value="">Caadi (sida ku qoran .env)</option>
            <option value="sms">SMS</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="both">Labadaba</option>
          </select>
        </div>
        <div>
          <label className="label">Fariinta</label>
          <textarea
            className="input"
            rows={3}
            value={form.message}
            onChange={set('message')}
            required
          />
        </div>
        <Notice msg={msg} />
        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          {busy ? 'Waa la dirayaa...' : 'Dir fariinta'}
        </button>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
export default function AdminDashboard() {
  const { user } = useAuth();
  const tabs = ALL_TABS.filter((t) => !t.roles || t.roles.includes(user.role));

  const [tab, setTab] = useState('overview');
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [success, setSuccess] = useState(null);
  const [preselect, setPreselect] = useState('');
  const [loadError, setLoadError] = useState('');

  const loadDoctors = useCallback(async () => {
    try {
      const { data } = await api.get('/doctors');
      setDoctors(data);
    } catch (err) {
      setLoadError(errMsg(err));
    }
  }, []);

  const loadPatients = useCallback(async () => {
    try {
      const { data } = await api.get('/patients', { params: { limit: 500 } });
      setPatients(data);
    } catch (err) {
      setLoadError(errMsg(err));
    }
  }, []);

  useEffect(() => {
    loadDoctors();
    loadPatients();
  }, [loadDoctors, loadPatients]);

  const availableDoctors = doctors.filter((d) => d.isAvailable);

  return (
    <Layout
      title={user.role === 'admin' ? 'Panel-ka maamulka' : 'Panel-ka soo-dhaweynta'}
      tabs={tabs}
      active={tab}
      onChange={setTab}
    >
      {loadError && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{loadError}</p>}

      {tab === 'overview' && <Overview doctors={availableDoctors} />}

      {tab === 'book' && (
        <div className="mx-auto max-w-2xl space-y-4">
          <h2 className="text-xl font-bold">Ballan qabso / Lambar saf</h2>
          <div className="card">
            <BookingForm
              doctors={availableDoctors}
              patients={patients}
              initialPatientId={preselect}
              onBooked={setSuccess}
            />
          </div>
        </div>
      )}

      {tab === 'appointments' && <Appointments doctors={doctors} />}

      {tab === 'patients' && (
        <Patients
          patients={patients}
          reload={loadPatients}
          isAdmin={user.role === 'admin'}
          onBookFor={(id) => {
            setPreselect(id);
            setTab('book');
          }}
        />
      )}

      {tab === 'doctors' && <Doctors doctors={doctors} reload={loadDoctors} />}

      {tab === 'notifications' && <Notifications patients={patients} />}

      <BookingSuccess result={success} onClose={() => setSuccess(null)} />
    </Layout>
  );
}
