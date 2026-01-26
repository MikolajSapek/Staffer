'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Briefcase, Building2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { getDictionary } from '@/app/[lang]/dictionaries';

export default function OnboardingPage() {
  const router = useRouter();
  const params = useParams();
  const lang = (params?.lang as string) || 'en-US';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingRole, setCheckingRole] = useState(true);
  const [dict, setDict] = useState<any>(null);

  // Load dictionary
  useEffect(() => {
    async function loadDict() {
      const dictionary = await getDictionary(lang as 'en-US' | 'da');
      setDict(dictionary);
    }
    loadDict();
  }, [lang]);

  // Check if user already has a role (from sign-up)
  useEffect(() => {
    async function checkExistingRole() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      // If user already has a role, redirect them
      if (profile?.role) {
        if (profile.role === 'worker') {
          router.push('/schedule');
        } else if (profile.role === 'company') {
          // Check if company has completed onboarding (company_details)
          const { data: companyDetails } = await supabase
            .from('company_details')
            .select('profile_id')
            .eq('profile_id', user.id)
            .maybeSingle();
          
          // If no company_details, they need to complete onboarding
          // The (company) route group will handle this, but we redirect to dashboard
          // which will then redirect to onboarding if needed
          if (!companyDetails) {
            router.push('/dashboard');
          } else {
            router.push('/dashboard');
          }
        }
        return;
      }

      setCheckingRole(false);
    }

    checkExistingRole();
  }, [router]);

  const handleRoleSelection = async (role: 'worker' | 'company') => {
    try {
      setLoading(true);
      setError(null);

      const supabase = createClient();

      // 1. Ensure we have a user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('No user found');
      }

      // 2. Send update to database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: role })
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      // 3. Success - redirect

      // Force router refresh so Navbar notices the role change
      router.refresh();

      if (role === 'worker') {
        router.push('/schedule');
      } else {
        // For companies, check if they have company_details
        // If not, they'll be redirected to onboarding by the dashboard page
        router.push('/dashboard');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Der opstod en fejl ved opdatering af rolle. Prøv igen.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking role
  if (checkingRole) {
    return (
      <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="text-center">
          <p className="text-muted-foreground">Indlæser...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[calc(100vh-200px)]">
      <div className="w-full max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Vælg din rolle</CardTitle>
            <CardDescription>
              Vælg om du er en arbejder eller en virksomhed
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 rounded-md">
                {error}
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              <Button
                variant="outline"
                className="h-auto p-6 flex flex-col items-center gap-4"
                onClick={() => handleRoleSelection('worker')}
                disabled={loading}
              >
                <Briefcase className="h-12 w-12" />
                <div className="text-center">
                  <div className="font-semibold text-lg">{dict?.auth?.roleWorker || 'Arbejder'}</div>
                  <div className="text-sm text-muted-foreground">
                    {dict?.auth?.roleWorkerDescription || 'Jeg søger midlertidige jobs'}
                  </div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="h-auto p-6 flex flex-col items-center gap-4"
                onClick={() => handleRoleSelection('company')}
                disabled={loading}
              >
                <Building2 className="h-12 w-12" />
                <div className="text-center">
                  <div className="font-semibold text-lg">{dict?.auth?.roleCompany || 'Virksomhed'}</div>
                  <div className="text-sm text-muted-foreground">
                    {dict?.auth?.roleCompanyDescription || 'Jeg søger midlertidige medarbejdere'}
                  </div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

