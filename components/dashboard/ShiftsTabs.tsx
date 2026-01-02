'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
    id?: string;
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

interface ShiftsTabsProps {
  activeShifts: Shift[] | null;
  archivedShifts: Shift[] | null;
  lang: string;
  dict: {
    dashboard: {
      recentJobListings: string;
      createShift: string;
      noJobListings: string;
      createFirstJobListing: string;
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
      activeShifts: string;
      archiveShifts: string;
      noActiveShifts: string;
      noArchiveShifts: string;
    };
  };
}

export default function ShiftsTabs({
  activeShifts,
  archivedShifts,
  lang,
  dict,
}: ShiftsTabsProps) {
  const [activeTab, setActiveTab] = useState<'active' | 'archive'>('active');

  // Define getStatusBadge function inside the component to access dict
  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      published: 'default',
      full: 'secondary',
      completed: 'outline',
      cancelled: 'destructive',
    };
    const labels: Record<string, string> = {
      published: dict.status.active,
      full: dict.status.fullyBooked,
      completed: dict.status.completed,
      cancelled: dict.status.cancelled,
    };
    return (
      <Badge variant={variants[status] || 'secondary'}>
        {labels[status] || status}
      </Badge>
    );
  };

  const renderShiftCard = (shift: Shift, isArchived: boolean = false) => {
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

    const approvedWorkers = approvedApplications
      .map(getWorkerDetails)
      .filter((worker): worker is NonNullable<typeof worker> => worker !== null);

    // Archive shifts link to shift details, active shifts link to dashboard
    const href = isArchived 
      ? `/${lang}/shifts/${shift.id}` 
      : `/${lang}/dashboard`;

    return (
      <Link
        key={shift.id}
        href={href}
        className="block transition-colors hover:opacity-90"
      >
        <Card className="h-full cursor-pointer transition-colors hover:bg-muted/50">
          <CardHeader>
            <div className="flex items-start justify-between">
              <CardTitle className="text-xl">{shift.title}</CardTitle>
              {getStatusBadge(shift.status)}
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
            {approvedWorkers.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <div className="text-xs font-medium text-muted-foreground mb-2">
                  {dict.dashboard.team || 'Team'}
                </div>
                <div className="flex -space-x-2">
                  {approvedWorkers.map((worker, index) => {
                    const initials = worker.firstName && worker.lastName
                      ? `${worker.firstName.charAt(0)}${worker.lastName.charAt(0)}`.toUpperCase()
                      : '??';
                    return (
                      <Avatar key={index} className="h-8 w-8 border-2 border-background">
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

  const currentShifts = activeTab === 'active' ? activeShifts : archivedShifts;
  const isEmpty = !currentShifts || currentShifts.length === 0;
  const emptyMessage = activeTab === 'active' 
    ? dict.companyShifts.noActiveShifts 
    : dict.companyShifts.noArchiveShifts;

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        <Button
          variant={activeTab === 'active' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('active')}
          className="rounded-b-none"
        >
          {dict.companyShifts.activeShifts}
          {activeShifts && activeShifts.length > 0 && (
            <span className="ml-2 text-xs opacity-75">({activeShifts.length})</span>
          )}
        </Button>
        <Button
          variant={activeTab === 'archive' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('archive')}
          className="rounded-b-none"
        >
          {dict.companyShifts.archiveShifts}
          {archivedShifts && archivedShifts.length > 0 && (
            <span className="ml-2 text-xs opacity-75">({archivedShifts.length})</span>
          )}
        </Button>
      </div>

      {/* Content */}
      {isEmpty ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              {emptyMessage}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {currentShifts.map((shift) => renderShiftCard(shift, activeTab === 'archive'))}
        </div>
      )}
    </div>
  );
}

