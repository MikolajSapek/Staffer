'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/utils/supabase/client';

interface UpdatePasswordFormProps {
  dict: {
    updatePasswordTitle: string;
    updatePasswordDesc: string;
    newPassword: string;
    confirmNewPassword: string;
    updatePasswordBtn: string;
    updatingPassword: string;
    successPasswordUpdated: string;
    errorPasswordsDoNotMatch: string;
    error: string;
    validation: {
      passwordRequired: string;
      unknownError: string;
    };
  };
  lang: string;
}

export default function UpdatePasswordForm({ dict, lang }: UpdatePasswordFormProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // User is not authenticated, redirect to login
        router.push(`/${lang}/login`);
        return;
      }
      
      setIsAuthenticated(true);
    };

    checkAuth();
  }, [lang, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Trim inputs
    const trimmedNewPassword = newPassword.trim();
    const trimmedConfirmPassword = confirmPassword.trim();

    // Basic validation
    if (!trimmedNewPassword || !trimmedConfirmPassword) {
      setError(dict.validation.passwordRequired);
      setLoading(false);
      return;
    }

    // Check if passwords match
    if (trimmedNewPassword !== trimmedConfirmPassword) {
      setError(dict.errorPasswordsDoNotMatch);
      setLoading(false);
      return;
    }

    // Password length validation
    if (trimmedNewPassword.length < 6) {
      setError(dict.validation.passwordRequired);
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password: trimmedNewPassword,
      });

      if (updateError) {
        const errorMessage = updateError.message || dict.validation.unknownError;
        setError(errorMessage);
        setLoading(false);
        return;
      }

      // Success - redirect to login
      setLoading(false);
      router.push(`/${lang}/login`);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : dict.validation.unknownError;
      setError(errorMessage);
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.updatePasswordTitle}</CardTitle>
        <CardDescription>{dict.updatePasswordDesc}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              <strong>{dict.error}:</strong> {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="newPassword">{dict.newPassword}</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
              required
              autoComplete="new-password"
              minLength={6}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{dict.confirmNewPassword}</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              required
              autoComplete="new-password"
              minLength={6}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? dict.updatingPassword : dict.updatePasswordBtn}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
