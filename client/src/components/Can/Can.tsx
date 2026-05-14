import React from 'react';
import { useAuth } from '../../context/AuthContext';

interface CanProps {
  permission: string;
  children: React.ReactNode;
}

export const Can: React.FC<CanProps> = ({ permission, children }) => {
  const { user } = useAuth();

  if (!user || !user.permissions) {
    return null;
  }

  // Super Admin can do everything? (Optional logic if we have a super admin role)
  if (user.permissions.includes('ROLE_SUPER_ADMIN')) {
    return <>{children}</>;
  }

  const hasPermission = user.permissions.includes(permission);

  return hasPermission ? <>{children}</> : null;
};

export default Can;
