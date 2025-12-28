'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

type TaxCardType = 'Hovedkort' | 'Bikort' | 'Frikort';

export default function ProfilePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [workerDetails, setWorkerDetails] = useState<any>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Initialize form data with empty strings
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
    tax_card_type: 'Hovedkort' as TaxCardType,
    bank_reg_number: '',
    bank_account_number: '',
    su_limit_amount: '',
    shirt_size: '',
    shoe_size: '',
    avatar_url: '',
    cpr_number: '', // Never stored in plain text
  });

  // Fetch user and profile data on mount
  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = createClient();
        
        // Get authenticated user
        const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.warn('Auth error (non-critical):', userError);
          setAuthError('Kunne ikke bekræfte din session. Prøv at logge ind igen.');
          setIsLoading(false);
          return;
        }

        if (!authUser) {
          setAuthError('Du er ikke logget ind. Log venligst ind for at fortsætte.');
          setIsLoading(false);
          return;
        }

        setUser(authUser);

        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle();

        if (profileError) {
          console.warn('Profile fetch error (non-critical):', profileError);
          // Continue anyway - user might not have profile yet
        } else {
          setProfile(profileData);
        }

        // Fetch worker details - ignore 406 or other errors
        const { data: workerData, error: workerError } = await supabase
          .from('worker_details')
          .select('*')
          .eq('profile_id', authUser.id)
          .maybeSingle();

        if (workerError) {
          // Ignore errors - user might not have worker_details yet
          console.warn('Worker details fetch error (ignored):', workerError);
          setWorkerDetails(null);
        } else {
          setWorkerDetails(workerData);
          
          // Populate form with existing data
          if (workerData) {
            setFormData({
              first_name: workerData.first_name || '',
              last_name: workerData.last_name || '',
              phone_number: workerData.phone_number || '',
              tax_card_type: (workerData.tax_card_type || 'Hovedkort') as TaxCardType,
              bank_reg_number: workerData.bank_reg_number || '',
              bank_account_number: workerData.bank_account_number || '',
              su_limit_amount: workerData.su_limit_amount?.toString() || '',
              shirt_size: workerData.shirt_size || '',
              shoe_size: workerData.shoe_size || '',
              avatar_url: workerData.avatar_url || '',
              cpr_number: '', // Never populate CPR from database
            });
          }
        }

        setFetchError(null);
      } catch (err: any) {
        console.error('Unexpected error fetching data:', err);
        setFetchError('Der opstod en uventet fejl ved indlæsning af data.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      if (!user) {
        setSubmitError('Du er ikke logget ind.');
        setSubmitLoading(false);
        return;
      }

      const supabase = createClient();

      // Validate required fields
      if (!formData.first_name.trim() || !formData.last_name.trim()) {
        setSubmitError('Fornavn og efternavn er påkrævet');
        setSubmitLoading(false);
        return;
      }

      if (!formData.phone_number.trim()) {
        setSubmitError('Telefonnummer er påkrævet');
        setSubmitLoading(false);
        return;
      }

      if (!formData.bank_reg_number.trim() || !formData.bank_account_number.trim()) {
        setSubmitError('Bankoplysninger er påkrævet');
        setSubmitLoading(false);
        return;
      }

      // Handle CPR encryption if provided
      let cprEncrypted = workerDetails?.cpr_number_encrypted;
      if (formData.cpr_number.trim()) {
        // Validate CPR format
        const cprRegex = /^\d{6}-?\d{4}$/;
        if (!cprRegex.test(formData.cpr_number.replace(/-/g, ''))) {
          setSubmitError('CPR-nummer skal være i formatet DDMMÅÅ-XXXX');
          setSubmitLoading(false);
          return;
        }

        // Try to encrypt via edge function
        try {
          const { data: encryptedData, error: encryptError } = await supabase.functions.invoke(
            'encrypt-cpr',
            {
              body: { cpr: formData.cpr_number },
            }
          );

          if (encryptError || !encryptedData?.encrypted) {
            console.warn('CPR encryption failed:', encryptError);
            setSubmitError('Kunne ikke kryptere CPR-nummer. Prøv igen eller kontakt support.');
            setSubmitLoading(false);
            return;
          }

          cprEncrypted = encryptedData.encrypted;
        } catch (encryptErr: any) {
          console.error('CPR encryption error:', encryptErr);
          setSubmitError('Kunne ikke kryptere CPR-nummer. Prøv igen.');
          setSubmitLoading(false);
          return;
        }
      }

      // If no CPR encrypted value exists, we need it for new profiles
      if (!cprEncrypted && !workerDetails?.cpr_number_encrypted) {
        setSubmitError('CPR-nummer er påkrævet ved første oprettelse.');
        setSubmitLoading(false);
        return;
      }

      // Use existing encrypted CPR if no new one was provided
      if (!cprEncrypted && workerDetails?.cpr_number_encrypted) {
        cprEncrypted = workerDetails.cpr_number_encrypted;
      }

      // Prepare update data
      const updateData: any = {
        profile_id: user.id,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        phone_number: formData.phone_number.trim(),
        tax_card_type: formData.tax_card_type,
        bank_reg_number: formData.bank_reg_number.trim(),
        bank_account_number: formData.bank_account_number.trim(),
        cpr_number_encrypted: cprEncrypted,
      };

      // Add optional fields if provided
      if (formData.su_limit_amount.trim()) {
        const suAmount = parseFloat(formData.su_limit_amount);
        if (!isNaN(suAmount) && suAmount >= 0) {
          updateData.su_limit_amount = suAmount;
        }
      }

      if (formData.shirt_size.trim()) {
        updateData.shirt_size = formData.shirt_size.trim();
      }

      if (formData.shoe_size.trim()) {
        updateData.shoe_size = formData.shoe_size.trim();
      }

      if (formData.avatar_url.trim()) {
        updateData.avatar_url = formData.avatar_url.trim();
      }

      // Upsert worker details
      const { error: upsertError } = await supabase
        .from('worker_details')
        .upsert(updateData, { onConflict: 'profile_id' });

      if (upsertError) {
        console.error('Upsert error:', upsertError);
        setSubmitError(upsertError.message || 'Kunne ikke gemme oplysninger');
        setSubmitLoading(false);
        return;
      }

      setSubmitSuccess(true);
      // Refresh data after successful save
      setTimeout(() => {
        router.refresh();
        // Reload worker details
        const supabase = createClient();
        supabase
          .from('worker_details')
          .select('*')
          .eq('profile_id', user.id)
          .maybeSingle()
          .then(({ data }) => {
            if (data) {
              setWorkerDetails(data);
            }
          });
      }, 1500);
    } catch (err: any) {
      console.error('Submit error:', err);
      setSubmitError(err.message || 'Der opstod en fejl ved gemning af oplysninger');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Indlæser profil...</p>
        </div>
      </div>
    );
  }

  // Show auth error - NO REDIRECT, just message
  if (authError) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-red-600 text-lg font-semibold mb-2">{authError}</p>
            <p className="text-muted-foreground text-sm">
              Gå til <a href="/login" className="text-blue-600 hover:underline">login siden</a> for at logge ind.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Min Profil</h1>
        <p className="text-muted-foreground">
          Opdater dine personlige oplysninger og arbejdsdetaljer
        </p>
      </div>

      {/* Fetch Error Message */}
      {fetchError && (
        <Card className="mb-6 border-yellow-200 bg-yellow-50">
          <CardContent className="py-4">
            <p className="text-yellow-800 text-sm">{fetchError}</p>
            <p className="text-yellow-700 text-xs mt-1">
              Du kan stadig udfylde formularen nedenfor.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Basic Profile Info Card */}
      {user && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Grundlæggende oplysninger</CardTitle>
            <CardDescription>
              Din email og rolle i systemet
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
              <p className="text-lg font-semibold">{user.email || 'Ikke angivet'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Rolle</label>
              <p className="text-lg font-semibold text-blue-600 capitalize">
                {profile?.role === 'worker' ? 'Medarbejder' : 
                 profile?.role === 'company' ? 'Virksomhed' : 
                 profile?.role === 'admin' ? 'Administrator' : 'Ikke tildelt'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Worker Details Form */}
      <Card>
        <CardHeader>
          <CardTitle>Arbejdsdetaljer</CardTitle>
          <CardDescription>
            Udfyld dine oplysninger som medarbejder
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {submitError && (
              <div className="p-4 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
                {submitError}
              </div>
            )}
            {submitSuccess && (
              <div className="p-4 text-sm text-green-600 bg-green-50 rounded-md border border-green-200">
                Profil opdateret! Opdaterer data...
              </div>
            )}

            {/* Personal Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Personlige oplysninger</h3>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="first_name">Fornavn *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    required
                    placeholder="Indtast dit fornavn"
                    disabled={submitLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Efternavn *</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    required
                    placeholder="Indtast dit efternavn"
                    disabled={submitLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone_number">Telefonnummer *</Label>
                <Input
                  id="phone_number"
                  type="tel"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  required
                  placeholder="+45 12 34 56 78"
                  disabled={submitLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cpr_number">
                  CPR-nummer {!workerDetails?.cpr_number_encrypted && '*'}
                </Label>
                <Input
                  id="cpr_number"
                  type="text"
                  placeholder={workerDetails?.cpr_number_encrypted ? "Indtast nyt CPR-nummer for at opdatere" : "DDMMÅÅ-XXXX"}
                  value={formData.cpr_number}
                  onChange={(e) => setFormData({ ...formData, cpr_number: e.target.value })}
                  required={!workerDetails?.cpr_number_encrypted}
                  maxLength={11}
                  disabled={submitLoading}
                />
                <p className="text-xs text-muted-foreground">
                  {workerDetails?.cpr_number_encrypted 
                    ? "CPR-nummer er allerede gemt. Indtast kun hvis du vil opdatere det."
                    : "CPR-nummeret bliver krypteret og gemt sikkert. Påkrævet ved første oprettelse."}
                </p>
              </div>
            </div>

            {/* Tax and Bank Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Skatte- og bankoplysninger</h3>
              
              <div className="space-y-2">
                <Label htmlFor="tax_card_type">Skattekort type *</Label>
                <Select
                  value={formData.tax_card_type}
                  onValueChange={(value) => setFormData({ ...formData, tax_card_type: value as TaxCardType })}
                  required
                  disabled={submitLoading}
                >
                  <SelectTrigger id="tax_card_type">
                    <SelectValue placeholder="Vælg skattekort type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Hovedkort">Hovedkort</SelectItem>
                    <SelectItem value="Bikort">Bikort</SelectItem>
                    <SelectItem value="Frikort">Frikort</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bank_reg_number">Registreringsnummer *</Label>
                  <Input
                    id="bank_reg_number"
                    value={formData.bank_reg_number}
                    onChange={(e) => setFormData({ ...formData, bank_reg_number: e.target.value })}
                    required
                    placeholder="1234"
                    maxLength={4}
                    disabled={submitLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank_account_number">Kontonummer *</Label>
                  <Input
                    id="bank_account_number"
                    value={formData.bank_account_number}
                    onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })}
                    required
                    placeholder="1234567890"
                    disabled={submitLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="su_limit_amount">SU-grænse (valgfrit)</Label>
                <Input
                  id="su_limit_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.su_limit_amount}
                  onChange={(e) => setFormData({ ...formData, su_limit_amount: e.target.value })}
                  placeholder="0.00"
                  disabled={submitLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Maksimalt beløb du kan tjene uden at påvirke din SU
                </p>
              </div>
            </div>

            {/* Additional Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Yderligere oplysninger (valgfrit)</h3>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="shirt_size">T-shirt størrelse</Label>
                  <Input
                    id="shirt_size"
                    value={formData.shirt_size}
                    onChange={(e) => setFormData({ ...formData, shirt_size: e.target.value })}
                    placeholder="S, M, L, XL, etc."
                    disabled={submitLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shoe_size">Sko størrelse</Label>
                  <Input
                    id="shoe_size"
                    value={formData.shoe_size}
                    onChange={(e) => setFormData({ ...formData, shoe_size: e.target.value })}
                    placeholder="38, 39, 40, etc."
                    disabled={submitLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="avatar_url">Profilbillede URL (valgfrit)</Label>
                <Input
                  id="avatar_url"
                  type="url"
                  value={formData.avatar_url}
                  onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                  placeholder="https://example.com/avatar.jpg"
                  disabled={submitLoading}
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button type="submit" disabled={submitLoading || !user} size="lg">
                {submitLoading ? 'Gemmer...' : 'Gem oplysninger'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
