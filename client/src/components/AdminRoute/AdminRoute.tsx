import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { adminApi } from '../../services/api';
import './AdminRoute.css';

export default function AdminRoute({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    adminApi.checkAdmin()
      .then(() => setIsAdmin(true))
      .catch(() => setIsAdmin(false));
  }, []);

  if (isAdmin === null) {
    return <div className="admin-loading">Checking permissions...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="admin-access-denied">
        <h2>🚫 Access Denied</h2>
        <p>Tính năng này chỉ dành cho Quản trị viên (Admin).</p>
      </div>
    );
  }

  return <>{children}</>;
}
