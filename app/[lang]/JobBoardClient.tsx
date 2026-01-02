'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, DollarSign, Users } from 'lucide-react';
import { formatTime, formatDateLong } from '@/lib/date-utils';
import ApplyModal from '@/components/worker/ApplyModal';
import type { User } from '@supabase/supabase-js';

interface Shift {
  id: string;
  title: string;
  hourly_rate: number;
  start_time: string;
  end_time: string;
  vacancies_total: number;
  vacancies_taken: number;
  status: string;
  company_id: string;
  locations: { name: string; address: string } | null;
}

interface JobBoardClientProps {
  shifts: Shift[];
  userRole: 'worker' | 'company' | 'admin' | null;
  user: User | null;
  appliedShiftIds: string[];
  applicationStatusMap: Record<string, string>;
  dict: {
    jobBoard: {
      apply: string;
      loginToApply: string;
      fullyBooked: string;
      date: string;
      time: string;
      address: string;
      availableSpots: string;
      locationNotSpecified: string;
      notSpecified: string;
    };
    workerApplications: {
      statusPending: string;
      statusAccepted: string;
      statusRejected: string;
      statusWaitlist: string;
    };
  };
  lang: string;
}

export default function JobBoardClient({
  shifts,
  userRole,
  user,
  appliedShiftIds,
  applicationStatusMap,
  dict,
  lang,
}: JobBoardClientProps) {
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);

  const handleApply = (shift: Shift) => {
    if (!user) {
      // Redirect to login - handled by the button's onClick
      return;
    }
    setSelectedShift(shift);
    setIsApplyModalOpen(true);
  };

  const handleApplySuccess = () => {
    // Refresh the page to update application status
    window.location.reload();
  };

  const getStatusBadge = (shiftId: string) => {
    const status = applicationStatusMap[shiftId];
    if (!status) return null;

    const statusConfig = {
      pending: { label: dict.workerApplications.statusPending, variant: 'secondary' as const },
      accepted: { label: dict.workerApplications.statusAccepted, variant: 'default' as const },
      approved: { label: dict.workerApplications.statusAccepted, variant: 'default' as const },
      rejected: { label: dict.workerApplications.statusRejected, variant: 'destructive' as const },
      waitlist: { label: dict.workerApplications.statusWaitlist, variant: 'secondary' as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <Badge variant={config.variant} className="ml-2">
        {config.label}
      </Badge>
    );
  };

  const availableSpots = (shift: Shift) => {
    return shift.vacancies_total - shift.vacancies_taken;
  };

  const isFullyBooked = (shift: Shift) => {
    return availableSpots(shift) <= 0 || shift.status === 'full';
  };

  const hasApplied = (shiftId: string) => {
    return appliedShiftIds.includes(shiftId);
  };

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {shifts.map((shift) => {
          const spotsAvailable = availableSpots(shift);
          const fullyBooked = isFullyBooked(shift);
          const applied = hasApplied(shift.id);
          const canApply = userRole === 'worker' && !applied && !fullyBooked;

          return (
            <Card key={shift.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{shift.title}</CardTitle>
                  <Badge variant="secondary" className="ml-2">
                    {shift.hourly_rate} DKK/t
                  </Badge>
                </div>
                {applied && getStatusBadge(shift.id)}
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      <span className="font-medium">{dict.jobBoard.date}:</span>{' '}
                      {formatDateLong(shift.start_time)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      <span className="font-medium">{dict.jobBoard.time}:</span>{' '}
                      {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>
                      <span className="font-medium">{dict.jobBoard.address}:</span>{' '}
                      {shift.locations?.address || dict.jobBoard.locationNotSpecified}
                    </span>
                  </div>
                  {shift.locations?.name && (
                    <div className="text-muted-foreground ml-6 text-xs">
                      {shift.locations.name}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>
                      <span className="font-medium">{dict.jobBoard.availableSpots}:</span>{' '}
                      {spotsAvailable} / {shift.vacancies_total}
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  {fullyBooked ? (
                    <Badge variant="outline" className="w-full justify-center">
                      {dict.jobBoard.fullyBooked}
                    </Badge>
                  ) : canApply ? (
                    <Button
                      onClick={() => handleApply(shift)}
                      className="w-full"
                    >
                      {dict.jobBoard.apply}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        window.location.href = `/${lang}/login`;
                      }}
                    >
                      {dict.jobBoard.loginToApply}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedShift && (
        <ApplyModal
          open={isApplyModalOpen}
          onOpenChange={setIsApplyModalOpen}
          shift={{
            id: selectedShift.id,
            title: selectedShift.title,
            company_id: selectedShift.company_id,
          }}
          dict={{
            title: `Apply for ${selectedShift.title}`,
            confirmText: 'Submit your application for this shift.',
            messageLabel: 'Message (optional)',
            messagePlaceholder: 'Add a message to your application...',
            cancel: 'Cancel',
            confirm: 'Apply',
            applying: 'Applying...',
            success: 'Application submitted successfully!',
            alreadyApplied: 'You have already applied for this shift.',
            error: 'An error occurred. Please try again.',
          }}
          lang={lang}
          onSuccess={handleApplySuccess}
        />
      )}
    </>
  );
}
