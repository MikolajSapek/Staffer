'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';

interface LoginFormProps {
  dict: {
    loginTitle: string;
    loginDescription: string;
    email: string;
    emailPlaceholder: string;
    password: string;
    signIn: string;
    signingIn: string;
    forgotPassword: string;
    error: string;
    validation: {
      emailRequired: string;
      invalidEmail: string;
      unknownError: string;
      loginFailed: string;
    };
  };
  lang: string;
}

export default function LoginForm({ dict, lang }: LoginFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const nextParam = searchParams?.get('next');

  // Show toast when email has been verified via callback redirect
  useEffect(() => {
    const verified = searchParams?.get('verified');
    if (verified === 'true') {
      toast({
        title: 'Email Verified',
        description: 'Email verified successfully! Please login.',
        variant: 'default',
      });

      // Optionally clean up URL so the message doesn't reappear on refresh
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete('verified');
        window.history.replaceState(null, '', url.toString());
      }
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Trim inputs
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    // Basic validation
    if (!trimmedEmail || !trimmedPassword) {
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
      
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: trimmedPassword,
      });

      if (signInError) {
        // Display the actual error message from Supabase
        const errorMessage = signInError.message || dict.validation.unknownError;
        setError(errorMessage);
        setLoading(false);
        return;
      }

      if (data?.user) {
        // Pobierz dane użytkownika, aby sprawdzić rolę
        const { data: { user: currentUser } } = await supabase.auth.getUser();

        if (currentUser) {
          // Pobierz rolę z tabeli profiles
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', currentUser.id)
            .single();

          const userRole = profile?.role;

          // Determine redirect path: prioritize 'next' parameter, otherwise use role-based redirect
          let redirectPath = `/${lang}/dashboard`; // Default fallback
          
          if (nextParam) {
            // Validate next parameter to prevent open redirect attacks
            // Only allow relative paths starting with /
            const trimmedNext = nextParam.trim();
            if (trimmedNext.startsWith('/') && !trimmedNext.match(/^https?:\/\//i)) {
              // Ensure the path includes locale if it doesn't already
              const hasLocale = trimmedNext.startsWith(`/${lang}/`) || trimmedNext === `/${lang}`;
              redirectPath = hasLocale ? trimmedNext : `/${lang}${trimmedNext}`;
            }
          } else {
            // Logika przekierowania na podstawie roli
            if (userRole === 'worker') {
              // Pracownik idzie do ofert pracy
              redirectPath = `/${lang}/market`;
            } else if (userRole === 'company') {
              // Firma idzie do dashboardu
              redirectPath = `/${lang}/dashboard`;
            } else {
              // Fallback (np. admin)
              redirectPath = `/${lang}/dashboard`;
            }
          }
          
          // Use router.push for SPA navigation instead of full page reload
          router.push(redirectPath);
        } else {
          router.refresh();
        }
      } else {
        setError(dict.validation.loginFailed);
        setLoading(false);
      }
    } catch (err: unknown) {
      // Catch any unexpected errors
      const errorMessage = err instanceof Error ? err.message : dict.validation.unknownError;
      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.loginTitle}</CardTitle>
        <CardDescription>{dict.loginDescription}</CardDescription>
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
          <div className="space-y-2">
            <Label htmlFor="password">{dict.password}</Label>
            <PasswordInput
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
              autoComplete="current-password"
            />
          </div>
          <div className="text-right">
            <Link 
              href={`/${lang}/forgot-password`} 
              className="text-sm text-primary hover:underline"
            >
              {dict.forgotPassword}
            </Link>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? dict.signingIn : dict.signIn}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
