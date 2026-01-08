/**
 * RLS POLICIES SQL - Run this in Supabase SQL Editor if you get permission errors:
 * 
 * -- Ensure companies can SELECT timesheets for their shifts
 * DROP POLICY IF EXISTS "Companies can view timesheets for their shifts" ON timesheets;
 * CREATE POLICY "Companies can view timesheets for their shifts"
 *   ON timesheets FOR SELECT
 *   USING (
 *     EXISTS (
 *       SELECT 1 FROM shifts
 *       WHERE shifts.id = timesheets.shift_id
 *       AND shifts.company_id = auth.uid()
 *     )
 *   );
 * 
 * -- Ensure companies can UPDATE timesheets for their shifts
 * DROP POLICY IF EXISTS "Companies can update timesheets for their shifts" ON timesheets;
 * CREATE POLICY "Companies can update timesheets for their shifts"
 *   ON timesheets FOR UPDATE
 *   USING (
 *     EXISTS (
 *       SELECT 1 FROM shifts
 *       WHERE shifts.id = timesheets.shift_id
 *       AND shifts.company_id = auth.uid()
 *     )
 *   );
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getDictionary } from '@/app/[lang]/dictionaries';
import TimesheetsClient from '@/app/[lang]/(company)/timesheets/TimesheetsClient';

export default async function TimesheetsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang as 'en-US' | 'da');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${lang}/login`);
  }

  // Get user profile to check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'company') {
    redirect(`/${lang}`);
  }

  // First, get all shift IDs for this company
  const { data: companyShifts } = await supabase
    .from('shifts')
    .select('id')
    .eq('company_id', user.id);

  const shiftIds = companyShifts?.map(s => s.id) || [];

  // Fetch timesheets with filters: company_id (through shifts), status = 'pending' or 'disputed'
  // Using explicit foreign key names for reliable relationship resolution
  const { data: timesheets, error } = await supabase
    .from('timesheets')
    .select(`
      *,
      worker:profiles!timesheets_worker_id_fkey (
        id,
        first_name,
        last_name,
        email,
        worker_details:worker_details!worker_details_profile_id_fkey (
          avatar_url
        )
      ),
      shift:shifts!timesheets_shift_id_fkey (
        id,
        title,
        start_time,
        end_time,
        hourly_rate,
        company_id,
        status
      )
    `)
    .in('status', ['pending', 'disputed'])
    .in('shift_id', shiftIds.length > 0 ? shiftIds : ['00000000-0000-0000-0000-000000000000'])
    .order('manager_approved_end', { ascending: false });

  if (error) {
    console.error('SERVER ERROR FETCHING TIMESHEETS:', JSON.stringify(error, null, 2));
  }

  // Get current time for filtering completed shifts
  const now = new Date().toISOString();

  // Map and calculate total_pay for each timesheet
  // Filter to ensure we only show timesheets for this company's shifts AND only completed shifts
  // Logic: Show timesheet IF: status = 'pending' AND shift.status = 'completed' (or shift.end_time < now)
  const mappedTimesheets = (timesheets || [])
    .filter((timesheet: any) => {
      const shift = Array.isArray(timesheet.shift) ? timesheet.shift[0] : timesheet.shift;
      
      // First check: must be for this company's shift
      if (shift?.company_id !== user.id) {
        return false;
      }
      
      // Second check: shift must be completed
      // Check if shift.status === 'completed' OR shift.end_time < now
      const isShiftCompleted = shift?.status === 'completed' || 
                               (shift?.end_time && new Date(shift.end_time) < new Date(now));
      
      // Only show if timesheet is pending/disputed AND shift is completed
      // This prevents showing future shifts with 0 hours in the timesheets list
      return isShiftCompleted;
    })
    .map((timesheet: any) => {
    const shift = Array.isArray(timesheet.shift) ? timesheet.shift[0] : timesheet.shift;
    const worker = Array.isArray(timesheet.worker) ? timesheet.worker[0] : timesheet.worker;
    
    // Extract worker_details from profiles relation
    let workerDetails = null;
    if (worker?.worker_details) {
      workerDetails = Array.isArray(worker.worker_details) 
        ? worker.worker_details[0] 
        : worker.worker_details;
    }

    // Calculate hours worked
    const startTime = timesheet.manager_approved_start || shift?.start_time || timesheet.clock_in_time;
    const endTime = timesheet.manager_approved_end || shift?.end_time || timesheet.clock_out_time;
    
    let hours = 0;
    if (startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      const diffMs = end.getTime() - start.getTime();
      hours = diffMs / (1000 * 60 * 60);
    }

    // Calculate total_pay
    const hourlyRate = shift?.hourly_rate || 0;
    const totalPay = hours * hourlyRate;

    return {
      id: timesheet.id,
      status: timesheet.status,
      worker_id: timesheet.worker_id,
      manager_approved_start: timesheet.manager_approved_start,
      manager_approved_end: timesheet.manager_approved_end,
      total_pay: totalPay,
      shifts: {
        id: shift?.id || '',
        title: shift?.title || '',
        start_time: shift?.start_time || '',
        end_time: shift?.end_time || '',
        hourly_rate: hourlyRate,
        status: shift?.status || '',
      },
      profiles: worker ? {
        first_name: worker.first_name || null,
        last_name: worker.last_name || null,
        email: worker.email || '',
      } : null,
      worker_details: workerDetails ? {
        avatar_url: workerDetails.avatar_url || null,
      } : null,
    };
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{dict.timesheetsPage.title}</h1>
        <p className="text-muted-foreground">
          {dict.timesheetsPage.subtitle}
        </p>
      </div>

      <TimesheetsClient 
        timesheets={mappedTimesheets}
        dict={dict}
        lang={lang}
      />
    </div>
  );
}

