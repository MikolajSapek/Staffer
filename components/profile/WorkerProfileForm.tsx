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
  const [documents, setDocuments] = useState<Array<Record<string, unknown>>>([]);

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

  // Fetch profile data (verification_status) for refresh after verification wizard
  const fetchProfileData = async (userId: string) => {
    const supabase = createClient();
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('verification_status')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      console.error('DEBUG [profiles]:', { error: profileError, data: profileData, userId });
    }
    if (!profileError && profileData) {
      setProfile(profileData);
    }
  };

  // Single RPC fetch: get_worker_full_profile replaces 7–8 separate queries
  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = createClient();

        const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();

        if (userError) {
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

        if (authUser.id == null || authUser.id === undefined) {
          console.error('RPC skipped: user.id is undefined');
          setWorkerDetails(null);
          setSkillsLoading(false);
          setIsLoading(false);
          setReviewsLoading(false);
          return;
        }

        const { data, error: rpcError } = await supabase.rpc('get_worker_full_profile', {
          p_worker_id: authUser.id,
        });

        setSkillsLoading(false);

        if (rpcError) {
          console.error('DEBUG [get_worker_full_profile RPC]:', {
            error: rpcError,
            code: rpcError.code,
            message: rpcError.message,
            hint: rpcError.hint,
            details: rpcError.details,
            data,
            userId: authUser?.id,
          });
          if (rpcError.code === 'P0001' || rpcError.message?.includes('not found')) {
            setWorkerDetails(null);
            setWorkerLoadError(false);
          } else {
            setWorkerDetails(null);
            setWorkerLoadError(true);
          }
          setFetchError(null);
          setIsLoading(false);
          setReviewsLoading(false);
          return;
        }

        // RPC może zwrócić tablicę (SETOF) lub pojedynczy obiekt – rozpakuj
        let rpcData: Record<string, unknown>;
        if (Array.isArray(data) && data.length > 0) {
          rpcData = data[0] as Record<string, unknown>;
        } else if (data && typeof data === 'object' && !Array.isArray(data)) {
          rpcData = data as Record<string, unknown>;
        } else {
          setWorkerDetails(null);
          setProfile(null);
          setAvailableSkills([]);
          setSelectedSkillIds([]);
          setReviews([]);
          setDocuments([]);
          setIsLoading(false);
          setReviewsLoading(false);
          return;
        }

        // Profile (verification_status) – form renders whenever profile exists, even if worker_data is empty
        if (rpcData.profile && typeof rpcData.profile === 'object') {
          const profileObj = rpcData.profile as Record<string, unknown>;
          setProfile({
            verification_status: profileObj.verification_status as 'unverified' | 'pending' | 'verified' | 'rejected' | undefined,
          });
        } else {
          setProfile(null);
        }

        // Worker details: setWorkerDetails(data.worker_data); null = new account (do not break – set defaults)
        const workerData = rpcData.worker_data as Record<string, unknown> | null | undefined;
        setWorkerDetails(workerData && typeof workerData === 'object' ? workerData : null);
        setWorkerLoadError(false);

        if (workerData && typeof workerData === 'object') {
          setFormData({
            first_name: (workerData.first_name as string) || '',
            last_name: (workerData.last_name as string) || '',
            phone_number: (workerData.phone_number as string) || '',
            shirt_size: (workerData.shirt_size as string) || '',
            shoe_size: (workerData.shoe_size as string) || '',
            description: (workerData.description as string) || '',
            experience: (workerData.experience as string) || '',
            cpr_number: (workerData.cpr_number as string) || '',
          });
          setAvatarPreview((workerData.avatar_url as string) || '');
        } else {
          // New account: worker_data is null – default values so worker can fill in for the first time
          setFormData({
            first_name: '',
            last_name: '',
            phone_number: '',
            shirt_size: '',
            shoe_size: '',
            description: '',
            experience: '',
            cpr_number: '',
          });
          setAvatarPreview('');
        }

        // Skills (all available) – set even when partial
        const skillsArr = rpcData.skills;
        if (skillsArr && Array.isArray(skillsArr)) {
          setAvailableSkills(skillsArr as Array<{ id: string; name: string; category: 'language' | 'license' }>);
        } else {
          setAvailableSkills([]);
        }

        // Worker's selected skill IDs
        setSelectedSkillIds((rpcData.worker_skill_ids as string[] | null | undefined) || []);

        // Reviews (RPC zwraca company_name, company_logo w każdym elemencie tablicy)
        const reviewsArr = rpcData.reviews;
        if (reviewsArr && Array.isArray(reviewsArr)) {
          const mapped = reviewsArr.map((r: Record<string, unknown>) => {
            const reviewer = r.reviewer as Record<string, unknown> | undefined;
            const companyDetails = reviewer?.company_details as Record<string, unknown> | undefined;
            const companyName = (r.company_name as string) ?? companyDetails?.company_name ?? 'Anonymous Company';
            const companyLogo = (r.company_logo as string | null) ?? companyDetails?.logo_url ?? null;
            return {
              ...r,
              company_name: companyName,
              company_logo: companyLogo,
              reviewer: {
                company_details: {
                  company_name: companyName,
                  logo_url: companyLogo,
                },
              },
            };
          });
          setReviews(mapped);
        } else {
          setReviews([]);
        }

        // Documents
        const docsArr = rpcData.documents;
        if (docsArr && Array.isArray(docsArr)) {
          setDocuments(docsArr as Array<Record<string, unknown>>);
        } else {
          setDocuments([]);
        }

        setFetchError(null);
        console.log('Profile loaded successfully');
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
            // Register document in documents table for RLS (worker_id = owner)
            const fileExt = idCardFile.name.split('.').pop() || 'jpg';
            const filePath = `documents/${user.id}/id-card.${fileExt}`;
            const { error: docError } = await supabase
              .from('documents')
              .insert({
                worker_id: user.id,
                type: 'id_card_front',
                file_path: filePath,
                verification_status: 'pending',
              });
            if (docError) {
              console.error('DEBUG [documents INSERT]:', {
                error: docError,
                code: docError.code,
                userId: user?.id,
              });
              // Don't block save - file was uploaded to storage
            }
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
        console.error('DEBUG [worker_details UPDATE]:', {
          error: updateError,
          code: updateError.code,
          userId: user?.id,
        });
        setSubmitError(updateError.message || 'Kunne ikke gemme oplysninger');
        setSubmitLoading(false);
        return;
      }

      // SYNC PATTERN for worker_skills (RLS: worker_id = auth.uid(); authenticated role only)
      // 1. Delete all existing skills for this worker
      const { error: deleteError } = await supabase
        .from('worker_skills')
        .delete()
        .eq('worker_id', user.id);

      if (deleteError) {
        const isPermissionError = deleteError.code === '42501' || deleteError.message?.toLowerCase().includes('policy') || deleteError.message?.toLowerCase().includes('permission') || deleteError.message?.toLowerCase().includes('row-level');
        console.error('DEBUG [worker_skills DELETE]:', {
          error: deleteError,
          code: deleteError.code,
          userId: user?.id,
        });
        setSubmitError(isPermissionError
          ? (dict.profile?.skillsPermissionError ?? 'Could not update skills (permission denied). Ensure RLS allows DELETE where worker_id = auth.uid().')
          : (deleteError.message || 'Could not update skills'));
        setSubmitLoading(false);
        return;
      }

      // 2. Insert the newly selected skills (only if any are selected)
      if (selectedSkillIds.length > 0) {
        const skillsToInsert = selectedSkillIds.map((skillId) => ({
          worker_id: user.id,
          skill_id: skillId,
          verified: false,
        }));

        const { error: insertError } = await supabase
          .from('worker_skills')
          .insert(skillsToInsert);

        if (insertError) {
          const isPermissionError = insertError.code === '42501' || insertError.message?.toLowerCase().includes('policy') || insertError.message?.toLowerCase().includes('permission') || insertError.message?.toLowerCase().includes('row-level');
          console.error('DEBUG [worker_skills INSERT]:', {
            error: insertError,
            code: insertError.code,
            userId: user?.id,
          });
          setSubmitError(isPermissionError
            ? (dict.profile?.skillsPermissionError ?? 'Could not save skills (permission denied). Ensure RLS allows INSERT with worker_id = auth.uid().')
            : (insertError.message || 'Could not save skills'));
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

      // Refresh data after successful save - single RPC get_worker_full_profile
      setTimeout(async () => {
        if (user?.id == null || user.id === undefined) {
          return;
        }
        const supabaseRefresh = createClient();
        const { data, error } = await supabaseRefresh.rpc('get_worker_full_profile', {
          p_worker_id: user.id,
        });

        if (error) {
          console.error('DEBUG [get_worker_full_profile RPC refresh]:', {
            error,
            data,
            userId: user?.id,
          });
          return;
        }

        // RPC może zwrócić tablicę lub obiekt – rozpakuj
        const payload = Array.isArray(data) && data.length > 0
          ? (data[0] as Record<string, unknown>)
          : (data && typeof data === 'object' && !Array.isArray(data) ? data as Record<string, unknown> : null);

        if (payload) {
          setWorkerDetails((payload.worker_data as Record<string, unknown> | null | undefined) ?? null);
          const workerData = payload.worker_data as Record<string, unknown> | null | undefined;
          if (workerData && typeof workerData === 'object') {
            setFormData({
              first_name: (workerData.first_name as string) || '',
              last_name: (workerData.last_name as string) || '',
              phone_number: (workerData.phone_number as string) || '',
              shirt_size: (workerData.shirt_size as string) || '',
              shoe_size: (workerData.shoe_size as string) || '',
              description: (workerData.description as string) || '',
              experience: (workerData.experience as string) || '',
              cpr_number: (workerData.cpr_number as string) || '',
            });
            setAvatarPreview((workerData.avatar_url as string) || '');
            setAvatarError(false);
          } else {
            setFormData({
              first_name: '',
              last_name: '',
              phone_number: '',
              shirt_size: '',
              shoe_size: '',
              description: '',
              experience: '',
              cpr_number: '',
            });
            setAvatarPreview('');
          }
          const docsArr = payload.documents;
          if (docsArr && Array.isArray(docsArr)) {
            setDocuments(docsArr as Array<Record<string, unknown>>);
          }
        } else {
          setWorkerDetails(null);
          setDocuments([]);
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

