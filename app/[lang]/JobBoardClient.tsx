'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { JobCard } from '@/components/JobCard';
import ApplyModal from '@/components/worker/ApplyModal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

interface Shift {
  id: string;
  title: string;
  description: string | null;
  category: string;
  hourly_rate: number;
  start_time: string;
  end_time: string;
  break_minutes: number;
  is_break_paid: boolean;
  vacancies_total: number;
  vacancies_taken: number;
  status: string;
  company_id: string;
  is_urgent: boolean;
  possible_overtime: boolean;
  must_bring: string | null;
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
  verificationStatus: string | null;
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
      possibleOvertime?: string;
      viewDetails?: string;
    };
    workerApplications: {
      statusPending: string;
      statusAccepted: string;
      statusRejected: string;
      statusWaitlist: string;
    };
    createShift?: {
      categories: Record<string, string>;
      breakPaid: string;
      breakUnpaid: string;
      description?: string;
    };
  };
  lang: string;
}

export default function JobBoardClient({
  shifts,
  userRole,
  user,
  appliedShiftIds: initialAppliedShiftIds,
  applicationStatusMap: initialApplicationStatusMap,
  verificationStatus,
  dict,
  lang,
}: JobBoardClientProps) {
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successShift, setSuccessShift] = useState<Shift | null>(null);
  const [appliedShiftIds, setAppliedShiftIds] = useState<string[]>(initialAppliedShiftIds);
  const [applicationStatusMap, setApplicationStatusMap] = useState<Record<string, string>>(initialApplicationStatusMap);

  const handleApply = (shift: Shift) => {
    if (!user) {
      window.location.href = `/${lang}/login`;
      return;
    }
    if (userRole === 'worker' && verificationStatus !== 'verified') {
      window.alert('You must verify your identity first.');
      return;
    }
    setSelectedShift(shift);
    setIsApplyModalOpen(true);
  };

  const handleApplySuccess = (shift: { id: string; title: string; company_id: string }) => {
    // Find the full shift data
    const fullShift = shifts.find(s => s.id === shift.id);
    if (fullShift) {
      // Update local state to reflect the application
      setAppliedShiftIds(prev => [...prev, shift.id]);
      setApplicationStatusMap(prev => ({ ...prev, [shift.id]: 'pending' }));
      
      setSuccessShift(fullShift);
      setShowSuccessModal(true);
    }
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

  // Sort shifts: urgent first, then by start_time
  const sortedShifts = [...shifts].sort((a, b) => {
    // Priority 1: Urgent shifts first
    if (a.is_urgent && !b.is_urgent) return -1;
    if (!a.is_urgent && b.is_urgent) return 1;
    // Priority 2: Sort by start_time (ascending)
    return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
  });

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sortedShifts.map((shift) => {
          const applied = hasApplied(shift.id);

          return (
            <JobCard
              key={shift.id}
              shift={shift}
              onApply={handleApply}
              hasApplied={applied}
              userRole={userRole || ''}
              user={user}
              dict={dict}
              lang={lang}
              applicationStatus={applicationStatusMap[shift.id]}
              getStatusBadge={getStatusBadge}
              onApplySuccess={handleApplySuccess}
              verificationStatus={verificationStatus}
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

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="rounded-full bg-green-100 p-4">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
            </div>
            <DialogTitle className="text-2xl font-bold text-center text-gray-900">
              Application Sent! 🚀
            </DialogTitle>
            <DialogDescription className="text-center pt-2">
              {successShift && (
                <span className="block text-base text-gray-700 leading-relaxed">
                  You have successfully applied for the <strong className="font-semibold text-gray-900">{successShift.title}</strong> position at <strong className="font-semibold text-gray-900">{successShift.profiles?.company_details?.company_name || 'Company'}</strong>.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center pt-6 pb-2">
            <Button
              onClick={() => setShowSuccessModal(false)}
              className="bg-black text-white hover:bg-gray-800 font-semibold px-8"
            >
              Keep looking
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
