'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Upload, X, Building2 } from 'lucide-react';

interface CompanyProfileFormProps {
  dict: {
    title: string;
    subtitle: string;
    loading: string;
    authError: string;
    notLoggedIn: string;
    goToLogin: string;
    companyDetails: string;
    companyDetailsDescription: string;
    companyName: string;
    companyNamePlaceholder: string;
    cvrNumber: string;
    cvrNumberPlaceholder: string;
    cvrNumberHint: string;
    invoiceEmail: string;
    invoiceEmailPlaceholder: string;
    invoiceEmailHint: string;
    mainAddress: string;
    mainAddressPlaceholder: string;
    eanNumber: string;
    eanNumberPlaceholder: string;
    eanNumberHint: string;
    description: string;
    descriptionPlaceholder: string;
    logo: string;
    logoHint: string;
    selectLogo: string;
    coverPhoto: string;
    coverPhotoHint: string;
    selectCoverPhoto: string;
    subscriptionStatus: string;
    subscriptionStatusActive: string;
    subscriptionStatusInactive: string;
    subscriptionStatusCancelled: string;
    saveChanges: string;
    saving: string;
    profileUpdated: string;
    validation: {
      companyNameRequired: string;
      cvrNumberRequired: string;
      invalidEmail: string;
      saveFailed: string;
      imageError: string;
      imageSize: string;
    };
  };
  lang: string;
}

