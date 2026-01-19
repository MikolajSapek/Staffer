'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

type TemplateResult = {
  success: boolean;
  message: string;
  error?: string;
  templateId?: string;
};

type DeleteTemplateResult = {
  success: boolean;
  message: string;
  error?: string;
};

interface ShiftTemplateRequirement {
  id: string;
  template_id: string;
  skill_id: string;
  created_at: string;
  skills?: {
    id: string;
    name: string;
    category: string;
  };
}

interface ShiftTemplate {
  id: string;
  company_id: string;
  location_id: string | null;
  template_name: string;
  title: string;
  description: string | null;
  category: string;
  hourly_rate: number;
  vacancies_total: number;
  must_bring: string | null;
  break_minutes: number;
  is_break_paid: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  shift_template_requirements?: ShiftTemplateRequirement[];
}

/**
 * Get all templates for a company with their skill requirements
 * 
 * NOTE: This function attempts to fetch from shift_template_requirements table.
 * If the table doesn't exist yet, it will gracefully fall back to templates without requirements.
 */
export async function getTemplates(companyId: string): Promise<ShiftTemplate[]> {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Verify the company_id matches the authenticated user
  if (user.id !== companyId) {
    throw new Error('Unauthorized access to templates');
  }

  try {
    // First, try to fetch templates with requirements (new relational model)
    const { data: templates, error } = await supabase
      .from('shift_templates')
      .select(`
        *,
        shift_template_requirements (
          id,
          template_id,
          skill_id,
          created_at,
          skills (
            id,
            name,
            category
          )
        )
      `)
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('template_name', { ascending: true });

    if (error) {
      console.error('Error fetching templates with requirements:', JSON.stringify(error, null, 2));
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      
      // Check if error is due to missing table/relation (PGRST116 or similar)
      if (error.code === 'PGRST116' || error.message?.includes('shift_template_requirements')) {
        console.warn('⚠️  shift_template_requirements table may not exist. Falling back to basic templates.');
        
        // Fallback: Fetch templates without requirements
        const { data: basicTemplates, error: basicError } = await supabase
          .from('shift_templates')
          .select('*')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .order('template_name', { ascending: true });
        
        if (basicError) {
          console.error('Error fetching basic templates:', JSON.stringify(basicError, null, 2));
          return [];
        }
        
        // Return templates with empty requirements array
        return (basicTemplates || []).map(template => ({
          ...template,
          shift_template_requirements: [],
        })) as ShiftTemplate[];
      }
      
      return [];
    }

    // Ensure shift_template_requirements is always an array (handle null case)
    const sanitizedTemplates = (templates || []).map(template => ({
      ...template,
      shift_template_requirements: template.shift_template_requirements || [],
    }));

    console.log(`✅ Successfully fetched ${sanitizedTemplates.length} template(s) for company ${companyId}`);
    return sanitizedTemplates as ShiftTemplate[];
  } catch (err) {
    console.error('Unexpected error fetching templates:', JSON.stringify(err, null, 2));
    console.error('Error object:', err);
    return [];
  }
}

/**
 * Create a new shift template with skill requirements
 */
