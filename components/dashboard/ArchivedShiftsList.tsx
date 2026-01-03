'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { formatTime, formatDateShort } from '@/lib/date-utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

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
      id: string;
      first_name: string;
      last_name: string;
      worker_details?: Array<{ avatar_url: string | null; phone_number: string | null }> | { avatar_url: string | null; phone_number: string | null } | null;
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
  const renderShiftCard = (shift: Shift) => {
    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log('Shift Data:', shift);
      console.log('Shift Applications:', shift.shift_applications);
      if (shift.shift_applications && shift.shift_applications.length > 0) {
        console.log('First Application:', shift.shift_applications[0]);
        console.log('First App Profiles:', shift.shift_applications[0]?.profiles);
        console.log('First App Worker Details:', shift.shift_applications[0]?.profiles?.worker_details);
      }
    }

    // Extract approved workers from applications
    const approvedApplications = (shift.shift_applications as any[])?.filter(
      (app: any) => app.status === 'accepted'
    ) || [];
    
    // Helper to get worker details from application
    const getWorkerDetails = (app: any) => {
      const profile = app.profiles;
      if (!profile) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('No profile found for application:', app);
        }
        return null;
      }
      // worker_details is returned as an object, not an array
      const workerDetails = profile.worker_details;
      if (process.env.NODE_ENV === 'development' && !workerDetails) {
        console.warn('No worker_details found for profile:', profile);
      }
      return {
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
        avatarUrl: workerDetails?.avatar_url || null,
      };
    };

    return (
      <Link
        key={shift.id}
        href={`/${lang}/shifts/${shift.id}`}
        className="block transition-colors hover:opacity-90"
      >
        <Card className="h-full cursor-pointer transition-colors hover:bg-muted/50">
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
            {/* Team Section */}
            {approvedApplications.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <div className="text-xs font-medium text-muted-foreground mb-2">
                  {dict.dashboard.team || 'Team'}
                </div>
                <div className="flex -space-x-2">
                  {approvedApplications.map((app) => {
                    const worker = getWorkerDetails(app);
                    if (!worker) return null;
                    const initials = worker.firstName && worker.lastName
                      ? `${worker.firstName.charAt(0)}${worker.lastName.charAt(0)}`.toUpperCase()
                      : '??';
                    return (
                      <Avatar key={app.id} className="h-8 w-8 border-2 border-background">
                        <AvatarImage src={worker.avatarUrl || undefined} alt={`${worker.firstName} ${worker.lastName}`} />
                        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                      </Avatar>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </Link>
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

