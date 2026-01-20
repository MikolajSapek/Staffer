'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { updateApplicationStatus } from '@/app/actions/applications';
import { Loader2, Mail, Phone, User, Briefcase, Star, Lock } from 'lucide-react';
import { formatDateTime } from '@/lib/date-utils';
import { createClient } from '@/utils/supabase/client';

interface WorkerDetails {
  avatar_url: string | null;
  phone_number: string;
  experience: string | null;
  description: string | null;
}

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  average_rating: number | null;
  total_reviews: number;
  worker_details: WorkerDetails | null;
}

interface Shift {
  id: string;
  title: string;
}

interface Application {
  id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'waitlist';
  applied_at: string;
  worker_message: string | null;
  shift_id: string;
  worker_id: string;
  profiles: Profile | null;
  shifts: Shift | null;
}

interface CandidateProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: Application;
  dict: {
    title: string;
    about: string;
    aboutPlaceholder?: string;
    contact: string;
    applicationMessage: string;
    appliedFor: string;
    appliedAt: string;
    status: string;
    accept: string;
    reject: string;
    accepting: string;
    rejecting: string;
    acceptSuccess: string;
    rejectSuccess: string;
    error: string;
    close?: string;
    languages?: string;
    licenses?: string;
    noQualifications?: string;
  };
  lang: string;
  onSuccess?: () => void;
}

