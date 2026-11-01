import { useCallback, useEffect, useState } from 'react';
import api, { errMsg } from '../api';

function Stat({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 py-2">
      <p className="text-lg font-bold text-slate-800">{value}</p>
      <p className="text-slate-500">{label}</p>
    </div>
  );
}

/**
 * Live queue for one doctor (refreshes automatically).
 *  - staff (showNames):  sees patient names
 *  - patient:            sees numbers only; their own ticket is highlighted
 */
export default function QueueWidget({
  doctorId,
  doctorName,
  room,
  showNames = false,
  pollMs = 10000,
  limit = 8,
}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.get('/appointments/queue', { params: { doctorId } });
      setData(res.data);
      setError('');
    } catch (err) {
      setError(errMsg(err));
    }
  }, [doctorId]);

  useEffect(() => {
    load();
    const id = setInterval(load, pollMs);
    return () => clearInterval(id);
  }, [load, pollMs]);

  const serving = data?.nowServing;
  const waiting = data?.waiting || [];
  const myIndex = waiting.findIndex((a) => a.isMine);

  return (
    <div className="card">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="font-bold text-slate-800">{doctorName || 'Safka'}</h3>
          {room && <p className="text-xs text-slate-500">{room}</p>}
        </div>
        <span className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          Live
        </span>
      </div>

      {error && <p className="mb-2 rounded bg-red-50 p-2 text-xs text-red-700">{error}</p>}

      <div className="mb-3 rounded-xl bg-teal-700 p-4 text-center text-white">
        <p className="text-xs uppercase tracking-wide text-teal-100">Hadda la shaqeynayo</p>
        <p className="text-5xl font-extrabold">{serving ? `#${serving.queueNumber}` : '—'}</p>
        {showNames && serving?.patient && <p className="mt-1 text-sm">{serving.patient.fullName}</p>}
      </div>

      {serving?.isMine && (
        <p className="mb-3 rounded-lg bg-emerald-50 p-2 text-center text-sm font-semibold text-emerald-800">
          Hadda waa kuu dhacday, fadlan gal qolka!
        </p>
      )}
      {myIndex >= 0 && (
        <p className="mb-3 rounded-lg bg-amber-50 p-2 text-center text-sm text-amber-800">
          {myIndex === 0 ? 'Adigaa xiga!' : `Waxaa kaa horreeya ${myIndex} qof`}
        </p>
      )}

      <div className="mb-3 grid grid-cols-3 gap-2 text-center text-xs">
        <Stat label="Sugaya" value={data?.counts.waiting ?? 0} />
        <Stat label="Dhammaaday" value={data?.counts.completed ?? 0} />
        <Stat label="Wadarta" value={data?.counts.total ?? 0} />
      </div>

      {waiting.length ? (
        <ul className="space-y-1.5">
          {waiting.slice(0, limit).map((a) => (
            <li
              key={a._id}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                a.isMine ? 'bg-teal-50 font-semibold text-teal-800 ring-1 ring-teal-600' : 'bg-slate-50'
              }`}
            >
              <span className="font-bold">#{a.queueNumber}</span>
              <span className="truncate px-2">
                {showNames ? a.patient?.fullName : a.isMine ? 'Adiga' : ''}
              </span>
              <span className="text-xs text-slate-500">{a.time || ''}</span>
            </li>
          ))}
          {waiting.length > limit && (
            <li className="text-center text-xs text-slate-400">+{waiting.length - limit} kale</li>
          )}
        </ul>
      ) : (
        <p className="py-2 text-center text-sm text-slate-400">Cidna ma sugayso</p>
      )}
    </div>
  );
}
