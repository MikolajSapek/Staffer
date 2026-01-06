'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { formatTime, formatDateShort } from '@/lib/date-utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Phone, User } from 'lucide-react';

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
  shift_applications?: Array<{
    id: string;
    status: string;
    worker_id?: string;
    profiles?: {
      first_name: string | null;
      last_name: string | null;
      email: string;
      worker_details?: {
        avatar_url: string | null;
        phone_number: string | null;
      } | null;
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
  
  const renderShiftCard = (shift: Shift) => {
    // Extract hired workers from applications
    // Filter for 'hired' or 'accepted' status
    const hiredApplications = (shift.shift_applications || []).filter(
      (app) => app.status === 'hired' || app.status === 'accepted'
    );
    
    // Helper to get worker details from application
    const getWorkerDetails = (app: any) => {
      const profile = app.profiles;
      if (!profile) {
        return {
          firstName: '',
          lastName: '',
          fullName: 'Unknown Worker',
          avatarUrl: null,
          phoneNumber: null,
        };
      }
      
      const workerDetails = profile.worker_details;
      const firstName = profile.first_name || '';
      const lastName = profile.last_name || '';
      const fullName = `${firstName} ${lastName}`.trim() || 'Unknown Worker';
      
      return {
        firstName,
        lastName,
        fullName,
        avatarUrl: workerDetails?.avatar_url || null,
        phoneNumber: workerDetails?.phone_number || null,
      };
    };

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
              {shift.locations?.name || dict.jobBoard.locationNotSpecified}
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
                        <Avatar className="h-10 w-10">
                          <AvatarImage 
                            src={worker.avatarUrl || undefined} 
                            alt={worker.fullName}
                          />
                          <AvatarFallback>
                            <User className="h-5 w-5" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{worker.fullName}</div>
                          {worker.phoneNumber && (
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
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {archivedShifts.map(renderShiftCard)}
    </div>
  );
}

