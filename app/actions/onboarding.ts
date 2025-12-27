'use server';

import { createClient, getCurrentProfile } from '@/utils/supabase/server';

export async function createWorkerDetails(formData: FormData) {
  try {
    const profile = await getCurrentProfile();
    
    if (!profile) {
      throw new Error('Unauthorized');
    }

    const profileData = profile as { id: string; role: string };
    if (profileData.role !== 'worker' && profileData.role !== 'admin') {
      throw new Error('Unauthorized');
    }

    const supabase = await createClient();

    // Check if already exists
    const { data: existing } = await supabase
      .from('worker_details')
      .select('profile_id')
      .eq('profile_id', profileData.id)
      .single();

    if (existing) {
      throw new Error('Worker details already exist');
    }

    // For CPR encryption, we'll use a simple placeholder approach
    // In production, you should use the edge function to encrypt
    const cprNumber = formData.get('cpr_number') as string;
    
    // TODO: Use edge function to encrypt CPR number
    // For now, we'll store a placeholder - you should call the encrypt-cpr edge function
    const cprEncrypted = `encrypted_${cprNumber}`; // Placeholder

    const { data: workerDetails, error } = await supabase
      .from('worker_details')
      .insert({
        profile_id: profileData.id,
        first_name: formData.get('first_name') as string,
        last_name: formData.get('last_name') as string,
        phone_number: formData.get('phone_number') as string,
        cpr_number_encrypted: cprEncrypted,
        tax_card_type: formData.get('tax_card_type') as 'Hovedkort' | 'Bikort' | 'Frikort',
        bank_reg_number: formData.get('bank_reg_number') as string,
        bank_account_number: formData.get('bank_account_number') as string,
        su_limit_amount: formData.get('su_limit_amount') 
          ? parseFloat(formData.get('su_limit_amount') as string)
          : null,
        shirt_size: formData.get('shirt_size') as string || null,
        shoe_size: formData.get('shoe_size') as string || null,
      } as any)
      .select()
      .single();

    if (error) throw error;

    return { success: true, workerDetails };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createCompanyDetails(formData: FormData) {
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

    // Check if already exists
    const { data: existing } = await supabase
      .from('company_details')
      .select('profile_id')
      .eq('profile_id', profileData.id)
      .single();

    if (existing) {
      throw new Error('Company details already exist');
    }

    const { data: companyDetails, error } = await supabase
      .from('company_details')
      .insert({
        profile_id: profileData.id,
        company_name: formData.get('company_name') as string,
        cvr_number: formData.get('cvr_number') as string,
        ean_number: formData.get('ean_number') as string || null,
      } as any)
      .select()
      .single();

    if (error) throw error;

    return { success: true, companyDetails };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

