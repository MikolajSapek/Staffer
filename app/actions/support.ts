'use server';

import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';

export interface SupportFormState {
  success?: boolean;
  error?: string;
  message?: string;
}

const supportFormSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Invalid email format'),
  subject: z
    .string()
    .trim()
    .min(1, 'Subject is required')
    .min(3, 'Subject must be at least 3 characters long'),
  message: z
    .string()
    .trim()
    .min(1, 'Message is required')
    .min(10, 'Message must be at least 10 characters long')
    .max(1000, { message: 'Message cannot exceed 1000 characters' }),
});

export async function submitSupportForm(
  prevState: SupportFormState,
  formData: FormData
): Promise<SupportFormState> {
  try {
    const email = formData.get('email')?.toString().trim();
    const subject = formData.get('subject')?.toString().trim();
    const message = formData.get('message')?.toString().trim();

    // Validation using Zod
    const validationResult = supportFormSchema.safeParse({
      email,
      subject,
      message,
    });

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      return {
        success: false,
        error: firstError.message,
      };
    }

    const { email: validatedEmail, subject: validatedSubject, message: validatedMessage } = validationResult.data;

    const supabase = await createClient();

    // Get authenticated user (optional - support can be available for non-logged users too)
    const { data: { user } } = await supabase.auth.getUser();

    // Insert support message into database
    const { error: insertError } = await supabase
      .from('support_messages')
      .insert({
        email: validatedEmail,
        subject: validatedSubject,
        message: validatedMessage,
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
