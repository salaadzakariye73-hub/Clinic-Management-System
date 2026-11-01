import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth, homeFor } from '../context/AuthContext';
import { errMsg } from '../api';

export default function Login() {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState('login'); // 'login' | 'register' (patients only)
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const u = mode === 'login' ? await login(form.email, form.password) : await register(form);
      navigate(homeFor(u.role), { replace: true });
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-700 via-teal-600 to-emerald-500 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl md:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-3xl">
            🏥
          </div>
          <h1 className="text-2xl font-extrabold text-teal-800">Clinic Management</h1>
          <p className="text-sm text-slate-500">Nidaamka maamulka rugta caafimaadka</p>
        </div>

        <div className="mb-5 grid grid-cols-2 rounded-lg bg-slate-100 p-1 text-sm font-semibold">
          {[
            ['login', 'Gal'],
            ['register', 'Bukaan cusub'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setMode(key);
                setError('');
              }}
              className={`rounded-md py-2 transition ${
                mode === key ? 'bg-white text-teal-800 shadow' : 'text-slate-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === 'register' && (
            <>
              <div>
                <label className="label">Magaca oo dhan</label>
                <input className="input" value={form.name} onChange={set('name')} required />
              </div>
              <div>
                <label className="label">Taleefanka (SMS / WhatsApp)</label>
                <input
                  className="input"
                  type="tel"
                  placeholder="061xxxxxxx ama +25261xxxxxxx"
                  value={form.phone}
                  onChange={set('phone')}
                  required
                />
              </div>
            </>
          )}

          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              autoComplete="username"
              value={form.email}
              onChange={set('email')}
              required
            />
          </div>
          <div>
            <label className="label">Fure</label>
            <input
              className="input"
              type="password"
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={form.password}
              onChange={set('password')}
              required
            />
          </div>

          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

          <button type="submit" className="btn btn-primary w-full" disabled={busy}>
            {busy ? 'Fadlan sug...' : mode === 'login' ? 'Gal' : 'Isdiiwaangeli'}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-slate-400">
          Shaqaalaha akoonkooda waxaa abuura maamulaha.
        </p>
      </div>
    </div>
  );
}
