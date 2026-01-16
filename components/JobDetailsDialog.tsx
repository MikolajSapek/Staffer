'use client';

import React, { useState } from 'react';
import { format, differenceInMinutes } from 'date-fns';
import { da } from 'date-fns/locale/da';
import { formatInTimeZone } from 'date-fns-tz';
import { MapPin, Clock, Building2, Calendar, Flame, X, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import ApplyModal from '@/components/worker/ApplyModal';
import CompanyProfileDialog from '@/components/CompanyProfileDialog';
import { cn, getMapsLink } from '@/lib/utils';
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
  possible_overtime: boolean;
  vacancies_total: number;
  vacancies_taken: number;
  status: string;
  company_id: string;
  is_urgent: boolean;
  requirements: any; // JSONB field
  locations: { name: string; address: string } | null;
  profiles: {
    company_details: {
      company_name: string;
      logo_url: string | null;
    } | null;
  } | null;
}

export interface JobDetailsDialogProps {
  shift: Shift;
  isApplied: boolean;
  userRole: string;
  user: User | null;
  dict: {
    jobBoard: {
      apply: string;
      loginToApply: string;
      possibleOvertime?: string;
      locationNotSpecified: string;
      breakPaidDisplay?: string;
      breakUnpaidDisplay?: string;
    };
    workerApplications?: {
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
  applicationStatus?: string | null;
  children: React.ReactNode;
  onApply?: (shift: Shift) => void;
  onApplySuccess?: () => void;
  verificationStatus?: string | null;
}

export function JobDetailsDialog({
  shift,
  isApplied,
  userRole,
  user,
  dict,
  lang,
  applicationStatus,
  children,
  onApply,
  onApplySuccess,
  verificationStatus,
}: JobDetailsDialogProps) {
  const [open, setOpen] = useState(false);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);

  const timeZone = 'Europe/Copenhagen';
  const start = new Date(shift.start_time);
  const end = new Date(shift.end_time);
  const durationMinutes = differenceInMinutes(end, start);
  const unpaidBreak = !shift.is_break_paid ? (shift.break_minutes || 0) : 0;
  const totalPay = Math.round(((durationMinutes - unpaidBreak) / 60) * shift.hourly_rate);

  const dateFormatted = formatInTimeZone(start, timeZone, 'dd/MM/yyyy', { locale: da });
  const startTimeFormatted = formatInTimeZone(start, timeZone, 'HH:mm', { locale: da });
  const endTimeFormatted = formatInTimeZone(end, timeZone, 'HH:mm', { locale: da });
  const timeFormatted = `${startTimeFormatted} - ${endTimeFormatted}`;

  const companyName = shift.profiles?.company_details?.company_name || 'Company';
  const locationName = shift.locations?.name || shift.locations?.address || dict.jobBoard.locationNotSpecified;
  const locationAddress = shift.locations?.address || '';
  const logoUrl = shift.profiles?.company_details?.logo_url;

  // Get category display name
  const categoryDisplay = dict.createShift?.categories?.[shift.category] || shift.category;

  // Parse requirements (JSONB field could be array, object, or null)
  const renderRequirements = () => {
    if (!shift.requirements) return null;

    let requirementsList: string[] = [];
    
    if (Array.isArray(shift.requirements)) {
      requirementsList = shift.requirements;
    } else if (typeof shift.requirements === 'object') {
      // If it's an object, convert to array of key-value pairs or values
      requirementsList = Object.entries(shift.requirements).map(([key, value]) => {
        if (typeof value === 'string' && value.trim()) {
          return value;
        }
        return `${key}: ${value}`;
      }).filter(Boolean);
    } else if (typeof shift.requirements === 'string') {
      requirementsList = [shift.requirements];
    }

    if (requirementsList.length === 0) return null;

    return (
      <div className="space-y-2">
        <h4 className="font-semibold text-sm text-gray-900">Requirements</h4>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-900">
          {requirementsList.map((req, idx) => (
            <li key={idx}>{req}</li>
          ))}
        </ul>
      </div>
    );
  };

  const handleApplyClick = () => {
    if (!user || userRole !== 'worker') {
      window.location.href = `/${lang}/login`;
      return;
    }
    if (verificationStatus !== 'verified') {
      window.alert('You must verify your identity first.');
      return;
    }
    
    // If onApply prop is provided, use it (parent handles ApplyModal)
    if (onApply) {
      setOpen(false);
      onApply(shift);
    } else {
      // Otherwise, use internal ApplyModal
      setOpen(false);
      setIsApplyModalOpen(true);
    }
  };

  const handleApplySuccess = () => {
    setIsApplyModalOpen(false);
    setOpen(false);
    if (onApplySuccess) {
      onApplySuccess();
    } else {
      window.location.reload();
    }
  };

  const isFullyBooked = shift.vacancies_taken >= shift.vacancies_total || shift.status === 'full';
  const mustVerify = userRole === 'worker' && verificationStatus !== 'verified';
  const canApply = userRole === 'worker' && !isApplied && !isFullyBooked && !mustVerify;

  // Helper function to get status-specific button styles
  const getStatusStyles = (status: string | null | undefined): string => {
    if (status === 'accepted' || status === 'approved') {
      return "bg-slate-900 text-white hover:bg-slate-900 opacity-100 disabled:opacity-100 disabled:cursor-not-allowed";
    }
    if (status === 'rejected') {
      return "bg-red-500 text-white hover:bg-red-500 opacity-100 disabled:opacity-100 disabled:cursor-not-allowed";
    }
    if (status === 'waitlist') {
      return "bg-secondary text-secondary-foreground opacity-100 disabled:opacity-100 disabled:cursor-not-allowed";
    }
    // Default: Pending or unknown
    return "bg-secondary text-secondary-foreground opacity-100 disabled:opacity-100 disabled:cursor-not-allowed";
  };

  return (
    <>
      <div onClick={() => setOpen(true)} className="cursor-pointer">
        {children}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          {/* Header Section */}
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100">
            <div className="flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-2xl font-bold text-gray-900 mb-1">
                  {shift.title}
                </DialogTitle>
                <CompanyProfileDialog companyId={shift.company_id} lang={lang}>
                  <div className="flex items-center gap-3 cursor-pointer group">
                    {logoUrl && (
                      <div className="h-12 w-12 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 overflow-hidden group-hover:opacity-80 transition-opacity">
                        <img src={logoUrl} alt={companyName} className="h-full w-full object-cover" />
                      </div>
                    )}
                    <DialogDescription className="text-base text-gray-900 font-medium group-hover:underline transition-all">
                      {companyName}
                    </DialogDescription>
                  </div>
                </CompanyProfileDialog>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-red-700">
                  {shift.hourly_rate} DKK/h
                </div>
                <div className="text-sm text-gray-700 mt-1">
                  ~{totalPay} DKK total
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {/* Badges Row */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-sm">
                {categoryDisplay}
              </Badge>
              {shift.is_urgent && (
                <Badge className="bg-red-600 text-white font-bold flex items-center gap-1">
                  <Flame className="h-3 w-3" />
                  URGENT
                </Badge>
              )}
              {shift.possible_overtime && (
                <Badge className="bg-purple-600 text-white text-sm">
                  {dict.jobBoard.possibleOvertime || 'Possible Overtime'}
                </Badge>
              )}
              {shift.break_minutes > 0 && (
                <Badge variant="outline" className="text-sm">
                  {shift.is_break_paid 
                    ? `${shift.break_minutes}m Break (${dict.createShift?.breakPaid || 'Paid'})`
                    : `${shift.break_minutes}m Break (${dict.createShift?.breakUnpaid || 'Unpaid'})`
                  }
                </Badge>
              )}
            </div>

            {/* Time & Location Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-gray-900">{dateFormatted}</div>
                    <div className="text-sm text-gray-900 flex items-center gap-2 mt-1">
                      <Clock className="h-4 w-4" />
                      {timeFormatted}
                    </div>
                  </div>
                </div>
              </div>
              <a
                href={getMapsLink(shift.locations)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 text-gray-900 hover:text-blue-600 hover:underline transition-colors"
              >
                <MapPin className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">{locationName}</div>
                  {locationAddress && locationAddress !== locationName && (
                    <div className="text-sm mt-1">{locationAddress}</div>
                  )}
                </div>
              </a>
            </div>

            {/* Description Section */}
            {shift.description && (
              <div className="space-y-2 pt-2">
                <h4 className="font-semibold text-sm text-gray-900">
                  {dict.createShift?.description || 'Description'}
                </h4>
                <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">
                  {shift.description}
                </p>
              </div>
            )}

            {/* Requirements Section */}
            {renderRequirements()}

            {/* Availability Info */}
            <div className="flex items-center gap-1 text-sm text-gray-900 pt-2 border-t border-gray-100">
              <Users className="h-4 w-4" />
              <span>
                {shift.vacancies_total} {shift.vacancies_total === 1 ? 'person' : 'persons'} needed
              </span>
            </div>
          </div>

          {/* Footer - Sticky Apply Button */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 sticky bottom-0">
            {isApplied ? (
              <Button
                disabled
                className={cn(
                  "w-full h-12 text-base font-semibold",
                  getStatusStyles(applicationStatus)
                )}
                size="lg"
              >
                {applicationStatus === 'accepted' || applicationStatus === 'approved'
                  ? dict.workerApplications?.statusAccepted || 'Application Accepted'
                  : applicationStatus === 'rejected'
                  ? dict.workerApplications?.statusRejected || 'Application Rejected'
                  : applicationStatus === 'waitlist'
                  ? dict.workerApplications?.statusWaitlist || 'On Waitlist'
                  : dict.workerApplications?.statusPending || 'Application Pending'}
              </Button>
            ) : isFullyBooked ? (
              <Button
                disabled
                variant="outline"
                className="w-full h-12 text-base cursor-not-allowed"
                size="lg"
              >
                {dict.jobBoard.fullyBooked || 'Fully Booked'}
              </Button>
            ) : mustVerify ? (
              <Button
                disabled
                variant="outline"
                className="w-full h-12 text-base cursor-not-allowed"
                size="lg"
              >
                Verify account to apply
              </Button>
            ) : canApply ? (
              <Button
                onClick={handleApplyClick}
                className="w-full h-12 text-base font-semibold bg-black text-white hover:bg-gray-800"
                size="lg"
              >
                {dict.jobBoard.apply}
              </Button>
            ) : (
              <Button
                variant="outline"
                className="w-full h-12 text-base"
                size="lg"
                onClick={() => {
                  setOpen(false);
                  window.location.href = `/${lang}/login`;
                }}
              >
                {dict.jobBoard.loginToApply}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Only render ApplyModal if onApply prop is not provided (internal handling) */}
      {user && !onApply && (
        <ApplyModal
          open={isApplyModalOpen}
          onOpenChange={setIsApplyModalOpen}
          shift={{
            id: shift.id,
            title: shift.title,
            company_id: shift.company_id,
          }}
          dict={{
            title: `Apply for ${shift.title}`,
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
