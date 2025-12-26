'use server';

import { createClient, getCurrentProfile } from '@/utils/supabase/server';
import { z } from 'zod';

const createShiftSchema = z.object({
  location_id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.string().min(1),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  hourly_rate: z.number().min(0),
  vacancies_total: z.number().int().positive(),
  requirements: z.record(z.any()).optional(),
});

export async function createShift(formData: FormData) {
  try {
    const profile = await getCurrentProfile();
    
    if (!profile) {
      throw new Error('Unauthorized');
    }

    const profileData = profile as { id: string; role: string };
    if (profileData.role !== 'company' && profileData.role !== 'admin') {
      throw new Error('Unauthorized');
    }

    const data = {
      location_id: formData.get('location_id') as string,
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      category: formData.get('category') as string,
      start_time: formData.get('start_time') as string,
      end_time: formData.get('end_time') as string,
      hourly_rate: parseFloat(formData.get('hourly_rate') as string),
      vacancies_total: parseInt(formData.get('vacancies_total') as string),
      requirements: formData.get('requirements') 
        ? JSON.parse(formData.get('requirements') as string)
        : {},
    };

    const validated = createShiftSchema.parse(data);

    const supabase = await createClient();
    const { data: shift, error } = await supabase
      .from('shifts')
      .insert({
        company_id: profileData.id,
        ...validated,
        status: 'published',
      } as any)
      .select()
      .single();

    if (error) throw error;

    return { success: true, shift };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function applyToShift(shiftId: string) {
  try {
    const profile = await getCurrentProfile();
    
    if (!profile) {
      throw new Error('Unauthorized');
    }

    const profileData = profile as { id: string; role: string };
    if (profileData.role !== 'worker') {
      throw new Error('Only workers can apply to shifts');
    }

    const supabase = await createClient();

    // Check if shift is full
    const { data: shift } = await supabase
      .from('shifts')
      .select('vacancies_taken, vacancies_total, status')
      .eq('id', shiftId)
      .single();

    if (!shift) {
      throw new Error('Shift not found');
    }

    const shiftData = shift as any;
    const shiftStatus = shiftData.status as string;
    if (shiftStatus === 'full' || shiftStatus === 'completed' || shiftStatus === 'cancelled') {
      throw new Error('Shift is not available');
    }

    // Check if already applied
    const { data: existing } = await supabase
      .from('shift_applications')
      .select('id')
      .eq('shift_id', shiftId)
      .eq('worker_id', profileData.id)
      .single();

    if (existing) {
      throw new Error('Already applied to this shift');
    }

    // Determine status
    const vacanciesTaken = (shift as any).vacancies_taken as number;
    const vacanciesTotal = (shift as any).vacancies_total as number;
    const status = vacanciesTaken >= vacanciesTotal ? 'waitlist' : 'pending';

    const { data: application, error } = await supabase
      .from('shift_applications')
      .insert({
        shift_id: shiftId,
        worker_id: profileData.id,
        status,
      } as any)
      .select()
      .single();

    if (error) throw error;

    // Update vacancies_taken if not waitlist
    if (status === 'pending') {
      const supabaseAny = supabase as any;
      await supabaseAny
        .from('shifts')
        .update({ vacancies_taken: vacanciesTaken + 1 })
        .eq('id', shiftId);
    }

    return { success: true, application };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function acceptApplication(applicationId: string) {
  try {
    const profile = await getCurrentProfile();
    
    if (!profile) {
      throw new Error('Unauthorized');
    }

    const profileData = profile as { id: string; role: string };
    if (profileData.role !== 'company' && profileData.role !== 'admin') {
      throw new Error('Unauthorized');
    }

    const supabase = await createClient();

    // Get application and verify company owns the shift
    const { data: application, error: appError } = await supabase
      .from('shift_applications')
      .select('*, shifts!inner(company_id, vacancies_taken, vacancies_total)')
      .eq('id', applicationId)
      .single();

    if (appError || !application) {
      throw new Error('Application not found');
    }

    const appData = application as any;
    if (!appData.shifts || (appData.shifts.company_id !== profileData.id && profileData.role !== 'admin')) {
      throw new Error('Unauthorized');
    }

    // Update application status
    const supabaseAny = supabase as any;
    const { error: updateError } = await supabaseAny
      .from('shift_applications')
      .update({ status: 'accepted' })
      .eq('id', applicationId);

    if (updateError) throw updateError;

    // Update shift vacancies if not already full
    const shifts = appData.shifts as any;
    if (shifts.vacancies_taken < shifts.vacancies_total) {
      const supabaseAny = supabase as any;
      await supabaseAny
        .from('shifts')
        .update({ vacancies_taken: shifts.vacancies_taken + 1 })
        .eq('id', appData.shift_id);
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

