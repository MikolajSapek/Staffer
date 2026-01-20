'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Upload, X, User, CheckCircle2, Star, Clock, XCircle } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/date-utils';
import { cn } from '@/lib/utils';
import { ImageCropperModal } from '@/components/ImageCropperModal';
import VerificationWizard from '@/components/verification/VerificationWizard';

interface WorkerProfileFormProps {
  dict: {
    profile: {
      authError: string;
      notLoggedIn: string;
      validation: {
        firstNameRequired: string;
        phoneRequired: string;
        avatarError: string;
        avatarSize: string;
      };
    };
  };
  lang: string;
}

export default function WorkerProfileForm({ dict, lang }: WorkerProfileFormProps) {
  const router = useRouter();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const idCardInputRef = useRef<HTMLInputElement>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [workerDetails, setWorkerDetails] = useState<Record<string, unknown> | null>(null);
  const [workerLoadError, setWorkerLoadError] = useState(false);
  const [profile, setProfile] = useState<{ verification_status?: 'unverified' | 'pending' | 'verified' | 'rejected' } | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingIdCard, setUploadingIdCard] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  // File states
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [avatarError, setAvatarError] = useState(false);
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  
  // Image cropper states
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  
  // Verification wizard states
  const [showVerificationWizard, setShowVerificationWizard] = useState(false);

  // Skills states
  const [availableSkills, setAvailableSkills] = useState<Array<{ id: string; name: string; category: 'language' | 'license' }>>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(true);

  // Initialize form data with empty strings
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
    shirt_size: '',
    shoe_size: '',
    description: '',
    experience: '',
    cpr_number: '',
  });

  // Fetch profile data function
  const fetchProfileData = async (userId: string) => {
    const supabase = createClient();
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('verification_status')
      .eq('id', userId)
      .maybeSingle();
    
    if (!profileError && profileData) {
      setProfile(profileData);
    }
  };

  // Fetch user and profile data on mount
  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = createClient();
        
        // Get authenticated user
        const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          setAuthError(dict.profile.authError);
          setIsLoading(false);
          setSkillsLoading(false);
          return;
        }

        if (!authUser) {
          setAuthError(dict.profile.notLoggedIn);
          setIsLoading(false);
          setSkillsLoading(false);
          return;
        }

        setUser(authUser);

        // Fetch profile data to get verification_status
        await fetchProfileData(authUser.id);

        // Fetch all available skills from the skills table (all 9 records)
        const { data: skillsData, error: skillsError } = await supabase
          .from('skills')
          .select('id, name, category')
          .order('category', { ascending: true })
          .order('name', { ascending: true });

        if (!skillsError && skillsData) {
          setAvailableSkills(skillsData);
        }

        // Fetch current user's selected skills from worker_skills
        const { data: workerSkillsData, error: workerSkillsError } = await supabase
          .from('worker_skills')
          .select('skill_id')
          .eq('worker_id', authUser.id);

        if (!workerSkillsError && workerSkillsData) {
          setSelectedSkillIds(workerSkillsData.map((ws) => ws.skill_id));
        }

        setSkillsLoading(false);

        // Fetch worker details using secure RPC (decrypts CPR)
        const { data: workerData, error: workerError } = await supabase.rpc('get_worker_profile_secure');

        if (workerError) {
          // Handle errors gracefully - user might not have profile yet
          if (workerError.code === 'P0001' || workerError.message?.includes('not found')) {
            // Profile doesn't exist yet - this is fine, form will be empty
            setWorkerDetails(null);
            setWorkerLoadError(false);
          } else {
            setWorkerDetails(null);
            setWorkerLoadError(true);
          }
        } else {
          setWorkerDetails(workerData);
          setWorkerLoadError(false);
          
          // Populate form with existing data (CPR is now decrypted)
          if (workerData) {
            const data = workerData as Record<string, unknown>;
            
            // If RPC doesn't return certain fields, fetch directly from worker_details
            let shirtSize = data.shirt_size;
            let shoeSize = data.shoe_size;
            let description = data.description;
            let experience = data.experience;
            
            // Check if values are null/undefined (not just falsy, to allow empty strings)
            if (shirtSize == null || shoeSize == null || description == null || experience == null) {
              const { data: additionalData } = await supabase
                .from('worker_details')
                .select('shirt_size, shoe_size, description, experience')
                .eq('profile_id', authUser.id)
                .single();
              
              if (additionalData) {
                // Only use fetched values if current values are null/undefined
                if (shirtSize == null) shirtSize = additionalData.shirt_size;
                if (shoeSize == null) shoeSize = additionalData.shoe_size;
                if (description == null) description = additionalData.description;
                if (experience == null) experience = additionalData.experience;
              }
            }
            
            setFormData({
              first_name: data.first_name || '',
              last_name: data.last_name || '',
              phone_number: data.phone_number || '',
              shirt_size: (shirtSize as string) || '',
              shoe_size: (shoeSize as string) || '',
              description: (description as string) || '',
              experience: (experience as string) || '',
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

        // Fetch reviews for this worker
        if (authUser) {
          const { data: reviewsData, error: reviewsError } = await supabase
            .from('reviews')
            .select(`
              *,
              reviewer:profiles!reviews_reviewer_id_fkey (
                company_details (
                  company_name,
                  logo_url
                )
              )
            `)
            .eq('reviewee_id', authUser.id)
            .order('created_at', { ascending: false });

          if (!reviewsError && reviewsData) {
            setReviews(reviewsData || []);
          }
        }
      } catch (err: unknown) {
        setFetchError('Der opstod en uventet fejl ved indlæsning af data.');
      } finally {
        setIsLoading(false);
        setReviewsLoading(false);
      }
    }

    fetchData();
  }, [dict]);

  // Handle avatar file selection - opens cropper instead of directly setting file
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setSubmitError(dict.profile.validation.avatarError);
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setSubmitError(dict.profile.validation.avatarSize);
        return;
      }
      // Create object URL for the cropper
      const url = URL.createObjectURL(file);
      setSelectedImageSrc(url);
      setIsCropperOpen(true);
      // Reset file input
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
    }
  };

  // Handle crop confirmation - converts blob to file and sets it
  const handleCropSave = async (croppedBlob: Blob) => {
    try {
      // Convert blob to File
      const fileToUpload = new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' });
      setAvatarFile(fileToUpload);
      setAvatarError(false);
      
      // Create preview from the cropped blob
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(croppedBlob);
      
      // Close cropper and clean up
      setIsCropperOpen(false);
      if (selectedImageSrc) {
        URL.revokeObjectURL(selectedImageSrc);
        setSelectedImageSrc(null);
      }
    } catch (error) {
      console.error('Error processing cropped image:', error);
      setSubmitError('Failed to process image');
    }
  };

  // Handle cropper close
  const handleCropperClose = () => {
    setIsCropperOpen(false);
    // Clean up object URL
    if (selectedImageSrc) {
      URL.revokeObjectURL(selectedImageSrc);
      setSelectedImageSrc(null);
    }
    // Reset file input
    if (avatarInputRef.current) {
      avatarInputRef.current.value = '';
    }
  };

  // Handle ID card file selection
  const handleIdCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        setSubmitError(dict.profile.validation.idCardError);
        return;
      }
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setSubmitError(dict.profile.validation.idCardSize);
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
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err: unknown) {
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
        throw uploadError;
      }

      // Get signed URL (for private files)
      const { data: signedUrlData } = await supabase.storage
        .from('documents')
        .createSignedUrl(filePath, 31536000); // 1 year expiry

      return signedUrlData?.signedUrl || filePath;
    } catch (err: unknown) {
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
        setSubmitError(dict.profile.validation.notLoggedIn);
        setSubmitLoading(false);
        return;
      }

      const supabase = createClient();

      // Validate required fields
      if (!formData.first_name.trim() || !formData.last_name.trim()) {
        setSubmitError(dict.profile.validation.firstNameRequired);
        setSubmitLoading(false);
        return;
      }

      if (!formData.phone_number.trim()) {
        setSubmitError(dict.profile.validation.phoneRequired);
        setSubmitLoading(false);
        return;
      }

      if (!formData.description.trim()) {
        setSubmitError(dict.profile.validation.descriptionRequired || 'Description is required');
        setSubmitLoading(false);
        return;
      }

      if (!formData.experience.trim()) {
        setSubmitError(dict.profile.validation.experienceRequired || 'Experience is required');
        setSubmitLoading(false);
        return;
      }

      // Validate avatar - check if avatar exists (either from file upload or existing URL)
      const workerDetailsRecord = workerDetails as Record<string, unknown> | null;
      const existingAvatarUrl = (workerDetailsRecord?.avatar_url as string) || '';
      if (!avatarFile && !existingAvatarUrl && !avatarPreview) {
        setSubmitError(dict.profile.validation.avatarRequired || 'Profile photo is required');
        setSubmitLoading(false);
        return;
      }

      // Handle CPR - validate format if provided
      // Send plain text to RPC, database will handle encryption
      let cprNumber = '';
      if (formData.cpr_number.trim()) {
        // Validate CPR format - must be exactly 10 digits
        const cprRegex = /^\d{10}$/;
        if (!cprRegex.test(formData.cpr_number.trim())) {
          setSubmitError(dict.profile.validation.cprFormat);
          setSubmitLoading(false);
          return;
        }
        cprNumber = formData.cpr_number.trim();
      }

      // If no CPR provided and none exists, require it for new profiles
      // Check if CPR exists in workerDetails (from RPC, it's decrypted as cpr_number)
      if (!cprNumber && !workerDetails?.cpr_number) {
        setSubmitError(dict.profile.validation.cprRequired);
        setSubmitLoading(false);
        return;
      }

      // Upload files if selected
      let avatarUrl = (workerDetailsRecord?.avatar_url as string) || '';
      if (avatarFile) {
        try {
          const uploadedUrl = await uploadAvatar(user.id);
          if (uploadedUrl) {
            avatarUrl = uploadedUrl;
          }
        } catch (uploadErr: unknown) {
          const errorMessage = uploadErr instanceof Error ? uploadErr.message : 'Kunne ikke uploade profilbillede';
          setSubmitError(errorMessage);
          setSubmitLoading(false);
          return;
        }
      }

      let idCardUrl = (workerDetailsRecord?.id_card_url as string) || '';
      if (idCardFile) {
        try {
          const uploadedUrl = await uploadIdCard(user.id);
          if (uploadedUrl) {
            idCardUrl = uploadedUrl;
          }
        } catch (uploadErr: unknown) {
          const errorMessage = uploadErr instanceof Error ? uploadErr.message : 'Kunne ikke uploade ID-kort';
          setSubmitError(errorMessage);
          setSubmitLoading(false);
          return;
        }
      }

      // Update worker_details directly (combined update for all fields)
      const { error: updateError } = await supabase
        .from('worker_details')
        .update({
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          phone_number: formData.phone_number.trim(),
          description: formData.description.trim() || null,
          experience: formData.experience.trim() || null,
          avatar_url: avatarUrl || null,
          shirt_size: formData.shirt_size.trim() || null,
          shoe_size: formData.shoe_size.trim() || null,
        })
        .eq('profile_id', user.id);

      if (updateError) {
        setSubmitError(updateError.message || 'Kunne ikke gemme oplysninger');
        setSubmitLoading(false);
        return;
      }

      // SYNC PATTERN for worker_skills:
      // 1. Delete all existing skills for this worker
      const { error: deleteError } = await supabase
        .from('worker_skills')
        .delete()
        .eq('worker_id', user.id);

      if (deleteError) {
        setSubmitError(deleteError.message || 'Could not update skills');
        setSubmitLoading(false);
        return;
      }

      // 2. Insert the newly selected skills (only if any are selected)
      if (selectedSkillIds.length > 0) {
        const skillsToInsert = selectedSkillIds.map((skillId) => ({
          worker_id: user.id, // Explicitly set to authenticated user's ID for security
          skill_id: skillId,
          verified: false, // Default to unverified
        }));

        const { error: insertError } = await supabase
          .from('worker_skills')
          .insert(skillsToInsert);

        if (insertError) {
          setSubmitError(insertError.message || 'Could not save skills');
          setSubmitLoading(false);
          return;
        }
      }

      // Immediately update formData to reflect saved values (no need to wait for refresh)
      // This ensures the values stay visible in the form
      setFormData(prev => ({
        ...prev,
        shirt_size: formData.shirt_size.trim() || '',
        shoe_size: formData.shoe_size.trim() || '',
      }));

      setSubmitSuccess(true);
      // Clear file inputs
      setAvatarFile(null);
      setIdCardFile(null);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
      if (idCardInputRef.current) idCardInputRef.current.value = '';

      // Refresh router to get fresh data from database (after all updates)
      router.refresh();

      // Refresh data after successful save - use setTimeout to ensure DB has committed
      setTimeout(async () => {
        const supabaseRefresh = createClient();
        
        // First try to get data from RPC
        const { data: refreshedData } = await supabaseRefresh.rpc('get_worker_profile_secure');
        
        // If RPC doesn't return certain fields, fetch directly from worker_details
        let shirtSize = refreshedData?.shirt_size;
        let shoeSize = refreshedData?.shoe_size;
        let description = refreshedData?.description;
        let experience = refreshedData?.experience;
        
        // Check if values are null/undefined (not just falsy, to allow empty strings)
        if (shirtSize == null || shoeSize == null || description == null || experience == null) {
          const { data: additionalData } = await supabaseRefresh
            .from('worker_details')
            .select('shirt_size, shoe_size, description, experience')
            .eq('profile_id', user.id)
            .single();
          
          if (additionalData) {
            // Only use fetched values if current values are null/undefined
            if (shirtSize == null) shirtSize = additionalData.shirt_size;
            if (shoeSize == null) shoeSize = additionalData.shoe_size;
            if (description == null) description = additionalData.description;
            if (experience == null) experience = additionalData.experience;
          }
        }
        
        if (refreshedData) {
          setWorkerDetails(refreshedData);
          const data = refreshedData as Record<string, unknown>;
          // Update form with refreshed data (including decrypted CPR, sizes, description, and experience)
          setFormData({
            first_name: (data.first_name as string) || '',
            last_name: (data.last_name as string) || '',
            phone_number: (data.phone_number as string) || '',
            shirt_size: (shirtSize as string) || (data.shirt_size as string) || '',
            shoe_size: (shoeSize as string) || (data.shoe_size as string) || '',
            description: (description as string) || (data.description as string) || '',
            experience: (experience as string) || (data.experience as string) || '',
            cpr_number: (data.cpr_number as string) || '', // Decrypted CPR
          });
          if (data.avatar_url) {
            setAvatarPreview(data.avatar_url as string);
            setAvatarError(false); // Reset error state when loading existing avatar
          }
        }
      }, 500);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Der opstod en fejl ved gemning af oplysninger';
      setSubmitError(errorMessage);
    } finally {
      setSubmitLoading(false);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center py-12">
          <p className="text-muted-foreground">{dict.profile.loading}</p>
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
              {dict.profile.goToLogin} <a href={`/${lang}/login`} className="text-blue-600 hover:underline">{dict.navigation.login}</a>.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Helper function to mask CPR (Privacy Mode: show first 6 digits, mask last 4)
  const maskCPR = (cpr: string) => {
    if (!cpr) return '******-****';
    // Remove any existing dashes for processing
    const cleanCPR = cpr.replace(/-/g, '');
    if (cleanCPR.length < 10) return '******-****';
    // Get first 6 digits (birth date)
    const first6 = cleanCPR.slice(0, 6);
    // Mask last 4 digits
    return `${first6}-****`;
  };

  // Check if profile is complete (has required fields)
  const isProfileComplete = formData.first_name && formData.last_name && formData.phone_number && 
                            (formData.cpr_number || workerDetails?.cpr_number);

  // Determine whether the viewer is the profile owner. If we hit a load error (likely RLS),
  // treat as non-owner to avoid exposing sensitive UI.
  const viewedProfileId = (workerDetails as Record<string, unknown> | null)?.id as string | undefined;
  const isOwner = !!user && !workerLoadError && (viewedProfileId ? user.id === viewedProfileId : true);

  // Public (non-owner) view: hide sensitive sections (CPR, bank) and show only public info.
  if (!isOwner) {
    const displayName = [
      (workerDetails as Record<string, unknown> | null)?.first_name as string | undefined,
      (workerDetails as Record<string, unknown> | null)?.last_name as string | undefined,
    ].filter(Boolean).join(' ') || dict.profile.preview.worker;
    const avatarUrl = (workerDetails as Record<string, unknown> | null)?.avatar_url as string | undefined;
    const description = (workerDetails as Record<string, unknown> | null)?.description as string | undefined;
    const experience = (workerDetails as Record<string, unknown> | null)?.experience as string | undefined;

    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{dict.profile.title}</h1>
          <p className="text-muted-foreground">
            {dict.profile.subtitle}
          </p>
        </div>

        <Card className="shadow-lg">
          <CardContent className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <div className="flex-shrink-0">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-32 h-32 rounded-full object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gray-200 border-2 border-gray-200 flex items-center justify-center">
                    <User className="w-12 h-12 text-gray-400" />
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold text-gray-900">{displayName}</h2>
                  {profile?.verification_status === 'verified' && (
                    <Badge className="bg-green-600 hover:bg-green-700 gap-1 text-white">
                      <CheckCircle2 className="h-3 w-3" />
                      <span className="text-xs">{dict.Verification?.status_verified || 'Account Verified'}</span>
                    </Badge>
                  )}
                  {profile?.verification_status === 'pending' && (
                    <Badge variant="outline" className="text-orange-600 border-orange-600 gap-1">
                      <Clock className="h-3 w-3" />
                      <span className="text-xs">{dict.Verification?.status_pending || 'Verification Pending'}</span>
                    </Badge>
                  )}
                </div>

                {description && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800">{dict.profile.description}</h3>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{description}</p>
                  </div>
                )}

                {experience && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800">{dict.profile.experience}</h3>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{experience}</p>
                  </div>
                )}

                {!description && !experience && (
                  <p className="text-sm text-muted-foreground">
                    {dict.profile.preview.fillFormToActivate}
                  </p>
                )}
              </div>
            </div>

            <Card className="bg-muted">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">
                  Bank, tax and CPR details are hidden for privacy.
                </p>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">{dict.profile.title}</h1>
            <p className="text-muted-foreground">
              {dict.profile.subtitle}
            </p>
          </div>
          {/* Verification Action Button (only for actionable states) */}
          {user && profile && (!profile.verification_status || profile.verification_status === 'unverified' || profile.verification_status === 'rejected') && (
            <div className="flex flex-col gap-2 items-end">
                  {profile.verification_status === 'rejected' && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {dict.Verification?.status_rejected || 'Verification Rejected'}. {dict.Verification?.pending_tooltip || 'Please check the quality of your photos and try again.'}
                    </p>
                  )}
                  <Button onClick={() => setShowVerificationWizard(true)} variant="outline">
                    {profile.verification_status === 'rejected' ? dict.Verification?.try_again_btn || 'Try Again' : dict.Verification?.start_btn || 'Start Verification'}
                  </Button>
            </div>
          )}
        </div>
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
                  <div className="mb-6">
                    <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Staffer
                    </h3>
                    <p className="text-xs text-gray-500">{dict.profile.preview.workerIdCard}</p>
                  </div>

                  {/* Avatar */}
                  <div className="flex justify-center mb-6">
                    {avatarPreview && !avatarError ? (
                      <img
                        src={avatarPreview}
                        alt="Profile"
                        className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                        onError={() => {
                          setAvatarError(true);
                        }}
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-gray-200 border-4 border-white shadow-lg flex items-center justify-center">
                        <User className="w-16 h-16 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <div className="text-center mb-4">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <h2 className="text-2xl font-bold text-gray-900">
                        {formData.first_name && formData.last_name
                          ? `${formData.first_name} ${formData.last_name}`
                          : formData.first_name
                          ? formData.first_name
                          : formData.last_name
                          ? formData.last_name
                          : `${dict.profile.firstName} ${dict.profile.lastName}`}
                      </h2>
                      {/* Verification Status Badge */}
                      {profile?.verification_status === 'verified' && (
                        <Badge className="bg-green-600 hover:bg-green-700 gap-1 text-white">
                          <CheckCircle2 className="h-3 w-3" />
                          <span className="text-xs">{dict.Verification?.status_verified || 'Account Verified'}</span>
                        </Badge>
                      )}
                      {profile?.verification_status === 'pending' && (
                        <Badge variant="outline" className="text-orange-600 border-orange-600 gap-1">
                          <Clock className="h-3 w-3" />
                          <span className="text-xs">{dict.Verification?.status_pending || 'Verification Pending'}</span>
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{dict.profile.preview.worker}</p>
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
                        {dict.profile.phoneNumber}
                      </p>
                      <p className="text-sm font-semibold text-gray-900">
                        {formData.phone_number || `${dict.profile.phoneNumber}...`}
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
                        ? dict.profile.preview.profileComplete
                        : dict.profile.preview.fillFormToActivate}
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
              <CardTitle>{dict.profile.workDetails}</CardTitle>
            <CardDescription>
                {dict.profile.workDetailsDescription}
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
                    {dict.profile.profileUpdated}
                  </div>
                )}

                {/* Personal Information Section */}
                <div className="space-y-4">
                  <div className="border-b pb-2">
                    <h3 className="text-lg font-semibold">{dict.profile.personalInfo}</h3>
                    <p className="text-sm text-muted-foreground">{dict.profile.personalInfoDescription}</p>
                  </div>
              
              {/* Avatar Upload */}
              <div className="space-y-2">
                <Label>{dict.profile.avatar} *</Label>
                <div className="flex items-center gap-4">
                  {avatarPreview && (
                    <div className="relative">
                      <img
                        src={avatarPreview}
                        alt="Avatar preview"
                        className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                        onError={() => {
                          // Clear preview on error
                          setAvatarPreview('');
                          setAvatarFile(null);
                          setAvatarError(true);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setAvatarPreview('');
                          setAvatarFile(null);
                          setAvatarError(false);
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
                      {avatarFile ? avatarFile.name : dict.profile.selectAvatar}
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {dict.profile.avatarHint}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="first_name">{dict.profile.firstName} *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name || ''}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    required
                    placeholder={dict.profile.firstNamePlaceholder}
                    disabled={submitLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">{dict.profile.lastName} *</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name || ''}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    required
                    placeholder={dict.profile.lastNamePlaceholder}
                    disabled={submitLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone_number">{dict.profile.phoneNumber} *</Label>
                <Input
                  id="phone_number"
                  type="tel"
                  value={formData.phone_number || ''}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  required
                  placeholder={dict.profile.phoneNumberPlaceholder}
                  disabled={submitLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cpr_number">
                  {dict.profile.cprNumber} {!workerDetails?.cpr_number && '*'}
                </Label>
                <Input
                  id="cpr_number"
                  type="text"
                  placeholder={workerDetails?.cpr_number ? dict.profile.cprNumberUpdate : dict.profile.cprNumberPlaceholder}
                  value={formData.cpr_number || ''}
                  onChange={(e) => {
                    // Remove any non-digit characters immediately
                    const value = e.target.value.replace(/\D/g, '');
                    // Only update state if length is <= 10
                    if (value.length <= 10) {
                      setFormData({ ...formData, cpr_number: value });
                    }
                  }}
                  required={!workerDetails?.cpr_number}
                  maxLength={10}
                  disabled={submitLoading}
                />
                <p className="text-xs text-muted-foreground">
                  {workerDetails?.cpr_number 
                    ? dict.profile.cprNumberHint
                    : dict.profile.cprNumberRequired}
                </p>
              </div>
            </div>

                {/* Bio and Experience Section */}
                <div className="space-y-4">
                  <div className="border-b pb-2">
                    <h3 className="text-lg font-semibold">{dict.profile.bioAndExperience}</h3>
                    <p className="text-sm text-muted-foreground">{dict.profile.bioAndExperienceDescription}</p>
                  </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">{dict.profile.description} *</Label>
                <textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={dict.profile.descriptionPlaceholder}
                  rows={4}
                  required
                  disabled={submitLoading}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="experience">{dict.profile.experience} *</Label>
                <textarea
                  id="experience"
                  value={formData.experience || ''}
                  onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                  placeholder={dict.profile.experiencePlaceholder}
                  rows={6}
                  required
                  disabled={submitLoading}
                  className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>

                {/* Additional Information Section */}
                <div className="space-y-4">
                  <div className="border-b pb-2">
                    <h3 className="text-lg font-semibold">{dict.profile.additionalInfo}</h3>
                    <p className="text-sm text-muted-foreground">{dict.profile.additionalInfoDescription}</p>
                  </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="shirt_size">{dict.profile.shirtSize}</Label>
                  <Input
                    id="shirt_size"
                    value={formData.shirt_size || ''}
                    onChange={(e) => setFormData({ ...formData, shirt_size: e.target.value })}
                    placeholder={dict.profile.shirtSizePlaceholder}
                    disabled={submitLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shoe_size">{dict.profile.shoeSize}</Label>
                  <Input
                    id="shoe_size"
                    value={formData.shoe_size || ''}
                    onChange={(e) => setFormData({ ...formData, shoe_size: e.target.value })}
                    placeholder={dict.profile.shoeSizePlaceholder}
                    disabled={submitLoading}
                  />
                </div>
              </div>
            </div>

                {/* Skills Section */}
                <div className="space-y-4">
                  <div className="border-b pb-2">
                    <h3 className="text-lg font-semibold">Skills & Qualifications</h3>
                    <p className="text-sm text-muted-foreground">Select your languages and licenses</p>
                  </div>
              
              {skillsLoading ? (
                <div className="py-4 text-center text-muted-foreground">
                  <p>Loading skills...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Languages */}
                  {availableSkills.filter(s => s.category === 'language').length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Languages</Label>
                      <div className="grid gap-3 md:grid-cols-2">
                        {availableSkills
                          .filter((skill) => skill.category === 'language')
                          .map((skill) => (
                            <label
                              key={skill.id}
                              className="flex items-center space-x-2 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selectedSkillIds.includes(skill.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedSkillIds([...selectedSkillIds, skill.id]);
                                  } else {
                                    setSelectedSkillIds(selectedSkillIds.filter((id) => id !== skill.id));
                                  }
                                }}
                                disabled={submitLoading}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                              />
                              <span className="text-sm">{skill.name}</span>
                            </label>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Licenses - HIDDEN FOR NOW (business decision) */}
                  {false && availableSkills.filter(s => s.category === 'license').length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Licenses</Label>
                      <div className="grid gap-3 md:grid-cols-2">
                        {availableSkills
                          .filter((skill) => skill.category === 'license')
                          .map((skill) => (
                            <label
                              key={skill.id}
                              className="flex items-center space-x-2 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selectedSkillIds.includes(skill.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedSkillIds([...selectedSkillIds, skill.id]);
                                  } else {
                                    setSelectedSkillIds(selectedSkillIds.filter((id) => id !== skill.id));
                                  }
                                }}
                                disabled={submitLoading}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                              />
                              <span className="text-sm">{skill.name}</span>
                            </label>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

                <div className="flex justify-end pt-6 border-t">
                  <Button 
                    type="submit" 
                    disabled={submitLoading || uploadingAvatar || uploadingIdCard || !user} 
                    size="lg"
                    className="min-w-[200px]"
                  >
                    {submitLoading || uploadingAvatar || uploadingIdCard 
                      ? dict.profile.saving
                      : dict.profile.saveChanges}
            </Button>
                </div>
              </form>
          </CardContent>
        </Card>
        </div>
      </div>

      {/* Reviews & Feedback Section */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Reviews & Feedback</CardTitle>
            <CardDescription>
              Feedback from companies you've worked with
            </CardDescription>
          </CardHeader>
          <CardContent>
            {reviewsLoading ? (
              <div className="py-12 text-center text-muted-foreground">
                Loading reviews...
              </div>
            ) : reviews.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <p>No reviews yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => {
                  const companyName = review.reviewer?.company_details?.company_name || 'Company';
                  const companyLogo = review.reviewer?.company_details?.logo_url || null;
                  const companyInitials = companyName
                    .split(' ')
                    .map((word: string) => word.charAt(0))
                    .join('')
                    .toUpperCase()
                    .slice(0, 2) || 'CO';

                  return (
                    <div
                      key={review.id}
                      className="rounded-lg border bg-card p-4 space-y-3"
                    >
                      {/* Header: Reviewer Name (Company) + Date */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage
                              src={companyLogo || undefined}
                              alt={companyName}
                            />
                            <AvatarFallback className="text-xs">
                              {companyInitials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-sm">
                              {companyName}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDateTime(review.created_at)}
                        </div>
                      </div>

                      {/* Rating: Star component */}
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={cn(
                              'h-4 w-4',
                              star <= review.rating
                                ? 'fill-yellow-400 stroke-yellow-400'
                                : 'fill-muted stroke-muted'
                            )}
                          />
                        ))}
                        <span className="text-xs text-muted-foreground ml-1">
                          {review.rating}/5
                        </span>
                      </div>

                      {/* Body: The comment text */}
                      {review.comment && (
                        <div>
                          <p className="text-sm text-foreground whitespace-pre-wrap">
                            {review.comment}
                          </p>
                        </div>
                      )}

                      {/* Tags: Render tags as badges if they exist */}
                      {review.tags && review.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {review.tags.map((tag: string, index: number) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Image Cropper Modal */}
      <ImageCropperModal
        imageSrc={selectedImageSrc}
        isOpen={isCropperOpen}
        onClose={handleCropperClose}
        onCropComplete={handleCropSave}
      />
      
      {/* Verification Wizard */}
      {user && (
        <VerificationWizard
          open={showVerificationWizard}
          onOpenChange={(open) => {
            setShowVerificationWizard(open);
            // Refresh profile data when wizard closes to update verification status
            if (!open && user) {
              fetchProfileData(user.id);
            }
          }}
          userId={user.id}
          lang={lang}
          dict={dict}
        />
      )}
    </div>
  );
}

