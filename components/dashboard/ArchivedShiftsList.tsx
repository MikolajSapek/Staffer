'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { formatTime, formatDateShort } from '@/lib/date-utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Phone, User, UserCircle } from 'lucide-react';
import CandidateProfileModal from '@/components/company/CandidateProfileModal';

interface WorkerDetails {
  avatar_url: string | null;
  phone_number: string | null;
  experience: string | null;
  description: string | null;
}

interface Skill {
  id: string;
  name: string;
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

interface Application {
  id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'waitlist' | 'hired';
  applied_at: string;
  worker_message: string | null;
  shift_id: string;
  worker_id: string;
  profiles: Profile | null;
  shifts: {
    id: string;
    title: string;
  } | null;
  languages?: Skill[];
  licenses?: Skill[];
}

interface Shift {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  hourly_rate: number;
  vacancies_total: number;
  vacancies_taken: number;
  status: string;
  locations?: {
    name: string;
    address: string;
  } | null;
  managers?: {
    first_name: string;
    last_name: string;
    phone_number: string | null;
  } | Array<{
    first_name: string;
    last_name: string;
    phone_number: string | null;
  }> | null;
  shift_applications?: Array<{
    id: string;
    status: string;
    worker_id?: string;
    profiles?: {
      first_name: string | null;
      last_name: string | null;
      email: string;
      avatar_url: string | null;
      phone_number: string | null;
      average_rating?: number | null;
      total_reviews?: number;
      experience?: string | null;
      description?: string | null;
    } | null;
  }> | null;
}

interface ArchivedShiftsListProps {
  archivedShifts: Shift[] | null;
  lang: string;
  dict: {
    dashboard: {
      date: string;
      time: string;
      rate: string;
      booked: string;
      team?: string;
    };
    jobBoard: {
      locationNotSpecified: string;
    };
    status: {
      active: string;
      fullyBooked: string;
      completed: string;
      cancelled: string;
    };
    companyShifts: {
      archiveShifts: string;
      noArchiveShifts: string;
    };
  };
}

export default function ArchivedShiftsList({
  archivedShifts,
  lang,
  dict,
}: ArchivedShiftsListProps) {
  const router = useRouter();
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleWorkerClick = (app: any, shift: Shift, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Create Application object for modal with full worker data
    const application: Application = {
      id: app.id || `archive-${app.worker_id}-${shift.id}`,
      status: 'hired',
      applied_at: shift.end_time, // Use shift end time as fallback
      worker_message: null,
      shift_id: shift.id,
      worker_id: app.worker_id || '',
      profiles: app.profiles ? {
        id: app.worker_id || '',
        first_name: app.profiles.first_name,
        last_name: app.profiles.last_name,
        email: app.profiles.email,
        average_rating: app.profiles.average_rating ?? null,
        total_reviews: app.profiles.total_reviews ?? 0,
        worker_details: {
          avatar_url: app.profiles.avatar_url,
          phone_number: app.profiles.phone_number,
          experience: app.profiles.experience ?? null,
          description: app.profiles.description ?? null,
        }
      } : null,
      shifts: {
        id: shift.id,
        title: shift.title,
      },
      languages: app.languages || [],
      licenses: app.licenses || [],
    };
    
    setSelectedApplication(application);
    setModalOpen(true);
  };

  const handleModalClose = (open: boolean) => {
    setModalOpen(open);
    if (!open) {
      setSelectedApplication(null);
    }
  };

  const handleModalSuccess = () => {
    router.refresh();
  };
  
  const renderShiftCard = (shift: Shift) => {
    // Extract hired workers from applications
    // Filter for 'hired' or 'accepted' status
    const hiredApplications = (shift.shift_applications || []).filter(
      (app) => app.status === 'hired' || app.status === 'accepted'
    );
    
    // Helper to get manager - handle both object and array cases
    const getManager = () => {
      if (!shift.managers) return null;
      // Handle case where Supabase might return array
      const manager = Array.isArray(shift.managers) ? shift.managers[0] : shift.managers;
      return manager || null;
    };
    
    // Helper to get worker details from application
    const getWorkerDetails = (app: any) => {
      const profile = app?.profiles;
      if (!profile) {
        return {
          firstName: '',
          lastName: '',
          fullName: 'Unknown Worker',
          avatarUrl: null,
          phoneNumber: null,
        };
      }
      
      const firstName = profile?.first_name || '';
      const lastName = profile?.last_name || '';
      const fullName = `${firstName} ${lastName}`.trim() || 'Unknown Worker';
      
      return {
        firstName,
        lastName,
        fullName,
        avatarUrl: profile?.avatar_url || null,
        phoneNumber: profile?.phone_number || null,
      };
    };
    
    const manager = getManager();

    return (
      <div
        key={shift.id}
        onClick={() => router.push(`/${lang}/shifts/${shift.id}`)}
        className="block transition-colors hover:opacity-90 cursor-pointer"
      >
        <Card className="h-full transition-colors hover:bg-muted/50">
          <CardHeader>
            <div className="flex items-start justify-between">
              <CardTitle className="text-xl">{shift.title}</CardTitle>
            </div>
            <CardDescription>
              {shift.locations?.name || shift.locations?.address || dict.jobBoard.locationNotSpecified}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">{dict.dashboard.date}:</span>{' '}
                {formatDateShort(shift.start_time)}
              </div>
              <div>
                <span className="font-medium">{dict.dashboard.time}:</span>{' '}
                {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
              </div>
              <div>
                <span className="font-medium">{dict.dashboard.rate}:</span>{' '}
                {shift.hourly_rate} DKK/t
              </div>
              <div>
                <span className="font-medium">{dict.dashboard.booked}:</span>{' '}
                {shift.vacancies_taken || 0} / {shift.vacancies_total}
              </div>
            </div>
            {/* Manager Section */}
            {manager && (
              <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                <UserCircle className="w-4 h-4" />
                <span className="font-medium">Mgr: {manager.first_name}</span>
              </div>
            )}
            {/* Hired Personnel Section */}
            {hiredApplications.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <div className="text-sm font-semibold mb-3">
                  {dict.dashboard.team || 'Hired Personnel'}
                </div>
                <div className="space-y-3">
                  {hiredApplications.map((app) => {
                    const worker = getWorkerDetails(app);
                    const initials = worker.firstName && worker.lastName
                      ? `${worker.firstName.charAt(0)}${worker.lastName.charAt(0)}`.toUpperCase()
                      : '??';
                    
                    return (
                      <div key={app.id} className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={(e) => handleWorkerClick(app, shift, e)}
                          className="flex-shrink-0"
                        >
                          <Avatar className="h-10 w-10 cursor-pointer hover:opacity-80 transition-opacity">
                            <AvatarImage 
                              src={worker.avatarUrl || undefined} 
                              alt={worker.fullName}
                            />
                            <AvatarFallback>
                              <User className="h-5 w-5" />
                            </AvatarFallback>
                          </Avatar>
                        </button>
                        <div className="flex-1 min-w-0">
                          <button
                            type="button"
                            onClick={(e) => handleWorkerClick(app, shift, e)}
                            className="text-blue-600 hover:underline font-medium text-sm text-left shadow-none p-0 h-auto bg-transparent border-none"
                          >
                            {worker.fullName}
                          </button>
                          {(app.status === 'accepted' || app.status === 'hired' || app.status === 'completed') && worker.phoneNumber ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.location.href = `tel:${worker.phoneNumber}`;
                              }}
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                            >
                              <Phone className="h-3 w-3" />
                              {worker.phoneNumber}
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400 blur-[2px] select-none inline-block">Hidden</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  if (!archivedShifts || archivedShifts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground mb-4">
            {dict.companyShifts.noArchiveShifts}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {archivedShifts.map(renderShiftCard)}
      </div>

      {/* Worker Profile Modal */}
      {selectedApplication && (
        <CandidateProfileModal
          open={modalOpen}
          onOpenChange={handleModalClose}
          application={selectedApplication}
          dict={{
            title: 'Worker Profile',
            about: 'About',
            contact: 'Contact',
            applicationMessage: 'Application Message',
            appliedFor: 'Worked on',
            appliedAt: 'Completed',
            status: 'Status',
            accept: 'Accept',
            reject: 'Reject',
            accepting: 'Accepting...',
            rejecting: 'Rejecting...',
            acceptSuccess: 'Application accepted',
            rejectSuccess: 'Application rejected',
            error: 'An error occurred',
            close: 'Close',
            languages: 'Languages',
            licenses: 'Licenses',
            noQualifications: 'No specific qualifications listed'
          }}
          lang={lang}
          onSuccess={handleModalSuccess}
        />
      )}
    </>
  );
}

