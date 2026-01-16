'use server';

import { createClient } from '@/utils/supabase/server';

/**
 * Get notification counts for company users
 * Returns counts of pending shift_applications and pending payments
 */
export async function getCompanyNotificationCounts() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { candidates: 0, finances: 0 };
  }

  // Execute both count queries in parallel
  const [candidatesResult, financesResult] = await Promise.all([
    // Count pending shift_applications
    supabase
      .from('shift_applications')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', user.id)
      .eq('status', 'pending'),
    
    // Count pending payments
    supabase
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', user.id)
      .eq('payment_status', 'pending'),
  ]);

  return {
    candidates: candidatesResult.count || 0,
    finances: financesResult.count || 0,
  };
}
