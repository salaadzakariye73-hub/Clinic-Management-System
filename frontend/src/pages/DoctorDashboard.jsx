import { useCallback, useEffect, useState } from 'react';
import api, { errMsg, todayLocal } from '../api';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';

const TABS = [
  { key: 'queue', label: 'Safkayga', icon: '🧑‍⚕️' },
  { key: 'history', label: 'Ballamaha', icon: '🗓️' },
];

function Notice({ msg }) {
  if (!msg?.text) return null;
  const cls = msg.type === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700';
  return <p className={`rounded-lg p-3 text-sm ${cls}`}>{msg.text}</p>;
}

/* ------------------------------------------------------------------ */
/* Today's queue with the "call next" workflow                         */
/* ------------------------------------------------------------------ */
function DoctorQueue() {
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      // the server resolves the doctor from the login token
      const res = await api.get('/appointments/queue');
      setData(res.data);
    } catch (err) {
      setMsg({ type: 'err', text: errMsg(err) });
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, [load]);

  const callNext = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const { data: res } = await api.post('/appointments/queue/call-next', {});
      setMsg({ type: 'ok', text: res.message });
      await load();
    } catch (err) {
      setMsg({ type: 'err', text: errMsg(err) });
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (id, status) => {
    setBusy(true);
    setMsg(null);
    try {
      await api.patch(`/appointments/${id}/status`, { status });
      await load();
    } catch (err) {
      setMsg({ type: 'err', text: errMsg(err) });
    } finally {
      setBusy(false);
    }
  };

  const serving = data?.nowServing;
  const waiting = data?.waiting || [];

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Safkaaga maanta</h2>
          <p className="text-sm text-slate-500">{data?.date}</p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={callNext}
          disabled={busy || (!serving && waiting.length === 0)}
        >
          Wac bukaanka xiga ➜
        </button>
      </div>

      <Notice msg={msg} />

      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          ['Sugaya', data?.counts.waiting],
          ['Dhammaaday', data?.counts.completed],
          ['Wadarta', data?.counts.total],
        ].map(([label, value]) => (
          <div key={label} className="card">
            <p className="text-2xl font-extrabold text-teal-800">{value ?? 0}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <p className="label">Hadda gudaha</p>
        {serving ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <span className="text-4xl font-extrabold text-teal-700">#{serving.queueNumber}</span>
              <div>
                <p className="font-semibold">{serving.patient?.fullName}</p>
                <p className="text-xs text-slate-500">{serving.patient?.phone}</p>
                {serving.reason && <p className="mt-1 text-sm text-slate-600">{serving.reason}</p>}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={busy}
                onClick={() => setStatus(serving._id, 'completed')}
              >
                Dhammee ✓
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={busy}
                onClick={() => setStatus(serving._id, 'no_show')}
              >
                Ma iman
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400">Bukaan gudaha ma jiro</p>
        )}
      </div>

      <div className="card">
        <p className="label">Sugaya ({waiting.length})</p>
        <ul className="divide-y divide-slate-100">
          {waiting.map((a) => (
            <li key={a._id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div className="flex items-center gap-3">
                <span className="w-12 text-xl font-extrabold text-slate-700">#{a.queueNumber}</span>
                <div>
                  <p className="font-semibold">{a.patient?.fullName}</p>
                  <p className="text-xs text-slate-500">
                    {a.time ? `${a.time} · ` : ''}
                    {a.reason || 'Sabab lama sheegin'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={busy || Boolean(serving)}
                  title={serving ? 'Marka hore dhammee bukaanka hadda jira' : 'Wac bukaankan'}
                  onClick={() => setStatus(a._id, 'in_progress')}
                >
                  Wac
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={busy}
                  onClick={() => setStatus(a._id, 'no_show')}
                >
                  Ma iman
                </button>
              </div>
            </li>
          ))}
          {waiting.length === 0 && (
            <li className="py-6 text-center text-sm text-slate-400">Cidna ma sugayso</li>
          )}
        </ul>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Appointment list for any day                                        */
/* ------------------------------------------------------------------ */
function DoctorHistory() {
  const [date, setDate] = useState(todayLocal());
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    setLoading(true);
    api
      .get('/appointments', { params: { date } })
      .then((res) => setItems(res.data))
      .catch((err) => setMsg({ type: 'err', text: errMsg(err) }))
      .finally(() => setLoading(false));
  }, [date]);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-xl font-bold">Ballamaha</h2>
        <div>
          <label className="label">Taariikh</label>
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      <Notice msg={msg} />

      <div className="card overflow-x-auto p-0 md:p-0">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Lambar</th>
              <th className="px-4 py-3">Bukaan</th>
              <th className="px-4 py-3">Sabab</th>
              <th className="px-4 py-3">Xaalad</th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => (
              <tr key={a._id} className="border-t border-slate-100">
                <td className="px-4 py-3 text-lg font-extrabold text-teal-800">#{a.queueNumber}</td>
                <td className="px-4 py-3">
                  <p className="font-semibold">{a.patient?.fullName}</p>
                  <p className="text-xs text-slate-500">{a.time || 'Saf toos ah'}</p>
                </td>
                <td className="px-4 py-3 text-slate-600">{a.reason || '—'}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={a.status} />
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
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
export default function DoctorDashboard() {
  const [tab, setTab] = useState('queue');
  const [doctor, setDoctor] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/doctors/me')
      .then((res) => setDoctor(res.data))
      .catch((err) => setError(errMsg(err)));
  }, []);

  const title = doctor ? `Dr. ${doctor.user?.name} · ${doctor.specialty}` : 'Panel-ka dhakhtarka';

  return (
    <Layout title={title} tabs={TABS} active={tab} onChange={setTab}>
      {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {tab === 'queue' && <DoctorQueue />}
      {tab === 'history' && <DoctorHistory />}
    </Layout>
  );
}
