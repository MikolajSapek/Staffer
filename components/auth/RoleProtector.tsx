import { getUserRole } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

interface RoleProtectorProps {
  children: React.ReactNode;
  allowedRoles: ('worker' | 'company' | 'admin')[];
  fallbackPath?: string;
}

/**
 * Server Component that protects routes based on user role
 * Redirects to fallbackPath (default: /unauthorized) if user doesn't have required role
 */
export default async function RoleProtector({
  children,
  allowedRoles,
  fallbackPath = '/unauthorized',
}: RoleProtectorProps) {
  const userRole = await getUserRole();

  if (!userRole) {
    redirect('/login');
  }

  if (!allowedRoles.includes(userRole)) {
    redirect(fallbackPath);
  }

  return <>{children}</>;
}

