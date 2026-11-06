import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export default function RequireRole({ roles }) {
  const { session } = useAuth();

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (!roles.includes(session.user.role)) {
    return (
      <section>
        <h1>Từ chối truy cập</h1>
        <p>Bạn không có quyền mở trang này.</p>
      </section>
    );
  }

  return <Outlet />;
}