export async function createTemplate(formData: {
  template_name: string;
  title: string;
  description?: string | null;
  category: string;
  location_id?: string | null;
  manager_id?: string | null;
  hourly_rate: number;
  vacancies_total: number;
  must_bring?: string | null;
  break_minutes?: number;
  is_break_paid?: boolean;
  skill_ids?: string[]; // Array of skill IDs to link as requirements
}): Promise<TemplateResult> {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  try {
    // Validate required fields
    if (!formData.template_name?.trim()) {
      return {
        success: false,
        message: 'Template name is required',
        error: 'Template name is required',
      };
    }

    if (!formData.title?.trim()) {
      return {
        success: false,
        message: 'Title is required',
        error: 'Title is required',
      };
    }

    if (!formData.category) {
      return {
        success: false,
        message: 'Category is required',
        error: 'Category is required',
      };
    }

    // Prepare the template payload
    const templatePayload = {
      company_id: user.id,
      template_name: formData.template_name.trim(),
      title: formData.title.trim(),
      description: formData.description?.trim() || null,
      category: formData.category,
      location_id: formData.location_id || null,
      manager_id: formData.manager_id || null,
      hourly_rate: Number(formData.hourly_rate),
      vacancies_total: Number(formData.vacancies_total),
      must_bring: formData.must_bring?.trim() || null,
      break_minutes: Number(formData.break_minutes) || 0,
      is_break_paid: formData.is_break_paid || false,
      is_active: true,
    };

    // Insert the template
    const { data: newTemplate, error: templateError } = await supabase
      .from('shift_templates')
      .insert(templatePayload)
      .select('id')
      .single();

    if (templateError || !newTemplate) {
      console.error('Error creating template:', templateError);
      return {
        success: false,
        message: 'Failed to create template',
        error: templateError?.message || 'Unknown error',
      };
    }

    const templateId = newTemplate.id;

    // Insert skill requirements if any
    if (formData.skill_ids && formData.skill_ids.length > 0) {
      const requirementsToInsert = formData.skill_ids.map((skillId) => ({
        template_id: templateId,
        skill_id: skillId,
      }));

      const { error: requirementsError } = await supabase
        .from('shift_template_requirements')
        .insert(requirementsToInsert);

      if (requirementsError) {
        console.error('Error inserting template requirements:', requirementsError);
        // Template was created but requirements failed - inform user
        return {
          success: false,
          message: 'Template created but failed to save requirements',
          error: requirementsError.message,
          templateId,
        };
      }
    }

    // Revalidate relevant paths
    revalidatePath('/create-shift');
    revalidatePath('/templates');

    return {
      success: true,
      message: 'Template created successfully',
      templateId,
    };
  } catch (err: any) {
    console.error('Unexpected error creating template:', err);
    return {
      success: false,
      message: 'Unexpected error while creating template',
      error: err?.message ?? String(err),
    };
  }
}

/**
 * Update an existing template
 */
