'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/utils/supabase/client';
import { z } from 'zod';
import { Briefcase, Building2 } from 'lucide-react';

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
  const [role, setRole] = useState<'worker' | 'company'>(defaultRole);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validate form with role
      registerSchema.parse({
        email: formData.email,
        password: formData.password,
        role: role,
      });

      const supabase = createClient();
      
      // Sign up user with role in metadata (trigger will create profile automatically)
      // Upewnij się, że te nazwy pasują do tych w SQL (raw_user_meta_data->>'first_name')
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            // ✅ TO JEST KLUCZOWE: Trigger oczekuje tych pól w raw_user_meta_data
            first_name: '', // Można dodać później w profilu (raw_user_meta_data->>'first_name')
            last_name: '',  // Można dodać później w profilu (raw_user_meta_data->>'last_name')
            role: role || 'worker', // <--- KLUCZOWE: Rola musi być wysłana (raw_user_meta_data->>'role')
          },
        },
      });

      if (signUpError) {
        console.error('Supabase signUp error:', signUpError);
        throw signUpError;
      }

      if (authData.user) {
        // Profile will be created automatically by trigger handle_new_user with the role
        // No need to manually insert into profiles table
        
        // Redirect based on role
        router.refresh();
        if (role === 'worker') {
          router.push('/schedule');
        } else {
          router.push('/dashboard');
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
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
              {error}
            </div>
          )}
          
          {/* Role Selection Cards */}
          <div className="space-y-2">
            <Label>Jeg er</Label>
            <div className="grid gap-4 md:grid-cols-2">
              <button
                type="button"
                onClick={() => setRole('worker')}
                className={`h-auto p-6 flex flex-col items-center gap-4 rounded-lg border-2 transition-all ${
                  role === 'worker'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <Briefcase className={`h-12 w-12 ${role === 'worker' ? 'text-blue-600' : 'text-gray-400'}`} />
                <div className="text-center">
                  <div className={`font-semibold text-lg ${role === 'worker' ? 'text-blue-900' : 'text-gray-900'}`}>
                    Pracownik
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Jeg søger vikarjobs
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setRole('company')}
                className={`h-auto p-6 flex flex-col items-center gap-4 rounded-lg border-2 transition-all ${
                  role === 'company'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <Building2 className={`h-12 w-12 ${role === 'company' ? 'text-blue-600' : 'text-gray-400'}`} />
                <div className="text-center">
                  <div className={`font-semibold text-lg ${role === 'company' ? 'text-blue-900' : 'text-gray-900'}`}>
                    Firma
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Jeg søger vikarer
                  </div>
                </div>
              </button>
            </div>
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

