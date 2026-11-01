import { useCallback, useEffect, useState } from 'react';
import api, { errMsg, todayLocal } from '../api';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import QueueWidget from '../components/QueueWidget';
import BookingForm from '../components/BookingForm';
import BookingSuccess from '../components/BookingSuccess';
import StatusBadge from '../components/StatusBadge';

const TABS = [
  { key: 'mine', label: 'Ballamahayga', icon: '🗓️' },
  { key: 'book', label: 'Ballan qabso', icon: '📅' },
];

/* ------------------------------------------------------------------ */
/* My appointments + live queue for today's active ones                */
/* ------------------------------------------------------------------ */
function MyAppointments({ onNew }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/appointments'); // the server returns only my own
      setItems(data);
      setError('');
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [load]);

  const cancel = async (id) => {
    if (!window.confirm('Ma hubtaa inaad joojiso ballantan?')) return;
    try {
      await api.patch(`/appointments/${id}/status`, { status: 'cancelled' });
      await load();
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const today = todayLocal();
  const activeToday = items.filter(
    (a) => a.date === today && ['waiting', 'in_progress'].includes(a.status)
  );

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Ballamahayga</h2>
        <button type="button" className="btn btn-primary btn-sm" onClick={onNew}>
          + Ballan cusub
        </button>
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {activeToday.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold">Safka maanta (live)</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {activeToday.map((a) => (
              <div key={a._id} className="space-y-2">
                <p className="rounded-lg bg-teal-50 p-2 text-center text-sm text-teal-800">
                  Lambarkaaga: <span className="text-lg font-extrabold">#{a.queueNumber}</span>
                </p>
                <QueueWidget
                  doctorId={a.doctor?._id}
                  doctorName={`Dr. ${a.doctor?.user?.name}`}
                  room={a.doctor?.room}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <h3 className="font-bold">Dhammaan ballamaha</h3>
      <div className="space-y-3">
        {items.map((a) => (
          <div key={a._id} className="card flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-teal-700 text-white">
              <span className="text-[10px] uppercase text-teal-100">Lambar</span>
              <span className="text-2xl font-extrabold leading-none">#{a.queueNumber}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Dr. {a.doctor?.user?.name}</p>
              <p className="text-xs text-slate-500">
                {a.date}
                {a.time ? ` · ${a.time}` : ''}
                {a.doctor?.room ? ` · ${a.doctor.room}` : ''}
              </p>
              {a.reason && <p className="truncate text-sm text-slate-600">{a.reason}</p>}
            </div>
            <div className="flex flex-col items-end gap-2">
              <StatusBadge status={a.status} />
              {a.status === 'waiting' && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => cancel(a._id)}>
                  Jooji
                </button>
              )}
            </div>
          </div>
        ))}
        {!loading && items.length === 0 && (
          <p className="card text-center text-sm text-slate-400">Weli ballan ma lihid</p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
export default function PatientPortal() {
  const { user } = useAuth();
  const [tab, setTab] = useState('mine');
  const [doctors, setDoctors] = useState([]);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/doctors') // patients only receive available doctors
      .then((res) => setDoctors(res.data))
      .catch((err) => setError(errMsg(err)));
  }, []);

  return (
    <Layout title={`Salaan, ${user.name}`} tabs={TABS} active={tab} onChange={setTab}>
      {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {tab === 'mine' && <MyAppointments onNew={() => setTab('book')} />}

      {tab === 'book' && (
        <div className="mx-auto max-w-xl space-y-4">
          <h2 className="text-xl font-bold">Ballan qabso</h2>
          <div className="card">
            <BookingForm doctors={doctors} isPatient onBooked={setSuccess} />
          </div>
        </div>
      )}

      <BookingSuccess
        result={success}
        onClose={() => {
          setSuccess(null);
          setTab('mine');
        }}
      />
    </Layout>
  );
}
