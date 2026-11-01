import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROLE_LABEL = {
  admin: 'Maamule',
  receptionist: 'Soo-dhaweeye',
  doctor: 'Dhakhtar',
  patient: 'Bukaan',
};

export default function Navbar({ title, onMenu }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenu}
          className="rounded-lg p-2 text-xl hover:bg-slate-100 md:hidden"
          aria-label="Menu"
        >
          ☰
        </button>
        <span className="text-2xl">🏥</span>
        <div className="leading-tight">
          <p className="font-bold text-teal-800">Clinic Management</p>
          <p className="hidden text-xs text-slate-500 sm:block">{title}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden text-right leading-tight sm:block">
          <p className="text-sm font-semibold">{user?.name}</p>
          <p className="text-xs text-slate-500">{ROLE_LABEL[user?.role]}</p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={handleLogout}>
          Ka bax
        </button>
      </div>
    </header>
  );
}
