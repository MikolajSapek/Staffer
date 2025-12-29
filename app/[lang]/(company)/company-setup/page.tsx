'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/utils/supabase/client';
import { Building2, Loader2 } from 'lucide-react';

export default function CompanyOnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isNavigatingRef = useRef(false);
  const [formData, setFormData] = useState({
    company_name: '',
    cvr_number: '',
    main_address: '',
  });

  // Check if user is authenticated and has company role
  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (!user) {
        router.push('/login');
        return;
      }

      // Check role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (!profile || profile.role !== 'company') {
        router.push('/');
        return;
      }

      // Check if company_details already exists
      const { data: companyDetails } = await supabase
        .from('company_details')
        .select('profile_id')
        .eq('profile_id', user.id)
        .maybeSingle();

      if (!isMounted) return;

      // If company_details exists, redirect to dashboard
      if (companyDetails) {
        router.push('/dashboard');
        return;
      }

      setChecking(false);
    }

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Special handling for CVR number - only allow digits
    if (name === 'cvr_number') {
      // Remove any non-digit characters
      const digitsOnly = value.replace(/\D/g, '');
      // Limit to 8 digits
      if (digitsOnly.length <= 8) {
        setFormData((prev) => ({ ...prev, [name]: digitsOnly }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate form
      if (!formData.company_name.trim()) {
        setError('Virksomhedsnavn er påkrævet');
        setLoading(false);
        return;
      }

      if (!formData.cvr_number.trim()) {
        setError('CVR-nummer er påkrævet');
        setLoading(false);
        return;
      }

      // Validate CVR is exactly 8 digits
      if (formData.cvr_number.length !== 8) {
        setError('CVR-nummer skal være præcis 8 cifre');
        setLoading(false);
        return;
      }

      if (!formData.main_address.trim()) {
        setError('Hovedadresse er påkrævet');
        setLoading(false);
        return;
      }

      const supabase = createClient();
      
      // Get current user and verify session
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError) {
        console.error('Auth error:', userError);
        setError('Fejl ved autentificering. Prøv at logge ud og ind igen.');
        setLoading(false);
        return;
      }

      if (!user || !user.id) {
        console.error('No user or user.id found');
        setError('Du er ikke logget ind');
        setLoading(false);
        return;
      }

      // Verify user ID is a valid UUID
      if (typeof user.id !== 'string' || user.id.length === 0) {
        console.error('Invalid user.id:', user.id);
        setError('Ugyldig bruger-ID. Prøv at logge ud og ind igen.');
        setLoading(false);
        return;
      }

      // Insert company details with EXPLICIT profile_id
      const insertPayload = {
        profile_id: user.id, // CRITICAL: Must match auth.uid() for RLS policy
        company_name: formData.company_name.trim(),
        cvr_number: formData.cvr_number.trim(),
        main_address: formData.main_address.trim(),
      };

      console.log('Inserting company_details with profile_id:', user.id);

      const { error: insertError } = await supabase
        .from('company_details')
        .insert(insertPayload);

      if (insertError) {
        console.error('Company details insert error:', {
          code: insertError.code,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          profile_id: user.id,
        });

        // Handle unique constraint violation (CVR already exists)
        if (insertError.code === '23505') {
          setError('Dette CVR-nummer er allerede registreret');
        } else if (insertError.code === '42501') {
          // Permission denied - RLS policy issue
          // This usually means profile_id doesn't match auth.uid()
          setError(`RLS fejl: Du har ikke tilladelse. Kontroller at du er logget ind korrekt. (User ID: ${user.id})`);
        } else if (insertError.code === 'PGRST116') {
          // Missing required field
          setError('Manglende påkrævet felt. Kontakt support.');
        } else {
          // Better error message extraction
          const errorMessage = insertError.message || 
                             insertError.details || 
                             insertError.hint || 
                             'Der opstod en fejl ved oprettelse af virksomhedsoplysninger';
          setError(errorMessage);
        }
        setLoading(false);
        return;
      }

      // Success - redirect to dashboard
      // Prevent multiple navigation attempts
      if (isNavigatingRef.current) return;
      isNavigatingRef.current = true;
      
      // Use setTimeout to ensure state updates complete before navigation
      setTimeout(() => {
        router.push('/dashboard');
      }, 0);
    } catch (err: any) {
      console.error('Error submitting form:', err);
      setError(err.message || 'Der opstod en uventet fejl. Prøv igen.');
      setLoading(false);
    }
  };

  // Show loading while checking auth
  if (checking) {
    return (
      <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
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
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-primary/10 p-3">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Virksomhedsoplysninger</CardTitle>
            <CardDescription>
              Trin 1 af 1 - Udfyld venligst nedenstående oplysninger for at fortsætte
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="company_name">
                  Virksomhedsnavn <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="company_name"
                  name="company_name"
                  type="text"
                  value={formData.company_name}
                  onChange={handleInputChange}
                  placeholder="Indtast virksomhedsnavn"
                  required
                  disabled={loading}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cvr_number">
                  CVR-nummer <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="cvr_number"
                  name="cvr_number"
                  type="text"
                  inputMode="numeric"
                  value={formData.cvr_number}
                  onChange={handleInputChange}
                  placeholder="12345678"
                  required
                  disabled={loading}
                  maxLength={8}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  8 cifre (kun tal)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="main_address">
                  Hovedadresse <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="main_address"
                  name="main_address"
                  type="text"
                  value={formData.main_address}
                  onChange={handleInputChange}
                  placeholder="Indtast hovedadresse"
                  required
                  disabled={loading}
                  className="w-full"
                />
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Gemmer...
                    </>
                  ) : (
                    'Fortsæt til dashboard'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

