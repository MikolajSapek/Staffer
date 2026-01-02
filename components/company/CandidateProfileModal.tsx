'use client';

import { useState } from 'react';
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
import { Loader2, Mail, Phone, User, Briefcase } from 'lucide-react';
import { formatDateTime } from '@/lib/date-utils';

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
  // worker_details is returned as an object
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
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<'accept' | 'reject' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const profile = application.profiles;
  const shift = application.shifts;

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
        setActionLoading(null);
        return;
      }

      // Success - refresh the page to get updated data
      router.refresh();
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: unknown) {
      setError(dict.error);
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                <div className="mt-2">
                  {getStatusBadge(application.status)}
                </div>
              </div>
              <div className="space-y-2">
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


          {/* Application Message */}
          {application.worker_message && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">
                {dict.applicationMessage}
              </div>
              <div className="rounded-md border bg-muted/50 p-4">
                <p className="text-sm whitespace-pre-wrap">{application.worker_message}</p>
              </div>
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

