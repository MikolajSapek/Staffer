/**
 * @deprecated Use utils/supabase/server instead
 * This file is kept for backwards compatibility
 */
export { getCurrentUser, getCurrentProfile } from '@/utils/supabase/server';
import { getCurrentProfile } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export async function requireRole(role: 'worker' | 'company' | 'admin') {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect('/login');
  }

  const profileData = profile as { role: 'worker' | 'company' | 'admin' };
  const profileRole = profileData.role;
  if (profileRole !== role && profileRole !== 'admin') {
    redirect('/unauthorized');
  }

  return profile;
}

