'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { JobCard } from '@/components/JobCard';
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
  profiles: {
    company_details: {
      company_name: string;
      logo_url: string | null;
    } | null;
  } | null;
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
      window.location.href = `/${lang}/login`;
      return;
    }
    setSelectedShift(shift);
    setIsApplyModalOpen(true);
  };

  const handleApplySuccess = () => {
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

  const hasApplied = (shiftId: string) => {
    return appliedShiftIds.includes(shiftId);
  };

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {shifts.map((shift) => {
          const applied = hasApplied(shift.id);

          return (
            <JobCard
              key={shift.id}
              shift={shift}
              onApply={handleApply}
              hasApplied={applied}
              userRole={userRole || ''}
              dict={dict}
              lang={lang}
              applicationStatus={applicationStatusMap[shift.id]}
              getStatusBadge={getStatusBadge}
            />
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