export default function CompanyProfileForm({ dict, lang }: CompanyProfileFormProps) {
  const router = useRouter();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverPhotoInputRef = useRef<HTMLInputElement>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [companyDetails, setCompanyDetails] = useState<any>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCoverPhoto, setUploadingCoverPhoto] = useState(false);

  // File states
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [logoError, setLogoError] = useState(false);
  const [coverPhotoFile, setCoverPhotoFile] = useState<File | null>(null);
  const [coverPhotoPreview, setCoverPhotoPreview] = useState<string>('');
  const [coverPhotoError, setCoverPhotoError] = useState(false);

  const [formData, setFormData] = useState({
    company_name: '',
    cvr_number: '',
    invoice_email: '',
    main_address: '',
    ean_number: '',
    description: '',
    logo_url: '',
    cover_photo_url: '',
  });

  // Validation schema
  const companySchema = z.object({
    company_name: z.string().min(1, dict.validation.companyNameRequired),
    cvr_number: z.string().min(1, dict.validation.cvrNumberRequired),
    invoice_email: z.string().email(dict.validation.invalidEmail).optional().or(z.literal('')),
    main_address: z.string().optional(),
    ean_number: z.string().optional(),
    description: z.string().optional(),
  });

  // Fetch user and company data on mount
  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = createClient();

        // Get authenticated user
        const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();

        if (userError) {
          console.warn('Auth error (non-critical):', userError);
          setAuthError(dict.authError);
          setIsLoading(false);
          return;
        }

        if (!authUser) {
          setAuthError(dict.notLoggedIn);
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

        // Fetch company details
        const { data: companyData, error: companyError } = await supabase
          .from('company_details')
          .select('*')
          .eq('profile_id', authUser.id)
          .maybeSingle();

        if (companyError) {
          console.warn('Company details fetch error (non-critical):', companyError);
          setCompanyDetails(null);
        } else {
          setCompanyDetails(companyData);
          if (companyData) {
            // Populate form with existing data
            setFormData({
              company_name: companyData.company_name || '',
              cvr_number: companyData.cvr_number || '',
              invoice_email: '', // Note: invoice_email might not exist in schema yet
              main_address: companyData.main_address || '',
              ean_number: companyData.ean_number || '',
              description: '', // Description might not exist in schema yet
              logo_url: companyData.logo_url || '',
              cover_photo_url: companyData.cover_photo_url || '',
            });
            
            // Set preview URLs if they exist
            if (companyData.logo_url) {
              setLogoPreview(companyData.logo_url);
            }
            if (companyData.cover_photo_url) {
              setCoverPhotoPreview(companyData.cover_photo_url);
            }
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
  }, [dict]);

  // Handle logo file selection
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setSubmitError(dict.validation.imageError);
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setSubmitError(dict.validation.imageSize);
        return;
      }
      setLogoFile(file);
      setLogoError(false);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle cover photo file selection
  const handleCoverPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setSubmitError(dict.validation.imageError);
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setSubmitError(dict.validation.imageSize);
        return;
      }
      setCoverPhotoFile(file);
      setCoverPhotoError(false);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload logo to Supabase storage
  const uploadLogo = async (userId: string): Promise<string | null> => {
    if (!logoFile) return null;

    try {
      const supabase = createClient();
      setUploadingLogo(true);

      const fileExt = logoFile.name.split('.').pop();
      const timestamp = Date.now();
      const fileName = `${userId}/logo-${timestamp}.${fileExt}`;
      const filePath = `company-assets/${fileName}`;

      // Upload file
      const { error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(filePath, logoFile, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        console.error('Logo upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('company-assets')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err: any) {
      console.error('Logo upload failed:', err);
      throw new Error('Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  // Upload cover photo to Supabase storage
  const uploadCoverPhoto = async (userId: string): Promise<string | null> => {
    if (!coverPhotoFile) return null;

    try {
      const supabase = createClient();
      setUploadingCoverPhoto(true);

      const fileExt = coverPhotoFile.name.split('.').pop();
      const timestamp = Date.now();
      const fileName = `${userId}/cover-${timestamp}.${fileExt}`;
      const filePath = `company-assets/${fileName}`;

      // Upload file
      const { error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(filePath, coverPhotoFile, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        console.error('Cover photo upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('company-assets')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err: any) {
      console.error('Cover photo upload failed:', err);
      throw new Error('Failed to upload cover photo');
    } finally {
      setUploadingCoverPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      if (!user) {
        setSubmitError(dict.validation.saveFailed);
        setSubmitLoading(false);
        return;
      }

      // Validate form data
      const validatedData = companySchema.parse(formData);

      const supabase = createClient();

      // Upload files if selected
      let logoUrl = formData.logo_url || '';
      if (logoFile) {
        try {
          const uploadedUrl = await uploadLogo(user.id);
          if (uploadedUrl) {
            logoUrl = uploadedUrl;
          }
        } catch (uploadErr: any) {
          setSubmitError(uploadErr.message || 'Failed to upload logo');
          setSubmitLoading(false);
          return;
        }
      }

      let coverPhotoUrl = formData.cover_photo_url || '';
      if (coverPhotoFile) {
        try {
          const uploadedUrl = await uploadCoverPhoto(user.id);
          if (uploadedUrl) {
            coverPhotoUrl = uploadedUrl;
          }
        } catch (uploadErr: any) {
          setSubmitError(uploadErr.message || 'Failed to upload cover photo');
          setSubmitLoading(false);
          return;
        }
      }

      // Prepare RPC parameters - map form fields to RPC parameters
      const rpcParams: any = {
        p_company_name: validatedData.company_name.trim(),
        p_cvr_number: validatedData.cvr_number.trim(),
        p_main_address: validatedData.main_address?.trim() || null,
        p_ean_number: validatedData.ean_number?.trim() || null,
        p_invoice_email: validatedData.invoice_email?.trim() || null,
        p_description: validatedData.description?.trim() || null,
        p_logo_url: logoUrl || null,
        p_cover_photo_url: coverPhotoUrl || null,
      };

      // Call secure RPC function
      const { error: rpcError } = await supabase.rpc('upsert_company_secure', rpcParams);

      if (rpcError) {
        console.error('RPC error details:', JSON.stringify(rpcError, null, 2));
        console.error('RPC function: upsert_company_secure');
        console.error('RPC params:', JSON.stringify(rpcParams, null, 2));
        setSubmitError(rpcError.message || dict.validation.saveFailed);
        setSubmitLoading(false);
        return;
      }

      setSubmitSuccess(true);

      // Refresh data after successful save
      setTimeout(async () => {
        router.refresh();
        const supabase = createClient();
        const { data: refreshedData } = await supabase
          .from('company_details')
          .select('*')
          .eq('profile_id', user.id)
          .maybeSingle();

        if (refreshedData) {
          setCompanyDetails(refreshedData);
          setFormData({
            company_name: refreshedData.company_name || '',
            cvr_number: refreshedData.cvr_number || '',
            invoice_email: '',
            main_address: refreshedData.main_address || '',
            ean_number: refreshedData.ean_number || '',
            description: '',
            logo_url: refreshedData.logo_url || '',
            cover_photo_url: refreshedData.cover_photo_url || '',
          });
          
          // Update preview URLs
          if (refreshedData.logo_url) {
            setLogoPreview(refreshedData.logo_url);
          }
          if (refreshedData.cover_photo_url) {
            setCoverPhotoPreview(refreshedData.cover_photo_url);
          }
        }
        
        // Clear file inputs
        setLogoFile(null);
        setCoverPhotoFile(null);
        if (logoInputRef.current) logoInputRef.current.value = '';
        if (coverPhotoInputRef.current) coverPhotoInputRef.current.value = '';
      }, 1500);
    } catch (err: any) {
      console.error('Submit error:', err);
      if (err instanceof z.ZodError) {
        setSubmitError(err.errors[0].message);
      } else {
        setSubmitError(err.message || dict.validation.saveFailed);
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center py-12">
          <p className="text-muted-foreground">{dict.loading}</p>
        </div>
      </div>
    );
  }

  // Show auth error
  if (authError) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-red-600 text-lg font-semibold mb-2">{authError}</p>
            <p className="text-muted-foreground text-sm">
              {dict.goToLogin}{' '}
              <a href={`/${lang}/login`} className="text-blue-600 hover:underline">
                {dict.goToLogin}
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{dict.title}</h1>
        <p className="text-muted-foreground">{dict.subtitle}</p>
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

      <Card className="overflow-hidden">
        {/* Cover Photo Section */}
        <div className="relative w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200">
          {coverPhotoPreview && !coverPhotoError ? (
            <img
              src={coverPhotoPreview}
              alt="Cover photo"
              className="w-full h-full object-cover"
              onError={() => setCoverPhotoError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Building2 className="w-16 h-16 text-gray-400" />
            </div>
          )}
          {/* Cover Photo Upload Button */}
          <div className="absolute bottom-4 right-4">
            <input
              ref={coverPhotoInputRef}
              type="file"
              accept="image/*"
              onChange={handleCoverPhotoChange}
              disabled={submitLoading || uploadingCoverPhoto}
              className="hidden"
              id="cover-photo-upload"
            />
            <label
              htmlFor="cover-photo-upload"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              <Upload className="w-4 h-4" />
              {coverPhotoFile ? coverPhotoFile.name : dict.selectCoverPhoto}
            </label>
          </div>
        </div>

        <CardHeader className="relative">
          {/* Logo Section - Overlapping the cover photo */}
          <div className="absolute -top-16 left-6">
            <div className="relative">
              {logoPreview && !logoError ? (
                <img
                  src={logoPreview}
                  alt="Company logo"
                  className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg bg-white"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg bg-white flex items-center justify-center">
                  <Building2 className="w-16 h-16 text-gray-400" />
                </div>
              )}
              {/* Logo Upload Button */}
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                disabled={submitLoading || uploadingLogo}
                className="hidden"
                id="logo-upload"
              />
              <label
                htmlFor="logo-upload"
                className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-2 cursor-pointer hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                <Upload className="w-4 h-4" />
              </label>
            </div>
          </div>
          
          <div className="pt-28">
            <CardTitle>{dict.companyDetails}</CardTitle>
            <CardDescription>{dict.companyDetailsDescription}</CardDescription>
          </div>
          
          {/* Subscription Status */}
          {companyDetails?.subscription_status && (
            <div className="mt-4">
              <Label className="text-sm text-muted-foreground">{dict.subscriptionStatus}</Label>
              <div className="mt-1">
                <Badge 
                  variant={
                    companyDetails.subscription_status === 'active' ? 'default' :
                    companyDetails.subscription_status === 'cancelled' ? 'destructive' : 'secondary'
                  }
                  className="cursor-not-allowed"
                >
                  {companyDetails.subscription_status === 'active' && dict.subscriptionStatusActive}
                  {companyDetails.subscription_status === 'inactive' && dict.subscriptionStatusInactive}
                  {companyDetails.subscription_status === 'cancelled' && dict.subscriptionStatusCancelled}
                </Badge>
              </div>
            </div>
          )}
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
                {dict.profileUpdated}
              </div>
            )}

            {/* Logo and Cover Photo Hints */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{dict.logo}</Label>
                <p className="text-xs text-muted-foreground">{dict.logoHint}</p>
              </div>
              <div className="space-y-2">
                <Label>{dict.coverPhoto}</Label>
                <p className="text-xs text-muted-foreground">{dict.coverPhotoHint}</p>
              </div>
            </div>

            {/* Company Name */}
            <div className="space-y-2">
              <Label htmlFor="company_name">{dict.companyName} *</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                placeholder={dict.companyNamePlaceholder}
                required
                disabled={submitLoading}
              />
            </div>

            {/* CVR Number */}
            <div className="space-y-2">
              <Label htmlFor="cvr_number">{dict.cvrNumber} *</Label>
              <Input
                id="cvr_number"
                value={formData.cvr_number}
                onChange={(e) => setFormData({ ...formData, cvr_number: e.target.value })}
                placeholder={dict.cvrNumberPlaceholder}
                required
                disabled={submitLoading}
              />
              <p className="text-xs text-muted-foreground">{dict.cvrNumberHint}</p>
            </div>

            {/* Invoice Email */}
            <div className="space-y-2">
              <Label htmlFor="invoice_email">{dict.invoiceEmail}</Label>
              <Input
                id="invoice_email"
                type="email"
                value={formData.invoice_email}
                onChange={(e) => setFormData({ ...formData, invoice_email: e.target.value })}
                placeholder={dict.invoiceEmailPlaceholder}
                disabled={submitLoading}
              />
              <p className="text-xs text-muted-foreground">{dict.invoiceEmailHint}</p>
            </div>

            {/* Main Address */}
            <div className="space-y-2">
              <Label htmlFor="main_address">{dict.mainAddress}</Label>
              <Input
                id="main_address"
                value={formData.main_address}
                onChange={(e) => setFormData({ ...formData, main_address: e.target.value })}
                placeholder={dict.mainAddressPlaceholder}
                disabled={submitLoading}
              />
            </div>

            {/* EAN Number */}
            <div className="space-y-2">
              <Label htmlFor="ean_number">{dict.eanNumber}</Label>
              <Input
                id="ean_number"
                value={formData.ean_number}
                onChange={(e) => setFormData({ ...formData, ean_number: e.target.value })}
                placeholder={dict.eanNumberPlaceholder}
                disabled={submitLoading}
              />
              <p className="text-xs text-muted-foreground">{dict.eanNumberHint}</p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">{dict.description}</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={dict.descriptionPlaceholder}
                rows={4}
                disabled={submitLoading}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="flex justify-end pt-6 border-t">
              <Button 
                type="submit" 
                disabled={submitLoading || uploadingLogo || uploadingCoverPhoto} 
                size="lg" 
                className="min-w-[200px]"
              >
                {submitLoading || uploadingLogo || uploadingCoverPhoto ? dict.saving : dict.saveChanges}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

