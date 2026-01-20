'use server';

import { createClient } from '@/utils/supabase/server';

export interface SupportFormState {
  success?: boolean;
  error?: string;
  message?: string;
}

export async function submitSupportForm(
  prevState: SupportFormState,
  formData: FormData
): Promise<SupportFormState> {
  try {
    const email = formData.get('email')?.toString().trim();
    const subject = formData.get('subject')?.toString().trim();
    const message = formData.get('message')?.toString().trim();

    // Validation
    if (!email || !subject || !message) {
      return {
        success: false,
        error: 'All fields are required',
      };
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        success: false,
        error: 'Invalid email format',
      };
    }

    // Subject length validation
    if (subject.length < 3) {
      return {
        success: false,
        error: 'Subject must be at least 3 characters long',
      };
    }

    // Message length validation
    if (message.length < 10) {
      return {
        success: false,
        error: 'Message must be at least 10 characters long',
      };
    }

    const supabase = await createClient();

    // Get authenticated user (optional - support can be available for non-logged users too)
    const { data: { user } } = await supabase.auth.getUser();

    // Insert support message into database
    const { error: insertError } = await supabase
      .from('support_messages')
      .insert({
        email,
        subject,
        message,
        user_id: user?.id || null, // Optional - link to user if logged in
        status: 'pending',
      });

    if (insertError) {
      console.error('Error inserting support message:', insertError);
      return {
        success: false,
        error: 'Failed to submit your message. Please try again.',
      };
    }

    return {
      success: true,
      message: 'Your message has been sent successfully! We will get back to you shortly.',
    };
  } catch (error) {
    console.error('Error in submitSupportForm:', error);
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    };
  }
}
