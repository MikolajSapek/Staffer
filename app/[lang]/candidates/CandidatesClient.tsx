'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Star } from 'lucide-react';
import CandidateProfileModal from '@/components/company/CandidateProfileModal';
import { formatDateTime, formatDateShort, formatTime } from '@/lib/date-utils';

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
  start_time: string;
  end_time: string;
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

interface CandidatesClientProps {
  applications: Application[];
  dict: {
    candidatesPage: {
      status: {
        accepted: string;
        pending: string;
        rejected: string;
        waitlist: string;
      };
      table: {
        candidate: string;
        rating: string;
        status: string;
        actions: string;
      };
      actions: {
        viewProfile: string;
      };
      modal: {
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
    };
  };
  lang: string;
}

export default function CandidatesClient({
  applications,
  dict,
  lang,
}: CandidatesClientProps) {
  const router = useRouter();
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Debug: Log data structure to understand Supabase response format
  if (applications && applications.length > 0) {
    console.log('Candidates Data Check:', applications[0]);
    console.log('Worker Details Check:', applications[0]?.profiles?.worker_details);
    console.log('Worker Details Type:', Array.isArray(applications[0]?.profiles?.worker_details) ? 'Array' : typeof applications[0]?.profiles?.worker_details);
  }

  // Helper function to extract worker_details (as object)
  const getWorkerDetails = (profile: Profile | null): WorkerDetails | null => {
    if (!profile?.worker_details) return null;
    // worker_details is returned as an object, not an array
    return profile.worker_details as WorkerDetails;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      accepted: 'default',
      pending: 'secondary',
      rejected: 'destructive',
      waitlist: 'outline',
    };
    const statusLabels: Record<string, string> = {
      accepted: dict.candidatesPage.status.accepted,
      pending: dict.candidatesPage.status.pending,
      rejected: dict.candidatesPage.status.rejected,
      waitlist: dict.candidatesPage.status.waitlist,
    };
    return (
      <Badge variant={variants[status] || 'secondary'}>
        {statusLabels[status] || status}
      </Badge>
    );
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const handleRowClick = (application: Application) => {
    setSelectedApplication(application);
    setModalOpen(true);
  };

  const handleModalSuccess = () => {
    router.refresh();
  };

  const handleModalClose = (open: boolean) => {
    setModalOpen(open);
    // Reset selected application when modal is closed
    if (!open) {
      setSelectedApplication(null);
    }
  };

  // Group applications by shift_id
  const groupedByShift = applications.reduce((acc, app) => {
    const shiftId = app.shift_id;
    const shift = app.shifts;
    
    if (!shift) return acc;
    
    if (!acc[shiftId]) {
      acc[shiftId] = {
        shiftTitle: shift.title,
        shiftId: shiftId,
        applications: [],
      };
    }
    
    acc[shiftId].applications.push(app);
    return acc;
  }, {} as Record<string, { shiftTitle: string; shiftId: string; applications: Application[] }>);

  const shiftGroups = Object.values(groupedByShift);

  return (
    <>
      <div className="space-y-8">
        {shiftGroups.map((group) => {
          // Get shift details from first application in group
          const firstApp = group.applications[0];
          const shift = firstApp?.shifts;
          const shiftDate = shift?.start_time ? formatDateShort(shift.start_time) : '';
          const shiftTime = shift?.start_time && shift?.end_time 
            ? `${formatTime(shift.start_time)} - ${formatTime(shift.end_time)}`
            : '';
          
          return (
          <div key={group.shiftId}>
            <div className="mb-4">
              <h3 className="text-xl font-bold">{group.shiftTitle}</h3>
              {shiftDate && (
                <div className="text-sm text-muted-foreground mt-1">
                  {shiftDate} {shiftTime && `• ${shiftTime}`}
                </div>
              )}
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{dict.candidatesPage.table.candidate}</TableHead>
                    <TableHead>{dict.candidatesPage.table.rating}</TableHead>
                    <TableHead>{dict.candidatesPage.table.status}</TableHead>
                    <TableHead>{dict.candidatesPage.table.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.applications.map((app) => {
                    const profile = app.profiles;
                    const workerDetails = getWorkerDetails(profile);

                    if (!profile) return null;

                    // Extract name from profiles table, avatar and phone from worker_details
                    const firstName = profile.first_name || '';
                    const lastName = profile.last_name || '';
                    const fullName = `${firstName} ${lastName}`.trim() || profile.email || 'Unknown';
                    const phoneNumber = workerDetails?.phone_number || '';
                    const initials = firstName && lastName 
                      ? getInitials(firstName, lastName)
                      : profile.email?.charAt(0).toUpperCase() || '??';
                    const avatarUrl = workerDetails?.avatar_url || null;

                    return (
                      <TableRow
                        key={app.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleRowClick(app)}
                      >
                        <TableCell className="py-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={avatarUrl || undefined} alt={fullName} />
                              <AvatarFallback>{initials}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-semibold text-foreground">{fullName}</div>
                              <div className="text-sm text-muted-foreground">
                                {profile.email || ''}
                              </div>
                              {phoneNumber && (
                                <div className="text-sm text-muted-foreground">
                                  {phoneNumber}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className="h-4 w-4 fill-muted stroke-muted"
                              />
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="py-4">{getStatusBadge(app.status)}</TableCell>
                        <TableCell className="py-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRowClick(app);
                            }}
                          >
                            {dict.candidatesPage.actions.viewProfile}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
          );
        })}
      </div>

      {selectedApplication && (
        <CandidateProfileModal
          open={modalOpen}
          onOpenChange={handleModalClose}
          application={selectedApplication}
          dict={dict.candidatesPage.modal}
          lang={lang}
          onSuccess={handleModalSuccess}
        />
      )}
    </>
  );
}

