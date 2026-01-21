'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

type ManagerResult = {
  success: boolean;
  message: string;
  error?: string;
  managerId?: string;
  manager?: Manager;
};

export interface Manager {
  id: string;
  company_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Get all managers for the current company
 */
export async function getManagers(): Promise<Manager[]> {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  try {
    const { data: managers, error } = await supabase
      .from('managers')
      .select('*')
      .eq('company_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching managers:', error);
      return [];
    }

    return (managers || []) as Manager[];
  } catch (err) {
    console.error('Unexpected error fetching managers:', err);
    return [];
  }
}

/**
 * Create a new manager
 */
export async function createManager(formData: {
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string | null;
}): Promise<ManagerResult> {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  try {
    // Validate required fields
    if (!formData.first_name?.trim()) {
      return {
        success: false,
        message: 'First name is required',
        error: 'First name is required',
      };
    }

    if (!formData.last_name?.trim()) {
      return {
        success: false,
        message: 'Last name is required',
        error: 'Last name is required',
      };
    }

    if (!formData.email?.trim()) {
      return {
        success: false,
        message: 'Email is required',
        error: 'Email is required',
      };
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      return {
        success: false,
        message: 'Invalid email format',
        error: 'Invalid email format',
      };
    }

    // Prepare the manager payload
    const managerPayload = {
      company_id: user.id,
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim(),
      email: formData.email.trim().toLowerCase(),
      phone_number: formData.phone_number?.trim() || null,
    };

    // Insert the manager and return full object
    const { data: newManager, error: managerError } = await supabase
      .from('managers')
      .insert([managerPayload]) // Wrap in array for explicit typing
      .select('*')
      .single();

    if (managerError || !newManager) {
      console.error('Error creating manager:', managerError);
      return {
        success: false,
        message: 'Failed to create manager',
        error: managerError?.message || 'Unknown error',
      };
    }

    // Revalidate relevant paths
    revalidatePath('/managers');
    revalidatePath('/dashboard');

    return {
      success: true,
      message: 'Manager created successfully',
      managerId: newManager.id,
      manager: newManager as Manager,
    };
  } catch (err: any) {
    console.error('Unexpected error creating manager:', err);
    return {
      success: false,
      message: 'Unexpected error while creating manager',
      error: err?.message ?? String(err),
    };
  }
}

/**
 * Update an existing manager
 */
export async function updateManager(
  managerId: string,
  formData: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone_number?: string | null;
  }
): Promise<ManagerResult> {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  try {
    // Verify ownership
    const { data: existingManager, error: fetchError } = await supabase
      .from('managers')
      .select('company_id')
      .eq('id', managerId)
      .single();

    if (fetchError || !existingManager) {
      return {
        success: false,
        message: 'Manager not found',
        error: 'Manager not found',
      };
    }

    if (existingManager.company_id !== user.id) {
      return {
        success: false,
        message: 'Unauthorized',
        error: 'You do not have permission to update this manager',
      };
    }

    // Prepare update payload (only include fields that are provided)
    const updatePayload: any = {};
    
    if (formData.first_name !== undefined) {
      if (!formData.first_name?.trim()) {
        return {
          success: false,
          message: 'First name cannot be empty',
          error: 'First name cannot be empty',
        };
      }
      updatePayload.first_name = formData.first_name.trim();
    }
    
    if (formData.last_name !== undefined) {
      if (!formData.last_name?.trim()) {
        return {
          success: false,
          message: 'Last name cannot be empty',
          error: 'Last name cannot be empty',
        };
      }
      updatePayload.last_name = formData.last_name.trim();
    }
    
    if (formData.email !== undefined) {
      if (!formData.email?.trim()) {
        return {
          success: false,
          message: 'Email cannot be empty',
          error: 'Email cannot be empty',
        };
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        return {
          success: false,
          message: 'Invalid email format',
          error: 'Invalid email format',
        };
      }
      updatePayload.email = formData.email.trim().toLowerCase();
    }
    
    if (formData.phone_number !== undefined) {
      updatePayload.phone_number = formData.phone_number?.trim() || null;
    }

    // Update the manager
    const { error: updateError } = await supabase
      .from('managers')
      .update(updatePayload)
      .eq('id', managerId)
      .eq('company_id', user.id);

    if (updateError) {
      console.error('Error updating manager:', updateError);
      return {
        success: false,
        message: 'Failed to update manager',
        error: updateError.message,
      };
    }

    // Revalidate relevant paths
    revalidatePath('/managers');
    revalidatePath('/dashboard');

    return {
      success: true,
      message: 'Manager updated successfully',
      managerId,
    };
  } catch (err: any) {
    console.error('Unexpected error updating manager:', err);
    return {
      success: false,
      message: 'Unexpected error while updating manager',
      error: err?.message ?? String(err),
    };
  }
}

/**
 * Delete a manager
 */
export async function deleteManager(managerId: string): Promise<ManagerResult> {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  try {
    // Verify ownership
    const { data: existingManager, error: fetchError } = await supabase
      .from('managers')
      .select('company_id')
      .eq('id', managerId)
      .single();

    if (fetchError || !existingManager) {
      return {
        success: false,
        message: 'Manager not found',
        error: 'Manager not found',
      };
    }

    if (existingManager.company_id !== user.id) {
      return {
        success: false,
        message: 'Unauthorized',
        error: 'You do not have permission to delete this manager',
      };
    }

    // Delete the manager
    const { error: deleteError } = await supabase
      .from('managers')
      .delete()
      .eq('id', managerId)
      .eq('company_id', user.id);

    if (deleteError) {
      console.error('Error deleting manager:', deleteError);
      return {
        success: false,
        message: 'Failed to delete manager',
        error: deleteError.message,
      };
    }

    // Revalidate relevant paths
    revalidatePath('/managers');
    revalidatePath('/dashboard');

    return {
      success: true,
      message: 'Manager deleted successfully',
    };
  } catch (err: any) {
    console.error('Unexpected error deleting manager:', err);
    return {
      success: false,
      message: 'Unexpected error while deleting manager',
      error: err?.message ?? String(err),
    };
  }
}
