'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format, differenceInMinutes } from 'date-fns';
import { da } from 'date-fns/locale/da';
import { formatInTimeZone } from 'date-fns-tz';
import { MapPin, Clock, Building2, Calendar, Flame, X, Users, Briefcase, User, Mail, Phone as PhoneIcon } from 'lucide-react';
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
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/use-toast';

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
  must_bring: string | null;
  manager_id?: string | null;
  locations: { name: string; address: string } | null;
  profiles: {
    company_details: {
      company_name: string;
      logo_url: string | null;
    } | null;
  } | null;
  managers?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string | null;
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
      fullyBooked?: string;
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
      noBreak: string;
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
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  
  // State for shift requirements (fetched from shift_requirements table)
  const [requiredLanguages, setRequiredLanguages] = useState<Array<{ id: string; name: string }>>([]);
  const [requiredLicenses, setRequiredLicenses] = useState<Array<{ id: string; name: string }>>([]);
  const [requirementsLoading, setRequirementsLoading] = useState(true);

  // Fetch shift requirements when dialog opens
  useEffect(() => {
    if (!open) return;

    async function fetchShiftRequirements() {
      setRequirementsLoading(true);
      try {
        const supabase = createClient();
        
        const { data: requirements, error } = await supabase
          .from('shift_requirements')
          .select(`
            skill_id,
            skills!inner (
              id,
              name,
              category
            )
          `)
          .eq('shift_id', shift.id);
        
        if (!error && requirements) {
          const languages: Array<{ id: string; name: string }> = [];
          const licenses: Array<{ id: string; name: string }> = [];
          
          requirements.forEach((req: any) => {
            if (req.skills) {
              const skill = { id: req.skills.id, name: req.skills.name };
              if (req.skills.category === 'language') {
                languages.push(skill);
              } else if (req.skills.category === 'license') {
                licenses.push(skill);
              }
            }
          });
          
          setRequiredLanguages(languages);
          setRequiredLicenses(licenses);
        }
      } catch (error) {
        console.error('Error fetching shift requirements:', error);
      } finally {
        setRequirementsLoading(false);
      }
    }

    fetchShiftRequirements();
  }, [open, shift.id]);

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

  const handleApplyClick = () => {
    if (!user || userRole !== 'worker') {
      window.location.href = `/${lang}/login`;
      return;
    }
    if (verificationStatus !== 'verified') {
      toast({
        title: 'Verification Required',
        description: 'You must verify your identity first.',
        variant: 'destructive',
      });
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

  const handleApplySuccess = (appliedShift: { id: string; title: string; company_id: string }) => {
    setIsApplyModalOpen(false);
    setOpen(false);
    if (onApplySuccess) {
      onApplySuccess();
    } else {
      // Refresh to update application status and show manager contact if accepted
      router.refresh();
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
              <Badge variant="outline" className={`text-sm ${shift.break_minutes === 0 ? 'text-muted-foreground border-dashed' : ''}`}>
                {shift.break_minutes === 0 ? (
                  dict.createShift?.noBreak || 'No break'
                ) : (
                  `${shift.break_minutes}m Break (${shift.is_break_paid 
                    ? (dict.createShift?.breakPaid || 'Paid') 
                    : (dict.createShift?.breakUnpaid || 'Unpaid')})`
                )}
              </Badge>
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

            {/* Must Bring Section */}
            {shift.must_bring && (
              <div className="space-y-2 pt-2">
                <div className="rounded-lg bg-muted p-4 border border-gray-200">
                  <div className="flex items-start gap-3">
                    <Briefcase className="h-5 w-5 text-gray-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-sm text-gray-900 mb-1">
                        Must Bring
                      </h4>
                      <p className="text-sm text-gray-900">
                        {shift.must_bring}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Languages & Licences Requirements */}
            {((requiredLanguages && requiredLanguages.length > 0) || 
              (requiredLicenses && requiredLicenses.length > 0) ||
              (!requirementsLoading && requiredLanguages.length === 0 && requiredLicenses.length === 0)) && (
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <h4 className="font-semibold text-sm text-gray-900">Requirements</h4>
                
                {/* Languages */}
                {requiredLanguages && requiredLanguages.length > 0 ? (
                  <div>
                    <p className="text-xs text-gray-600 mb-2">Languages:</p>
                    <div className="flex flex-wrap gap-2">
                      {requiredLanguages.map((lang) => (
                        <Badge key={lang.id} variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                          {lang.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : !requirementsLoading ? (
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Languages:</p>
                    <p className="text-xs text-muted-foreground">No language requirement</p>
                  </div>
                ) : null}

                {/* Licences - HIDDEN FOR NOW (business decision) */}
                {false && (requiredLicenses && requiredLicenses.length > 0 ? (
                  <div>
                    <p className="text-xs text-gray-600 mb-2">Licences:</p>
                    <div className="flex flex-wrap gap-2">
                      {requiredLicenses.map((license) => (
                        <Badge key={license.id} variant="outline" className="bg-sky-50 text-sky-700 border-sky-200 text-xs">
                          {license.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : !requirementsLoading ? (
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Licences:</p>
                    <p className="text-xs text-muted-foreground">No licences required</p>
                  </div>
                ) : null)}
              </div>
            )}

            {/* Shift Manager / Contact Person - ONLY visible for approved/accepted applications */}
            {/* Privacy First: Manager section is completely hidden for guests and pending applications */}
            {shift.managers && user && userRole === 'worker' && applicationStatus && 
             (applicationStatus === 'accepted' || applicationStatus === 'approved') && (
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <h4 className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Shift Manager
                </h4>
                <div className="rounded-lg bg-muted p-4 border border-gray-200">
                  <div className="space-y-2">
                    <p className="font-medium text-gray-900">
                      {shift.managers.first_name} {shift.managers.last_name}
                    </p>
                    {shift.managers.phone_number && (
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <PhoneIcon className="h-4 w-4" />
                        <a 
                          href={`tel:${shift.managers.phone_number}`} 
                          className="hover:underline hover:text-primary transition-colors"
                        >
                          {shift.managers.phone_number}
                        </a>
                      </div>
                    )}
                    {shift.managers.email && (
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Mail className="h-4 w-4" />
                        <a 
                          href={`mailto:${shift.managers.email}`} 
                          className="hover:underline hover:text-primary transition-colors"
                        >
                          {shift.managers.email}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

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
