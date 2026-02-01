'use server';

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export interface Payment {
  id: string;
  application_id: string; // Unique per application - use for React key to prevent ghost rows
  amount: number;
  payment_status: 'pending' | 'paid' | 'cancelled';
  currency: string;
  shift_title_snapshot: string;
  worker_name_snapshot: string;
  created_at: string;
  hours_worked: number;
  hourly_rate: number;
  metadata: { resolution_type?: string; [key: string]: any } | null;
  profiles?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    worker_details?: {
      avatar_url: string | null;
    } | null;
  } | null;
}

export interface CompanyFinancesResult {
  summary: {
    totalPending: number;
    currency: string;
  };
  transactions: Payment[];
}

/**
 * Get company finances (pending payments sum and payment history)
 * Verifies that companyId matches auth.uid() for security
 */
export async function getCompanyFinances(companyId: string): Promise<CompanyFinancesResult | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'User not authenticated' };
  }

  // Security: Verify that companyId matches authenticated user
  if (companyId !== user.id) {
    return { error: 'Unauthorized: Company ID does not match authenticated user' };
  }

  try {
    // Get sum of pending payments
    const { data: pendingData, error: pendingError } = await supabase
      .from('payments')
      .select('amount')
      .eq('company_id', companyId)
      .eq('payment_status', 'pending');

    if (pendingError) {
      console.error('Error fetching pending payments:', pendingError);
      return { error: 'Failed to fetch pending payments' };
    }

    // Calculate total pending amount
    const totalPending = (pendingData || []).reduce((sum, payment) => {
      return sum + (parseFloat(payment.amount.toString()) || 0);
    }, 0);

    // Get all payments sorted by created_at desc (application_id for React key deduplication)
    const { data: paymentsData, error: paymentsError } = await supabase
      .from('payments')
      .select('id, application_id, amount, payment_status, shift_title_snapshot, worker_name_snapshot, created_at, hours_worked, hourly_rate, metadata, worker_id')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError);
      return { error: 'Failed to fetch payment history' };
    }

    // Fetch profiles and worker_details separately for avatars
    // Get unique worker_ids from payments
    const workerIds = [...new Set((paymentsData || []).map((p: any) => p.worker_id).filter(Boolean))];
    
    let profilesMap: Record<string, { 
      id: string; 
      first_name: string; 
      last_name: string; 
      email: string; 
      worker_details: { avatar_url: string | null } | null;
    }> = {};

    if (workerIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          email,
          worker_details (
            avatar_url
          )
        `)
        .in('id', workerIds);

      if (profilesError) {
        console.warn('Error fetching profiles for avatars:', profilesError);
        // Continue without avatars - not critical
      } else if (profilesData) {
        // Build profiles map
        profilesData.forEach((profile: any) => {
          const workerDetails = Array.isArray(profile.worker_details) 
            ? profile.worker_details[0] 
            : profile.worker_details;
          
          profilesMap[profile.id] = {
            id: profile.id,
            first_name: profile.first_name || '',
            last_name: profile.last_name || '',
            email: profile.email || '',
            worker_details: workerDetails ? {
              avatar_url: workerDetails.avatar_url,
            } : null,
          };
        });
      }
    }

    // Map payments to Payment interface (default currency is DKK)
    // Deduplicate by application_id - constraint guarantees 1 payment per application
    const seenApplicationIds = new Set<string>();
    const transactions: Payment[] = (paymentsData || [])
      .filter((payment: any) => {
        const appId = payment.application_id;
        if (!appId || seenApplicationIds.has(appId)) return false;
        seenApplicationIds.add(appId);
        return true;
      })
      .map((payment: any) => {
      // Get profile data from map (if available)
      const profile = payment.worker_id ? profilesMap[payment.worker_id] : null;

      return {
        id: payment.id,
        application_id: payment.application_id,
        amount: parseFloat(payment.amount.toString()) || 0,
        payment_status: payment.payment_status as 'pending' | 'paid' | 'cancelled',
        currency: 'DKK', // Default currency
        shift_title_snapshot: payment.shift_title_snapshot || '',
        worker_name_snapshot: payment.worker_name_snapshot || '',
        created_at: payment.created_at,
        hours_worked: parseFloat(payment.hours_worked?.toString() || '0') || 0,
        hourly_rate: parseFloat(payment.hourly_rate?.toString() || '0') || 0,
        metadata: payment.metadata as { resolution_type?: string; [key: string]: any } | null,
        profiles: profile || null,
      };
    });

    return {
      summary: {
        totalPending,
        currency: 'DKK',
      },
      transactions,
    };
  } catch (error) {
    console.error('Unexpected error in getCompanyFinances:', error);
    return { error: 'An unexpected error occurred' };
  }
}
