import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({
  element,
  user,
  requiredRole,
}) {
  if (!user) {
    return <Navigate to="/login" />;
  }

  if (requiredRole && !requiredRole.includes(user.role)) {
    return <Navigate to="/dashboard" />;
  }

  return element;
}
