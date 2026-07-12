'use client';

import { ReactNode } from 'react';
import { useRole } from '@/hooks/useRole';

export function RoleGate({
  allow,
  children,
  fallback = null,
}: {
  allow: Array<'Admin' | 'Asset Manager' | 'Department Head' | 'Employee'>;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const role = useRole();
  if (!role || !allow.includes(role)) return <>{fallback}</>;
  return <>{children}</>;
}
