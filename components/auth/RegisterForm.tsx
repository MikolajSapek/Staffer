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

interface RegisterFormProps {
  defaultRole?: 'worker' | 'company';
  lang: string;
  dict: {
    registerTitle: string;
    registerDescription: string;
    email: string;
    emailPlaceholder: string;
    password: string;
    signUp: string;
    signingUp: string;
    hasAccount: string;
    loginLink: string;
    roleLabel: string;
    roleWorker: string;
    roleWorkerDescription: string;
    roleCompany: string;
    roleCompanyDescription: string;
    validation: {
      invalidEmail: string;
      passwordRequired: string;
      registrationFailed: string;
      serverError: string;
    };
  };
}

export default function RegisterForm({ defaultRole = 'worker', lang, dict }: RegisterFormProps) {
  const registerSchema = z.object({
    email: z.string().email(dict.validation.invalidEmail),
    password: z.string().min(6, dict.validation.passwordRequired),
    role: z.enum(['worker', 'company']),
  });
  const router = useRouter();
  const [role, setRole] = useState<'worker' | 'company'>(defaultRole);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      // Validate form data
      registerSchema.parse({
        email: formData.email,
        password: formData.password,
        role: role,
      });

      const supabase = createClient();
      
      // Prepare metadata for database trigger
      // The trigger handle_new_user() automatically creates the profile and detail records
      const metadata = role === 'worker' 
        ? {
            role: 'worker',
            first_name: '',
            last_name: '',
          }
        : {
            role: 'company',
            company_name: '',
          };

      // Fixed redirect URL to production login page for email confirmation
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          emailRedirectTo: 'https://staffer-rho.vercel.app/en-US/login',
          data: metadata,
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      if (authData.user) {
        // Profile and detail tables are created automatically by the database trigger
        // No manual database operations needed - the trigger handles everything
        setSuccess(true);
        setFormData({ email: '', password: '' });
        
        // Redirect to login after a brief delay to show success message
        setTimeout(() => {
          router.push(`/${lang}/login`);
        }, 2000);
      }
    } catch (err: unknown) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
      } else if (err instanceof Error) {
        if (err.message?.includes('Failed to fetch') || err.message?.includes('ERR_NAME_NOT_RESOLVED')) {
          setError(dict.validation.serverError);
        } else {
          setError(err.message || dict.validation.registrationFailed);
        }
      } else {
        setError(dict.validation.registrationFailed);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.registerTitle}</CardTitle>
        <CardDescription>{dict.registerDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md">
              Account created successfully! Please check your email to confirm your account.
            </div>
          )}
          
          {/* Role Selection Cards */}
          <div className="space-y-2">
            <Label>{dict.roleLabel}</Label>
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
                    {dict.roleWorker}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {dict.roleWorkerDescription}
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
                    {dict.roleCompany}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {dict.roleCompanyDescription}
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{dict.email}</Label>
            <Input
              id="email"
              type="email"
              placeholder={dict.emailPlaceholder}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{dict.password}</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? dict.signingUp : dict.signUp}
          </Button>
          <p className="text-sm text-center text-muted-foreground">
            {dict.hasAccount}{' '}
            <a href={`/${lang}/login`} className="text-primary hover:underline">
              {dict.loginLink}
            </a>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

