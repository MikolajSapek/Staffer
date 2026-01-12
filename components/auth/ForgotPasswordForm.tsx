'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

interface ForgotPasswordFormProps {
  dict: {
    forgotPasswordTitle: string;
    forgotPasswordDesc: string;
    sendLink: string;
    sendingLink: string;
    backToLogin: string;
    successEmailSent: string;
    error: string;
    email: string;
    emailPlaceholder: string;
    validation: {
      emailRequired: string;
      invalidEmail: string;
      unknownError: string;
    };
  };
  lang: string;
}

export default function ForgotPasswordForm({ dict, lang: langProp }: ForgotPasswordFormProps) {
  const params = useParams();
  // Use lang from params if available, otherwise fallback to prop
  const lang = (params?.lang as string) || langProp || 'en-US';
  
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Trim input
    const trimmedEmail = email.trim();

    // Basic validation
    if (!trimmedEmail) {
      setError(dict.validation.emailRequired);
      setLoading(false);
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError(dict.validation.invalidEmail);
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      // Build redirect URL: /auth/callback (without locale) with next param containing locale
      const redirectTo = `${window.location.origin}/auth/callback?next=/${lang}/update-password`;
      
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo,
      });

      if (resetError) {
        const errorMessage = resetError.message || dict.validation.unknownError;
        setError(errorMessage);
        setLoading(false);
        return;
      }

      // Success - show success message
      setSuccess(true);
      setLoading(false);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : dict.validation.unknownError;
      setError(errorMessage);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{dict.forgotPasswordTitle}</CardTitle>
          <CardDescription>{dict.forgotPasswordDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md">
            {dict.successEmailSent}
          </div>
          <div className="mt-4 text-center">
            <Link 
              href={`/${lang}/login`} 
              className="text-primary hover:underline text-sm"
            >
              {dict.backToLogin}
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.forgotPasswordTitle}</CardTitle>
        <CardDescription>{dict.forgotPasswordDesc}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              <strong>{dict.error}:</strong> {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">{dict.email}</Label>
            <Input
              id="email"
              type="email"
              placeholder={dict.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
              autoComplete="email"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? dict.sendingLink : dict.sendLink}
          </Button>
          <div className="text-center">
            <Link 
              href={`/${lang}/login`} 
              className="text-sm text-primary hover:underline"
            >
              {dict.backToLogin}
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