export default function CandidateProfileModal({
  open,
  onOpenChange,
  application,
  dict,
  lang,
  onSuccess,
}: CandidateProfileModalProps) {
  const router = useRouter();
  const [actionLoading, setActionLoading] = useState<'accept' | 'reject' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [workerSkills, setWorkerSkills] = useState<{
    languages: Array<{ id: string; name: string }>;
    licenses: Array<{ id: string; name: string }>;
  }>({ languages: [], licenses: [] });

  const profile = application.profiles;
  const shift = application.shifts;

  // Fetch worker skills from candidate_skills_view when modal opens
  useEffect(() => {
    if (!open || !application.worker_id) {
      return;
    }

    setSkillsLoading(true);
    const supabase = createClient();
    
    // Type assertion for candidate_skills_view
    type CandidateSkills = {
      worker_id: string;
      languages: Array<{ id: string; name: string }>;
      licenses: Array<{ id: string; name: string }>;
    };
    
    supabase
      .from('candidate_skills_view')
      .select('*')
      .eq('worker_id', application.worker_id)
      .limit(1)
      .maybeSingle()
      .then(({ data, error }: { data: CandidateSkills | null; error: any }) => {
        if (error) {
          console.error('Error fetching candidate skills:', error);
          setWorkerSkills({ languages: [], licenses: [] });
          setSkillsLoading(false);
          return;
        }
        
        if (!data) {
          // Worker has no skills entry yet - this is normal
          setWorkerSkills({ languages: [], licenses: [] });
          setSkillsLoading(false);
          return;
        }
        
        // Data comes directly as arrays of { id: string; name: string }
        // No need for parsing or JSON.parse() - Supabase client handles JSONB automatically
        setWorkerSkills({
          languages: data.languages || [],
          licenses: data.licenses || []
        });
        
        setSkillsLoading(false);
      })
      .catch(() => {
        setWorkerSkills({ languages: [], licenses: [] });
        setSkillsLoading(false);
      });
  }, [open, application.worker_id]);

  if (!profile || !shift) {
    return null;
  }

  // Helper function to extract worker_details (as object)
  const getWorkerDetails = (prof: typeof profile): WorkerDetails | null => {
    if (!prof?.worker_details) return null;
    // worker_details is returned as an object, not an array
    return prof.worker_details as WorkerDetails;
  };

  const workerDetails = getWorkerDetails(profile);

  // Extract name from profiles table, avatar and phone from worker_details
  const firstName = profile.first_name || '';
  const lastName = profile.last_name || '';
  const fullName = `${firstName} ${lastName}`.trim() || profile.email || 'Unknown';
  const initials = firstName && lastName
    ? `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
    : profile.email?.charAt(0).toUpperCase() || '??';
  const avatarUrl = workerDetails?.avatar_url || null;
  const phoneNumber = workerDetails?.phone_number || '';
  const description = workerDetails?.description || null;
  const experience = workerDetails?.experience || null;

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      accepted: 'default',
      pending: 'secondary',
      rejected: 'destructive',
      waitlist: 'outline',
    };
    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const handleAction = async (action: 'accept' | 'reject') => {
    setActionLoading(action);
    setError(null);

    try {
      const result = await updateApplicationStatus(
        application.id,
        action === 'accept' ? 'approved' : 'rejected',
        lang
      );

      if (result.error) {
        setError(result.error);
        return;
      }

      // Success - close modal first and reset state BEFORE refresh
      // This ensures UI is responsive immediately
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
      
      // Refresh the page to get updated data (this happens after modal closes)
      router.refresh();
    } catch (err: unknown) {
      setError(dict.error);
    } finally {
      // ALWAYS reset loading state, even if there's an error
      setActionLoading(null);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!actionLoading) {
      onOpenChange(newOpen);
      if (!newOpen) {
        setError(null);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" suppressHydrationWarning>
        <DialogHeader>
          {/* Hero Section with Large Avatar */}
          <div className="flex flex-row gap-6 pb-6 border-b">
            <Avatar className="h-32 w-32 flex-shrink-0">
              <AvatarImage src={avatarUrl || undefined} alt={fullName} />
              <AvatarFallback className="text-4xl">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 flex flex-col justify-center gap-3">
              <div>
                <DialogTitle className="text-3xl font-bold mb-2">{fullName}</DialogTitle>
                <DialogDescription className="sr-only">
                  Worker details and contact information for {fullName}
                </DialogDescription>
                <div className="mt-2 flex items-center gap-3">
                  {getStatusBadge(application.status)}
                  {profile.average_rating !== null && profile.total_reviews > 0 ? (() => {
                    const rating = profile.average_rating!;
                    const roundedRating = Math.round(rating);
                    return (
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${
                              star <= roundedRating
                                ? 'fill-yellow-400 stroke-yellow-400'
                                : 'fill-muted stroke-muted'
                            }`}
                          />
                        ))}
                        <span className="text-sm text-muted-foreground ml-1">
                          {rating.toFixed(1)} ({profile.total_reviews})
                        </span>
                      </div>
                    );
                  })() : (
                    <span className="text-sm text-muted-foreground">No reviews yet</span>
                  )}
                </div>
              </div>
              {/* Privacy Gate: Show contact info only if accepted/completed */}
              <div className="space-y-2">
                {application.status === 'accepted' || application.status === 'completed' ? (
                  <>
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{profile.email}</span>
                    </div>
                    {phoneNumber && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{phoneNumber}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Lock className="h-4 w-4 text-muted-foreground/60" />
                      <span className="text-muted-foreground/60 italic text-sm">
                        Accept application to reveal contact details
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground/40" />
                      <span className="blur-sm select-none text-muted-foreground/40">
                        contact@hidden.com
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground/40" />
                      <span className="blur-sm select-none text-muted-foreground/40">
                        +45 •• •• •• ••
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Applied For */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Briefcase className="h-4 w-4" />
              {dict.appliedFor}
            </div>
            <div className="pl-6">
              <div className="font-medium text-foreground">{shift.title}</div>
              <div className="text-sm text-muted-foreground">
                {dict.appliedAt}: {formatDateTime(application.applied_at)}
              </div>
            </div>
          </div>

          {/* About Section */}
          {(description || experience) && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <User className="h-4 w-4" />
                {dict.about}
              </div>
              <div className="pl-6 space-y-3">
                {description && (
                  <div>
                    <p className="text-sm font-medium text-foreground mb-1">Bio</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {description}
                    </p>
                  </div>
                )}
                {experience && (
                  <div>
                    <p className="text-sm font-medium text-foreground mb-1">Experience</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {experience}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Skills & Qualifications Section */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">
              {dict.languages || 'Languages'}
            </div>
            {skillsLoading ? (
              <div className="pl-6 text-sm text-muted-foreground">
                <p>Loading qualifications...</p>
              </div>
            ) : workerSkills.languages.length === 0 && workerSkills.licenses.length === 0 ? (
              <div className="pl-6 text-sm text-muted-foreground">
                <p>{dict.noQualifications || 'No qualifications listed'}</p>
              </div>
            ) : (
              <div className="pl-6 space-y-2">
                {workerSkills.languages.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      {dict.languages || 'Languages'}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {workerSkills.languages.map((lang) => (
                        <Badge key={lang.id} variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                          {lang.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {/* Licenses - HIDDEN FOR NOW (business decision) */}
                {false && workerSkills.licenses.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      {dict.licenses || 'Licenses'}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {workerSkills.licenses.map((license) => (
                        <Badge key={license.id} variant="outline" className="bg-sky-50 text-sky-700 border-sky-200">
                          {license.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Application Message */}
          {application.worker_message && (
            <div className="space-y-2 w-full max-w-full">
              <div className="text-sm font-medium text-muted-foreground">
                {dict.applicationMessage}
              </div>
              <p className="break-all overflow-wrap-anywhere whitespace-pre-wrap w-full max-w-full bg-gray-50 p-3 rounded-lg border">
                {application.worker_message}
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={!!actionLoading}
          >
            {dict.close || 'Close'}
          </Button>
          {application.status === 'pending' && (
            <>
              <Button
                variant="destructive"
                onClick={() => handleAction('reject')}
                disabled={!!actionLoading}
              >
                {actionLoading === 'reject' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {dict.rejecting}
                  </>
                ) : (
                  dict.reject
                )}
              </Button>
              <Button
                onClick={() => handleAction('accept')}
                disabled={!!actionLoading}
              >
                {actionLoading === 'accept' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {dict.accepting}
                  </>
                ) : (
                  dict.accept
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

