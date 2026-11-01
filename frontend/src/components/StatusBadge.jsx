const STATUS = {
  waiting: ['Sugaya', 'bg-amber-100 text-amber-800'],
  in_progress: ['Gudaha ku jira', 'bg-blue-100 text-blue-800'],
  completed: ['Dhammaaday', 'bg-emerald-100 text-emerald-800'],
  cancelled: ['La joojiyay', 'bg-slate-200 text-slate-600'],
  no_show: ['Ma iman', 'bg-red-100 text-red-700'],
};

const NOTIFICATION = {
  sent: ['La diray', 'bg-emerald-100 text-emerald-800'],
  simulated: ['Tijaabo', 'bg-sky-100 text-sky-800'],
  partial: ['Qayb la diray', 'bg-amber-100 text-amber-800'],
  failed: ['Waa fashilmay', 'bg-red-100 text-red-700'],
};

export const STATUS_LABEL = Object.fromEntries(
  Object.entries(STATUS).map(([key, [label]]) => [key, label])
);

const pill = 'inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold';

export default function StatusBadge({ status }) {
  const [label, cls] = STATUS[status] || [status, 'bg-slate-100 text-slate-600'];
  return <span className={`${pill} ${cls}`}>{label}</span>;
}

// Shows the result of the last SMS / WhatsApp sent for an appointment
export function NotifBadge({ notification }) {
  if (!notification) return <span className="text-xs text-slate-400">—</span>;
  const [label, cls] = NOTIFICATION[notification.status] || [notification.status, 'bg-slate-100 text-slate-600'];
  return (
    <span className={`${pill} ${cls}`} title={notification.error || notification.message || ''}>
      {label}
    </span>
  );
}
