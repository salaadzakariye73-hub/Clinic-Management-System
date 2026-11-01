// Confirmation modal shown after an appointment is booked.
// result = { appointment, notification } as returned by POST /api/appointments
export default function BookingSuccess({ result, onClose }) {
  if (!result) return null;

  const { appointment: a, notification: n } = result;
  const phone = a.patient?.phone;
  const channels = (n?.channels || []).join(' + ');

  const NOTICE = {
    sent: {
      cls: 'bg-emerald-50 text-emerald-800',
      text: `✅ Fariinta (${channels}) waa loo diray ${phone}`,
    },
    simulated: {
      cls: 'bg-sky-50 text-sky-800',
      text: 'ℹ️ Habka tijaabada: Twilio lama habayn, fariinta waxaa lagu daabacay server console-ka.',
    },
    partial: {
      cls: 'bg-amber-50 text-amber-800',
      text: `⚠️ Fariinta qayb ayaa la diray. ${n?.error || ''}`,
    },
    failed: {
      cls: 'bg-red-50 text-red-700',
      text: `⚠️ Fariinta lama diri karin: ${n?.error || 'cilad aan la garanayn'}. Ballantii waa la qabsaday.`,
    },
  };
  const notice = NOTICE[n?.status] || NOTICE.failed;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-xl">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-3xl">
          ✅
        </div>
        <h2 className="text-xl font-bold text-slate-800">Ballanta waa la qabsaday!</h2>

        <div className="my-4 rounded-2xl bg-teal-700 py-5 text-white">
          <p className="text-xs uppercase tracking-wide text-teal-100">Lambarka safka</p>
          <p className="text-6xl font-extrabold">#{a.queueNumber}</p>
        </div>

        <dl className="mb-4 space-y-1 text-left text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Bukaan</dt>
            <dd className="font-semibold">{a.patient?.fullName}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Dhakhtar</dt>
            <dd className="font-semibold">Dr. {a.doctor?.user?.name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Taariikh</dt>
            <dd className="font-semibold">
              {a.date}
              {a.time ? ` · ${a.time}` : ''}
            </dd>
          </div>
        </dl>

        <p className={`mb-4 rounded-lg p-3 text-left text-sm ${notice.cls}`}>{notice.text}</p>

        <button type="button" className="btn btn-primary w-full" onClick={onClose}>
          Hagaag
        </button>
      </div>
    </div>
  );
}
