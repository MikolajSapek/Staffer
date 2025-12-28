'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Upload, X, FileText, User, CheckCircle2 } from 'lucide-react';

type TaxCardType = 'Hovedkort' | 'Bikort' | 'Frikort';

export default function ProfilePage() {
  const router = useRouter();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const idCardInputRef = useRef<HTMLInputElement>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [workerDetails, setWorkerDetails] = useState<any>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingIdCard, setUploadingIdCard] = useState(false);

  // File states
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [idCardFile, setIdCardFile] = useState<File | null>(null);

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
    description: '',
    experience: '',
    cpr_number: '',
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
        } else {
          setProfile(profileData);
        }

        // Fetch worker details using secure RPC (decrypts CPR)
        const { data: workerData, error: workerError } = await supabase.rpc('get_worker_profile_secure');

        if (workerError) {
          // Handle errors gracefully - user might not have profile yet
          if (workerError.code === 'P0001' || workerError.message?.includes('not found')) {
            // Profile doesn't exist yet - this is fine, form will be empty
            console.log('No worker profile found - user can create one');
            setWorkerDetails(null);
          } else {
            console.warn('Worker profile fetch error (ignored):', workerError);
            setWorkerDetails(null);
          }
        } else {
          setWorkerDetails(workerData);
          
          // Populate form with existing data (CPR is now decrypted)
          if (workerData) {
            const data = workerData as any;
            setFormData({
              first_name: data.first_name || '',
              last_name: data.last_name || '',
              phone_number: data.phone_number || '',
              tax_card_type: (data.tax_card_type || 'Hovedkort') as TaxCardType,
              bank_reg_number: data.bank_reg_number || '',
              bank_account_number: data.bank_account_number || '',
              su_limit_amount: data.su_limit_amount?.toString() || '',
              shirt_size: data.shirt_size || '',
              shoe_size: data.shoe_size || '',
              description: data.description || '',
              experience: data.experience || '',
              cpr_number: data.cpr_number || '', // Now decrypted, safe to show in form
            });

            // Set avatar preview if exists
            if (data.avatar_url) {
              setAvatarPreview(data.avatar_url);
            }
          } else {
            // No profile data - form remains empty for user to fill in
            setWorkerDetails(null);
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

  // Handle avatar file selection
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setSubmitError('Avatar skal være et billede');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setSubmitError('Avatar må maksimalt være 5MB');
        return;
      }
      setAvatarFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle ID card file selection
  const handleIdCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        setSubmitError('ID-kort skal være et billede eller PDF');
        return;
      }
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setSubmitError('ID-kort må maksimalt være 10MB');
        return;
      }
      setIdCardFile(file);
    }
  };

  // Upload avatar to Supabase storage
  const uploadAvatar = async (userId: string): Promise<string | null> => {
    if (!avatarFile) return null;

    try {
      const supabase = createClient();
      setUploadingAvatar(true);

      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${userId}/avatar.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload file
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        console.error('Avatar upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err: any) {
      console.error('Avatar upload failed:', err);
      throw new Error('Kunne ikke uploade profilbillede');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Upload ID card to Supabase storage
  const uploadIdCard = async (userId: string): Promise<string | null> => {
    if (!idCardFile) return null;

    try {
      const supabase = createClient();
      setUploadingIdCard(true);

      const fileExt = idCardFile.name.split('.').pop();
      const fileName = `${userId}/id-card.${fileExt}`;
      const filePath = `documents/${fileName}`;

      // Upload file (private bucket)
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, idCardFile, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        console.error('ID card upload error:', uploadError);
        throw uploadError;
      }

      // Get signed URL (for private files)
      const { data: signedUrlData } = await supabase.storage
        .from('documents')
        .createSignedUrl(filePath, 31536000); // 1 year expiry

      return signedUrlData?.signedUrl || filePath;
    } catch (err: any) {
      console.error('ID card upload failed:', err);
      throw new Error('Kunne ikke uploade ID-kort');
    } finally {
      setUploadingIdCard(false);
    }
  };

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

      // Handle CPR - validate format if provided
      // Send plain text to RPC, database will handle encryption
      let cprNumber = '';
      if (formData.cpr_number.trim()) {
        // Validate CPR format
        const cprRegex = /^\d{6}-?\d{4}$/;
        if (!cprRegex.test(formData.cpr_number.replace(/-/g, ''))) {
          setSubmitError('CPR-nummer skal være i formatet DDMMÅÅ-XXXX');
          setSubmitLoading(false);
          return;
        }
        cprNumber = formData.cpr_number.trim();
      }

      // If no CPR provided and none exists, require it for new profiles
      // Check if CPR exists in workerDetails (from RPC, it's decrypted as cpr_number)
      if (!cprNumber && !workerDetails?.cpr_number) {
        setSubmitError('CPR-nummer er påkrævet ved første oprettelse.');
        setSubmitLoading(false);
        return;
      }

      // Upload files if selected
      let avatarUrl = (workerDetails as any)?.avatar_url || '';
      if (avatarFile) {
        try {
          const uploadedUrl = await uploadAvatar(user.id);
          if (uploadedUrl) {
            avatarUrl = uploadedUrl;
          }
        } catch (uploadErr: any) {
          setSubmitError(uploadErr.message || 'Kunne ikke uploade profilbillede');
          setSubmitLoading(false);
          return;
        }
      }

      let idCardUrl = (workerDetails as any)?.id_card_url || '';
      if (idCardFile) {
        try {
          const uploadedUrl = await uploadIdCard(user.id);
          if (uploadedUrl) {
            idCardUrl = uploadedUrl;
          }
        } catch (uploadErr: any) {
          setSubmitError(uploadErr.message || 'Kunne ikke uploade ID-kort');
          setSubmitLoading(false);
          return;
        }
      }

      // Prepare RPC parameters - must match SQL function signature exactly
      const rpcParams: any = {
        p_first_name: formData.first_name.trim(),
        p_last_name: formData.last_name.trim(),
        p_phone_number: formData.phone_number.trim(),
        p_cpr_number: cprNumber || null, // Send plain text, DB handles encryption
        p_tax_card_type: formData.tax_card_type,
        p_bank_reg_number: formData.bank_reg_number.trim(),
        p_bank_account_number: formData.bank_account_number.trim(),
        p_description: formData.description.trim() || null,
        p_experience: formData.experience.trim() || null,
        p_avatar_url: avatarUrl || null,
        p_id_card_url: idCardUrl || null,
      };

      // Call secure RPC function
      const { error: rpcError } = await supabase.rpc('upsert_worker_secure', rpcParams);

      if (rpcError) {
        console.error('RPC error:', rpcError);
        setSubmitError(rpcError.message || 'Kunne ikke gemme oplysninger');
        setSubmitLoading(false);
        return;
      }

      setSubmitSuccess(true);
      // Clear file inputs
      setAvatarFile(null);
      setIdCardFile(null);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
      if (idCardInputRef.current) idCardInputRef.current.value = '';

      // Refresh data after successful save using secure RPC
      setTimeout(async () => {
        router.refresh();
        const supabase = createClient();
        const { data: refreshedData } = await supabase.rpc('get_worker_profile_secure');
        if (refreshedData) {
          setWorkerDetails(refreshedData);
          const dataAny = refreshedData as any;
          // Update form with refreshed data (including decrypted CPR)
          setFormData({
            first_name: dataAny.first_name || '',
            last_name: dataAny.last_name || '',
            phone_number: dataAny.phone_number || '',
            tax_card_type: (dataAny.tax_card_type || 'Hovedkort') as TaxCardType,
            bank_reg_number: dataAny.bank_reg_number || '',
            bank_account_number: dataAny.bank_account_number || '',
            su_limit_amount: dataAny.su_limit_amount?.toString() || '',
            shirt_size: dataAny.shirt_size || '',
            shoe_size: dataAny.shoe_size || '',
            description: dataAny.description || '',
            experience: dataAny.experience || '',
            cpr_number: dataAny.cpr_number || '', // Decrypted CPR
          });
          if (dataAny.avatar_url) {
            setAvatarPreview(dataAny.avatar_url);
          }
        }
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

  // Helper function to mask CPR (show only last 4 digits)
  const maskCPR = (cpr: string) => {
    if (!cpr || cpr.length < 4) return '******-****';
    const last4 = cpr.slice(-4);
    return `******-${last4}`;
  };

  // Check if profile is complete (has required fields)
  const isProfileComplete = formData.first_name && formData.last_name && formData.phone_number && 
                            (formData.cpr_number || workerDetails?.cpr_number);

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
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

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Live Preview Card (Sticky) */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <Card className="shadow-lg border-2 border-gray-200">
              <CardContent className="p-6">
                {/* Worker ID Card Preview */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Staffer
                      </h3>
                      <p className="text-xs text-gray-500">Worker ID Card</p>
                    </div>
                    {isProfileComplete && (
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="text-xs font-medium">Verified</span>
                      </div>
                    )}
                  </div>

                  {/* Avatar */}
                  <div className="flex justify-center mb-6">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Profile"
                        className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-gray-200 border-4 border-white shadow-lg flex items-center justify-center">
                        <User className="w-16 h-16 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <div className="text-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {formData.first_name && formData.last_name
                        ? `${formData.first_name} ${formData.last_name}`
                        : formData.first_name
                        ? formData.first_name
                        : formData.last_name
                        ? formData.last_name
                        : 'Fornavn Efternavn'}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">Pracownik</p>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-gray-300 my-4"></div>

                  {/* Details */}
                  <div className="space-y-3">
                    {/* CPR (Masked) */}
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                        CPR
                      </p>
                      <p className="text-sm font-mono font-semibold text-gray-900">
                        {formData.cpr_number || workerDetails?.cpr_number
                          ? maskCPR(formData.cpr_number || workerDetails?.cpr_number || '')
                          : '******-****'}
                      </p>
                    </div>

                    {/* Phone */}
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                        Telefon
                      </p>
                      <p className="text-sm font-semibold text-gray-900">
                        {formData.phone_number || 'Telefonnummer...'}
                      </p>
                    </div>

                    {/* Email */}
                    {user && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                          Email
                        </p>
                        <p className="text-sm font-semibold text-gray-900 break-all">
                          {user.email || 'Email...'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="mt-6 pt-4 border-t border-gray-300">
                    <p className="text-xs text-center text-gray-500">
                      {isProfileComplete 
                        ? 'Profil komplet' 
                        : 'Udfyld formularen for at aktivere'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column: Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Arbejdsdetaljer</CardTitle>
              <CardDescription>
                Udfyld dine oplysninger som medarbejder
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-8">
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
                  <div className="border-b pb-2">
                    <h3 className="text-lg font-semibold">Personlige oplysninger</h3>
                    <p className="text-sm text-muted-foreground">Grundlæggende information om dig</p>
                  </div>
              
              {/* Avatar Upload */}
              <div className="space-y-2">
                <Label>Profilbillede</Label>
                <div className="flex items-center gap-4">
                  {avatarPreview && (
                    <div className="relative">
                      <img
                        src={avatarPreview}
                        alt="Avatar preview"
                        className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setAvatarPreview('');
                          setAvatarFile(null);
                          if (avatarInputRef.current) avatarInputRef.current.value = '';
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      disabled={submitLoading || uploadingAvatar}
                      className="hidden"
                      id="avatar-upload"
                    />
                    <label
                      htmlFor="avatar-upload"
                      className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Upload className="w-4 h-4" />
                      {avatarFile ? avatarFile.name : 'Vælg profilbillede'}
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Maksimalt 5MB. JPG, PNG eller GIF
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="first_name">Fornavn *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name || ''}
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
                    value={formData.last_name || ''}
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
                  value={formData.phone_number || ''}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  required
                  placeholder="+45 12 34 56 78"
                  disabled={submitLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cpr_number">
                  CPR-nummer {!workerDetails?.cpr_number && '*'}
                </Label>
                <Input
                  id="cpr_number"
                  type="text"
                  placeholder={workerDetails?.cpr_number ? "Indtast nyt CPR-nummer for at opdatere" : "DDMMÅÅ-XXXX"}
                  value={formData.cpr_number || ''}
                  onChange={(e) => setFormData({ ...formData, cpr_number: e.target.value })}
                  required={!workerDetails?.cpr_number}
                  maxLength={11}
                  disabled={submitLoading}
                />
                <p className="text-xs text-muted-foreground">
                  {workerDetails?.cpr_number 
                    ? "CPR-nummer er allerede gemt. Indtast kun hvis du vil opdatere det."
                    : "CPR-nummeret bliver gemt sikkert. Påkrævet ved første oprettelse."}
                </p>
              </div>
            </div>

                {/* Tax and Bank Information Section */}
                <div className="space-y-4">
                  <div className="border-b pb-2">
                    <h3 className="text-lg font-semibold">Skatte- og bankoplysninger</h3>
                    <p className="text-sm text-muted-foreground">Information til løn og betaling</p>
                  </div>
              
              <div className="space-y-2">
                <Label htmlFor="tax_card_type">Skattekort type *</Label>
                <select
                  id="tax_card_type"
                  value={formData.tax_card_type || 'Hovedkort'}
                  onChange={(e) => setFormData({ ...formData, tax_card_type: e.target.value as TaxCardType })}
                  required
                  disabled={submitLoading}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="Hovedkort">Hovedkort</option>
                  <option value="Bikort">Bikort</option>
                  <option value="Frikort">Frikort</option>
                </select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bank_reg_number">Registreringsnummer *</Label>
                  <Input
                    id="bank_reg_number"
                    value={formData.bank_reg_number || ''}
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
                    value={formData.bank_account_number || ''}
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
                  value={formData.su_limit_amount || ''}
                  onChange={(e) => setFormData({ ...formData, su_limit_amount: e.target.value })}
                  placeholder="0.00"
                  disabled={submitLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Maksimalt beløb du kan tjene uden at påvirke din SU
                </p>
              </div>
            </div>

                {/* Bio and Experience Section */}
                <div className="space-y-4">
                  <div className="border-b pb-2">
                    <h3 className="text-lg font-semibold">Beskrivelse og erfaring</h3>
                    <p className="text-sm text-muted-foreground">Fortæl om dig selv og din baggrund</p>
                  </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Beskrivelse / Bio</Label>
                <textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Beskriv dig selv kort..."
                  rows={4}
                  disabled={submitLoading}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="experience">Arbejdserfaring</Label>
                <textarea
                  id="experience"
                  value={formData.experience || ''}
                  onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                  placeholder="Beskriv din arbejdserfaring..."
                  rows={6}
                  disabled={submitLoading}
                  className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>

                {/* Additional Information Section */}
                <div className="space-y-4">
                  <div className="border-b pb-2">
                    <h3 className="text-lg font-semibold">Yderligere oplysninger</h3>
                    <p className="text-sm text-muted-foreground">Valgfri detaljer</p>
                  </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="shirt_size">T-shirt størrelse</Label>
                  <Input
                    id="shirt_size"
                    value={formData.shirt_size || ''}
                    onChange={(e) => setFormData({ ...formData, shirt_size: e.target.value })}
                    placeholder="S, M, L, XL, etc."
                    disabled={submitLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shoe_size">Sko størrelse</Label>
                  <Input
                    id="shoe_size"
                    value={formData.shoe_size || ''}
                    onChange={(e) => setFormData({ ...formData, shoe_size: e.target.value })}
                    placeholder="38, 39, 40, etc."
                    disabled={submitLoading}
                  />
                </div>
              </div>
            </div>

                {/* ID Verification Section */}
                <div className="space-y-4">
                  <div className="border-b pb-2">
                    <h3 className="text-lg font-semibold">Dokumenter</h3>
                    <p className="text-sm text-muted-foreground">Upload ID-kort til verifikation</p>
                  </div>
              
              <div className="space-y-2">
                <Label htmlFor="id-card-upload">ID-kort / Pas</Label>
                <div className="flex items-center gap-4">
                  {idCardFile && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <FileText className="w-5 h-5" />
                      <span>{idCardFile.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setIdCardFile(null);
                          if (idCardInputRef.current) idCardInputRef.current.value = '';
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {!idCardFile && (workerDetails as any)?.id_card_url && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <FileText className="w-5 h-5" />
                      <span>ID-kort allerede uploadet</span>
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      ref={idCardInputRef}
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleIdCardChange}
                      disabled={submitLoading || uploadingIdCard}
                      className="hidden"
                      id="id-card-upload"
                    />
                    <label
                      htmlFor="id-card-upload"
                      className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Upload className="w-4 h-4" />
                      {idCardFile ? 'Skift fil' : 'Upload ID-kort'}
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Maksimalt 10MB. JPG, PNG eller PDF
                    </p>
                  </div>
                </div>
              </div>
            </div>

                <div className="flex justify-end pt-6 border-t">
                  <Button 
                    type="submit" 
                    disabled={submitLoading || uploadingAvatar || uploadingIdCard || !user} 
                    size="lg"
                    className="min-w-[200px]"
                  >
                    {submitLoading || uploadingAvatar || uploadingIdCard 
                      ? 'Gemmer...' 
                      : 'Gem oplysninger'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