export async function updateTemplate(
  templateId: string,
  formData: {
    template_name?: string;
    title?: string;
    description?: string | null;
    category?: string;
    location_id?: string | null;
    manager_id?: string | null;
    hourly_rate?: number;
    vacancies_total?: number;
    must_bring?: string | null;
    break_minutes?: number;
    is_break_paid?: boolean;
    skill_ids?: string[]; // Array of skill IDs to replace existing requirements
  }
): Promise<TemplateResult> {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  try {
    // Verify ownership
    const { data: existingTemplate, error: fetchError } = await supabase
      .from('shift_templates')
      .select('company_id')
      .eq('id', templateId)
      .single();

    if (fetchError || !existingTemplate) {
      return {
        success: false,
        message: 'Template not found',
        error: 'Template not found',
      };
    }

    if (existingTemplate.company_id !== user.id) {
      return {
        success: false,
        message: 'Unauthorized',
        error: 'You do not have permission to update this template',
      };
    }

    // Prepare update payload (only include fields that are provided)
    const updatePayload: any = {};
    
    if (formData.template_name !== undefined) {
      updatePayload.template_name = formData.template_name.trim();
    }
    if (formData.title !== undefined) {
      updatePayload.title = formData.title.trim();
    }
    if (formData.description !== undefined) {
      updatePayload.description = formData.description?.trim() || null;
    }
    if (formData.category !== undefined) {
      updatePayload.category = formData.category;
    }
    if (formData.location_id !== undefined) {
      updatePayload.location_id = formData.location_id;
    }
    if (formData.manager_id !== undefined) {
      updatePayload.manager_id = formData.manager_id;
    }
    if (formData.hourly_rate !== undefined) {
      updatePayload.hourly_rate = Number(formData.hourly_rate);
    }
    if (formData.vacancies_total !== undefined) {
      updatePayload.vacancies_total = Number(formData.vacancies_total);
    }
    if (formData.must_bring !== undefined) {
      updatePayload.must_bring = formData.must_bring?.trim() || null;
    }
    if (formData.break_minutes !== undefined) {
      updatePayload.break_minutes = Number(formData.break_minutes) || 0;
    }
    if (formData.is_break_paid !== undefined) {
      updatePayload.is_break_paid = formData.is_break_paid;
    }

    // Update the template
    const { error: updateError } = await supabase
      .from('shift_templates')
      .update(updatePayload)
      .eq('id', templateId)
      .eq('company_id', user.id);

    if (updateError) {
      console.error('Error updating template:', updateError);
      return {
        success: false,
        message: 'Failed to update template',
        error: updateError.message,
      };
    }

    // Update skill requirements if provided
    if (formData.skill_ids !== undefined) {
      // Delete existing requirements
      const { error: deleteError } = await supabase
        .from('shift_template_requirements')
        .delete()
        .eq('template_id', templateId);

      if (deleteError) {
        console.error('Error deleting old template requirements:', deleteError);
        return {
          success: false,
          message: 'Template updated but failed to update requirements',
          error: deleteError.message,
        };
      }

      // Insert new requirements
      if (formData.skill_ids.length > 0) {
        const requirementsToInsert = formData.skill_ids.map((skillId) => ({
          template_id: templateId,
          skill_id: skillId,
        }));

        const { error: insertError } = await supabase
          .from('shift_template_requirements')
          .insert(requirementsToInsert);

        if (insertError) {
          console.error('Error inserting new template requirements:', insertError);
          return {
            success: false,
            message: 'Template updated but failed to save requirements',
            error: insertError.message,
          };
        }
      }
    }

    // Revalidate relevant paths
    revalidatePath('/create-shift');
    revalidatePath('/templates');

    return {
      success: true,
      message: 'Template updated successfully',
      templateId,
    };
  } catch (err: any) {
    console.error('Unexpected error updating template:', err);
    return {
      success: false,
      message: 'Unexpected error while updating template',
      error: err?.message ?? String(err),
    };
  }
}

/**
 * Delete a template (soft delete by setting is_active to false)
 */
export async function deleteTemplate(templateId: string): Promise<DeleteTemplateResult> {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  try {
    // Verify ownership
    const { data: existingTemplate, error: fetchError } = await supabase
      .from('shift_templates')
      .select('company_id')
      .eq('id', templateId)
      .single();

    if (fetchError || !existingTemplate) {
      return {
        success: false,
        message: 'Template not found',
        error: 'Template not found',
      };
    }

    if (existingTemplate.company_id !== user.id) {
      return {
        success: false,
        message: 'Unauthorized',
        error: 'You do not have permission to delete this template',
      };
    }

    // Soft delete: set is_active to false
    const { error: deleteError } = await supabase
      .from('shift_templates')
      .update({ is_active: false })
      .eq('id', templateId)
      .eq('company_id', user.id);

    if (deleteError) {
      console.error('Error deleting template:', deleteError);
      return {
        success: false,
        message: 'Failed to delete template',
        error: deleteError.message,
      };
    }

    // Optionally, also delete the requirements
    // (CASCADE should handle this, but we can explicitly delete them)
    const { error: requirementsDeleteError } = await supabase
      .from('shift_template_requirements')
      .delete()
      .eq('template_id', templateId);

    if (requirementsDeleteError) {
      console.error('Error deleting template requirements:', requirementsDeleteError);
      // Continue even if this fails - the template is marked inactive
    }

    // Revalidate relevant paths
    revalidatePath('/create-shift');
    revalidatePath('/templates');

    return {
      success: true,
      message: 'Template deleted successfully',
    };
  } catch (err: any) {
    console.error('Unexpected error deleting template:', err);
    return {
      success: false,
      message: 'Unexpected error while deleting template',
      error: err?.message ?? String(err),
    };
  }
}
