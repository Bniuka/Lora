import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { FullPageLoader } from './ui';

export function ProtectedRoute({ children, allowedRole }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading || (user && !profile)) return <FullPageLoader />;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRole && profile.role !== allowedRole) {
    const redirect = profile.role === 'creator' ? '/creator/dashboard' : '/learner/dashboard';
    if (location.pathname !== redirect) {
      return <Navigate to={redirect} replace />;
    }
  }

  return children;
}
