'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/utils/supabase/client';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email('Ugyldig email'),
  password: z.string().min(6, 'Adgangskode skal være mindst 6 tegn'),
  role: z.enum(['worker', 'company']),
});

interface RegisterFormProps {
  defaultRole?: 'worker' | 'company';
}

export default function RegisterForm({ defaultRole = 'worker' }: RegisterFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: defaultRole as 'worker' | 'company',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validate form
      registerSchema.parse(formData);

      const supabase = createClient();
      
      // Sign up user with role in metadata (trigger will create profile automatically)
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            // ✅ TO JEST KLUCZOWE: Trigger oczekuje roli w raw_user_meta_data
            role: formData.role,
          },
        },
      });

      if (signUpError) {
        console.error('Supabase signUp error:', signUpError);
        throw signUpError;
      }

      if (authData.user) {
        // Profile will be created automatically by trigger handle_new_user
        // No need to manually insert into profiles table
        
        // Redirect to appropriate dashboard
        // Note: Onboarding pages can be added later at /worker/onboarding and /company/onboarding
        if (formData.role === 'company') {
          window.location.href = '/company';
        } else {
          window.location.href = '/worker';
        }
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
      } else if (err.message?.includes('Failed to fetch') || err.message?.includes('ERR_NAME_NOT_RESOLVED')) {
        setError('Nie można połączyć się z serwerem. Sprawdź czy zmienne środowiskowe Supabase są ustawione w Vercel.');
      } else {
        setError(err.message || 'Wystąpił błąd podczas rejestracji');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Opret konto</CardTitle>
        <CardDescription>Vælg din rolle og opret en konto</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="role">Jeg er</Label>
            <select
              id="role"
              value={formData.role}
              onChange={(e) =>
                setFormData({ ...formData, role: e.target.value as 'worker' | 'company' })
              }
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="worker">Pracownik (Worker)</option>
              <option value="company">Firma (Company)</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="din@email.dk"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Adgangskode</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Opretter konto...' : 'Opret konto'}
          </Button>
          <p className="text-sm text-center text-muted-foreground">
            Har du allerede en konto?{' '}
            <a href="/login" className="text-primary hover:underline">
              Log ind
            </a>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

