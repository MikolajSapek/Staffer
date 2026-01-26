'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Upload, X, User, CheckCircle2, Clock } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ImageCropperModal } from '@/components/ImageCropperModal';
import VerificationWizard from '@/components/verification/VerificationWizard';
import WorkerProfilePreview from './WorkerProfilePreview';
import PersonalInfoSection from './PersonalInfoSection';
import BioExperienceSection from './BioExperienceSection';
import AdditionalInfoSection from './AdditionalInfoSection';
import SkillsSelector from './SkillsSelector';
import ReviewsSection from './ReviewsSection';
import PublicProfileView from './PublicProfileView';

interface WorkerProfileFormProps {
  dict: {
    profile: {
      authError: string;
      notLoggedIn: string;
      goToLogin: string;
      loading: string;
      validation: {
        firstNameRequired: string;
        phoneRequired: string;
        avatarError: string;
        avatarSize: string;
      };
    };
    navigation: {
      login: string;
    };
    Verification?: {
      status_rejected?: string;
      pending_tooltip?: string;
      try_again_btn?: string;
      start_btn?: string;
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
          // Handle network/fetch errors gracefully
          if (userError.message?.includes('Failed to fetch') || userError.message?.includes('NetworkError')) {
            console.error('Supabase connection error in WorkerProfileForm:', userError.message);
            setAuthError('Connection error. Please check your internet connection and try again.');
          } else {
            setAuthError(dict.profile.authError);
          }
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


  // Check if profile is complete (has required fields)
  const isProfileComplete = formData.first_name && formData.last_name && formData.phone_number && 
                            (formData.cpr_number || workerDetails?.cpr_number);

  // Determine whether the viewer is the profile owner. If we hit a load error (likely RLS),
  // treat as non-owner to avoid exposing sensitive UI.
  const viewedProfileId = (workerDetails as Record<string, unknown> | null)?.id as string | undefined;
  const isOwner = !!user && !workerLoadError && (viewedProfileId ? user.id === viewedProfileId : true);

  // Public (non-owner) view: hide sensitive sections (CPR, bank) and show only public info.
  if (!isOwner) {
    return (
      <PublicProfileView
        workerDetails={workerDetails}
        profile={profile}
        dict={dict}
      />
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
        <WorkerProfilePreview
          formData={formData}
          workerDetails={workerDetails}
          user={user}
          avatarPreview={avatarPreview}
          avatarError={avatarError}
          profile={profile}
          isProfileComplete={isProfileComplete}
          dict={dict}
          onAvatarError={() => setAvatarError(true)}
        />

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
                <PersonalInfoSection
                  formData={formData}
                  workerDetails={workerDetails}
                  avatarPreview={avatarPreview}
                  avatarFile={avatarFile}
                  avatarInputRef={avatarInputRef}
                  submitLoading={submitLoading}
                  dict={dict}
                  onFormDataChange={(data) => setFormData({ ...formData, ...data })}
                  onAvatarChange={handleAvatarChange}
                  onAvatarRemove={() => {
                    setAvatarPreview('');
                    setAvatarFile(null);
                    setAvatarError(false);
                    if (avatarInputRef.current) avatarInputRef.current.value = '';
                  }}
                />

                {/* Bio and Experience Section */}
                <BioExperienceSection
                  formData={formData}
                  submitLoading={submitLoading}
                  dict={dict}
                  onFormDataChange={(data) => setFormData({ ...formData, ...data })}
                />

                {/* Additional Information Section */}
                <AdditionalInfoSection
                  formData={formData}
                  submitLoading={submitLoading}
                  dict={dict}
                  onFormDataChange={(data) => setFormData({ ...formData, ...data })}
                />

                {/* Skills Section */}
                <SkillsSelector
                  availableSkills={availableSkills}
                  selectedSkillIds={selectedSkillIds}
                  skillsLoading={skillsLoading}
                  submitLoading={submitLoading}
                  onSkillToggle={(skillId) => {
                    if (selectedSkillIds.includes(skillId)) {
                      setSelectedSkillIds(selectedSkillIds.filter((id) => id !== skillId));
                    } else {
                      setSelectedSkillIds([...selectedSkillIds, skillId]);
                    }
                  }}
                />

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
      <ReviewsSection reviews={reviews} reviewsLoading={reviewsLoading} />

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

