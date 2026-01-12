'use server';

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export interface Payment {
  id: string;
  amount: number;
  status: 'pending' | 'paid' | 'cancelled';
  currency: string;
  shift_title_snapshot: string;
  worker_name_snapshot: string;
  created_at: string;
  hours_worked: number;
  hourly_rate: number;
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
      .eq('status', 'pending');

    if (pendingError) {
      console.error('Error fetching pending payments:', pendingError);
      return { error: 'Failed to fetch pending payments' };
    }

    // Calculate total pending amount
    const totalPending = (pendingData || []).reduce((sum, payment) => {
      return sum + (parseFloat(payment.amount.toString()) || 0);
    }, 0);

    // Get all payments sorted by created_at desc
    const { data: paymentsData, error: paymentsError } = await supabase
      .from('payments')
      .select('id, amount, status, shift_title_snapshot, worker_name_snapshot, created_at, hours_worked, hourly_rate')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError);
      return { error: 'Failed to fetch payment history' };
    }

    // Map payments to Payment interface (default currency is DKK)
    const transactions: Payment[] = (paymentsData || []).map((payment) => ({
      id: payment.id,
      amount: parseFloat(payment.amount.toString()) || 0,
      status: payment.status as 'pending' | 'paid' | 'cancelled',
      currency: 'DKK', // Default currency
      shift_title_snapshot: payment.shift_title_snapshot || '',
      worker_name_snapshot: payment.worker_name_snapshot || '',
      created_at: payment.created_at,
      hours_worked: parseFloat(payment.hours_worked?.toString() || '0') || 0,
      hourly_rate: parseFloat(payment.hourly_rate?.toString() || '0') || 0,
    }));

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
