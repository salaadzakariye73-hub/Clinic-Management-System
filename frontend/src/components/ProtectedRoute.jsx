import { Navigate } from 'react-router-dom';
import { useAuth, homeFor } from '../context/AuthContext';

export function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center text-slate-500">
      <div className="flex items-center gap-3">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-teal-700 border-t-transparent" />
        Waa la raraya...
      </div>
    </div>
  );
}

// <ProtectedRoute roles={['admin']}> — blocks anonymous users and wrong roles
export default function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth();

  if (loading) return <Splash />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;

  return children;
}
