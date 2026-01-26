'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Briefcase, Building2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

interface OnboardingClientProps {
  dict: {
    auth: {
      roleWorker: string;
      roleWorkerDescription: string;
      roleCompany: string;
      roleCompanyDescription: string;
    };
    onboarding: {
      title: string;
      description: string;
      roleUpdateError: string;
    };
    common?: {
      loading?: string;
    };
  };
  lang: string;
}

export default function OnboardingClient({ dict, lang }: OnboardingClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        router.push(`/${lang}/schedule`);
      } else {
        // For companies, check if they have company_details
        // If not, they'll be redirected to onboarding by the dashboard page
        router.push(`/${lang}/dashboard`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : dict.onboarding.roleUpdateError;
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[calc(100vh-200px)]">
      <div className="w-full max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{dict.onboarding.title}</CardTitle>
            <CardDescription>
              {dict.onboarding.description}
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
                  <div className="font-semibold text-lg">{dict.auth.roleWorker}</div>
                  <div className="text-sm text-muted-foreground">
                    {dict.auth.roleWorkerDescription}
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
                  <div className="font-semibold text-lg">{dict.auth.roleCompany}</div>
                  <div className="text-sm text-muted-foreground">
                    {dict.auth.roleCompanyDescription}
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
