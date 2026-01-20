'use client';

import { useMemo, useCallback, useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, Wallet, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatTime, formatDateShort } from '@/lib/date-utils';
import { cn } from '@/lib/utils';
import { differenceInMinutes, startOfMonth, endOfMonth, format } from 'date-fns';
import { JobDetailsDialog } from '@/components/JobDetailsDialog';
import { useParams } from 'next/navigation';

interface Application {
  id: string;
  status: string;
  applied_at: string;
  worker_message: string | null;
  shift_id: string;
  shifts: {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    hourly_rate: number;
    company_id?: string;
    category?: string;
    description?: string | null;
    status?: string;
    is_urgent?: boolean;
    possible_overtime?: boolean;
    break_minutes?: number;
    is_break_paid?: boolean;
    vacancies_total?: number;
    vacancies_taken?: number;
    must_bring?: string | null;
    locations: {
      name: string;
      address: string;
    } | null;
    profiles: {
      first_name?: string | null;
      avatar_url?: string | null;
      company_details: {
        company_name: string;
        logo_url: string | null;
      } | null;
    } | null;
  };
  review: {
    id: string;
    rating: number;
    comment: string | null;
    tags: string[] | null;
  } | null;
}

interface WorkerApplicationsClientProps {
  applications: Application[];
  dict: {
    workerApplications: {
      title: string;
      subtitle: string;
      noApplications: string;
      applied: string;
      date: string;
      time: string;
      rate: string;
      location: string;
      locationNotSpecified: string;
      statusPending: string;
      statusAccepted: string;
      statusRejected: string;
      statusWaitlist: string;
      message?: string;
      activeTab?: string;
      archiveTab?: string;
    };
    jobBoard: {
      apply: string;
      loginToApply: string;
      possibleOvertime?: string;
      locationNotSpecified: string;
      breakPaidDisplay?: string;
      breakUnpaidDisplay?: string;
      fullyBooked?: string;
    };
    createShift?: {
      categories: Record<string, string>;
      breakPaid: string;
      breakUnpaid: string;
      noBreak: string;
      description?: string;
    };
  };
  user: any;
  userRole: string;
  verificationStatus?: string | null;
}

export default function WorkerApplicationsClient({
  applications,
  dict,
  user,
  userRole,
  verificationStatus,
}: WorkerApplicationsClientProps) {
  const [now, setNow] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const params = useParams();
  const lang = params?.lang || 'en';

  useEffect(() => {
    setNow(new Date());
  }, []);

  const handlePreviousMonth = () => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  };

  const monthLabel = format(currentMonth, 'MMMM yyyy');

  const { activeApps, archiveApps } = useMemo(() => {
    if (!now) return { activeApps: [], archiveApps: [] };

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    const filteredApps = (applications || []).filter((app) => {
      const shift = Array.isArray(app.shifts) ? app.shifts[0] : app.shifts;
      if (!shift) return false;

      if (app.status === 'rejected' && new Date(shift.end_time) < now) {
        return false;
      }

      return true;
    });

    // Filter by selected month
    const appsInMonth = filteredApps.filter((app) => {
      const shift = Array.isArray(app.shifts) ? app.shifts[0] : app.shifts;
      if (!shift) return false;
      
      const shiftStart = new Date(shift.start_time);
      return shiftStart >= monthStart && shiftStart <= monthEnd;
    });

    // Sort chronologically within the month (earliest first)
    const sortedApps = appsInMonth.sort((a, b) => {
      const shiftA = Array.isArray(a.shifts) ? a.shifts[0] : a.shifts;
      const shiftB = Array.isArray(b.shifts) ? b.shifts[0] : b.shifts;
      
      if (!shiftA?.start_time || !shiftB?.start_time) return 0;
      
      return new Date(shiftA.start_time).getTime() - new Date(shiftB.start_time).getTime();
    });

    const active = sortedApps.filter((app) => {
      const shift = Array.isArray(app.shifts) ? app.shifts[0] : app.shifts;
      if (!shift) return false;
      return new Date(shift.end_time) >= now;
    });

    const archive = sortedApps.filter((app) => {
      const shift = Array.isArray(app.shifts) ? app.shifts[0] : app.shifts;
      if (!shift) return false;
      return app.status === 'accepted' && new Date(shift.end_time) < now;
    });

    return { activeApps: active, archiveApps: archive };
  }, [applications, now, currentMonth]);

  const getStatusBadge = useCallback((status: string, isArchive: boolean = false) => {
    if (isArchive) {
      return (
        <Badge className="bg-green-500 hover:bg-green-600 text-white">
          Completed
        </Badge>
      );
    }

    const displayStatus = status === 'accepted' ? 'approved' : status;

    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      approved: 'default',
      accepted: 'default',
      pending: 'secondary',
      rejected: 'destructive',
      waitlist: 'outline',
      completed: 'outline',
    };

    const labels: Record<string, string> = {
      approved: dict.workerApplications.statusAccepted || 'Approved',
      accepted: dict.workerApplications.statusAccepted || 'Accepted',
      pending: dict.workerApplications.statusPending,
      rejected: dict.workerApplications.statusRejected,
      waitlist: dict.workerApplications.statusWaitlist,
      completed: 'Completed',
    };

    return (
      <Badge variant={variants[displayStatus] || 'secondary'}>
        {labels[displayStatus] || status}
      </Badge>
    );
  }, [dict.workerApplications]);

  const getCompanyName = useCallback((shift: Application['shifts']) => {
    return (
      shift.profiles?.first_name ||
      shift.profiles?.company_details?.company_name ||
      'Unknown Company'
    );
  }, []);

  const getCompanyLogo = useCallback((shift: Application['shifts']) => {
    return shift.profiles?.avatar_url || shift.profiles?.company_details?.logo_url || null;
  }, []);

  const renderApplicationCard = useCallback((app: Application, isArchive: boolean = false) => {
    const shift = Array.isArray(app.shifts) ? app.shifts[0] : app.shifts;
    if (!shift) return null;

    const companyName = getCompanyName(shift);
    const companyLogo = getCompanyLogo(shift);
    const companyInitials = companyName.substring(0, 2).toUpperCase();
    
    const formattedDate = formatDateShort(shift.start_time);
    const formattedStartTime = formatTime(shift.start_time);
    const formattedEndTime = formatTime(shift.end_time);

    // Calculate total estimated earnings
    const start = new Date(shift.start_time);
    const end = new Date(shift.end_time);
    const durationMinutes = differenceInMinutes(end, start);
    const totalEarnings = Math.round((durationMinutes / 60) * shift.hourly_rate);

    // Convert shift to the format expected by JobDetailsDialog
    const shiftForDialog = {
      ...shift,
      must_bring: shift.must_bring || null,
      description: shift.description || null,
      status: shift.status || 'published',
      is_urgent: shift.is_urgent || false,
      possible_overtime: shift.possible_overtime || false,
      category: shift.category || 'general',
      break_minutes: shift.break_minutes || 0,
      is_break_paid: shift.is_break_paid || false,
      vacancies_total: shift.vacancies_total || 1,
      vacancies_taken: shift.vacancies_taken || 0,
      requirements: null,
    };

    return (
      <JobDetailsDialog
        key={app.id}
        shift={shiftForDialog}
        isApplied={true}
        userRole={userRole}
        user={user}
        dict={dict}
        lang={lang as string}
        applicationStatus={app.status}
        verificationStatus={verificationStatus}
      >
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow cursor-pointer">
          {/* Mobile: Vertical layout, Desktop: Horizontal layout */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Logo */}
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                {companyLogo ? (
                  <img
                    src={companyLogo}
                    alt={companyName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-semibold text-gray-600">
                    {companyInitials}
                  </span>
                )}
              </div>
            </div>

            {/* Middle: Title, Date & Info */}
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-gray-900 truncate mb-1">
                {shift.title}
              </h3>
              <div className="text-sm text-gray-600">
                <span suppressHydrationWarning>{formattedDate}</span>
                <span className="mx-1.5">•</span>
                <span suppressHydrationWarning>{formattedStartTime} - {formattedEndTime}</span>
              </div>
              <div className="text-xs text-gray-500 mt-0.5 truncate">
                {shift.locations?.name || dict.workerApplications.locationNotSpecified}
              </div>
            </div>

            {/* Right: Status Badge & Price */}
            <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 sm:gap-1">
              <div className="flex-shrink-0">
                {getStatusBadge(app.status, isArchive)}
              </div>
              <div className="text-base font-bold text-gray-900 whitespace-nowrap">
                {totalEarnings} DKK
              </div>
            </div>
          </div>

          {/* Worker Message - Compact */}
          {app.worker_message && (
            <div className="mt-3 pt-3 border-t border-gray-100 bg-gray-50 rounded p-2">
              <p className="text-xs text-gray-600 whitespace-pre-wrap break-words">
                <span className="font-medium text-gray-700">
                  {dict.workerApplications.message || 'Your message'}:
                </span>{' '}
                {app.worker_message}
              </p>
            </div>
          )}

          {/* Company Review - Compact */}
          {app.review && (
            <div className="mt-3 pt-3 border-t border-gray-100 bg-gray-50 rounded p-2 space-y-2">
              <div className="font-medium text-xs text-gray-900">Company Feedback:</div>

              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      'h-3.5 w-3.5',
                      star <= app.review!.rating
                        ? 'fill-yellow-400 stroke-yellow-400'
                        : 'fill-gray-300 stroke-gray-300'
                    )}
                  />
                ))}
                <span className="text-xs text-gray-600 ml-1">
                  {app.review.rating}/5
                </span>
              </div>

              {app.review.comment && (
                <p className="text-xs text-gray-700 whitespace-pre-wrap">
                  {app.review.comment}
                </p>
              )}

              {app.review.tags && app.review.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {app.review.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs px-1.5 py-0">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </JobDetailsDialog>
    );
  }, [getStatusBadge, getCompanyName, getCompanyLogo, dict, lang, user, userRole, verificationStatus]);

  const renderEmptyState = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
      <p className="text-gray-600">{dict.workerApplications.noApplications}</p>
    </div>
  );

  return (
    <div className="w-full space-y-6">
      {/* Month Navigation */}
      <div className="flex items-center justify-center gap-4 bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <Button
          variant="outline"
          size="icon"
          onClick={handlePreviousMonth}
          className="h-9 w-9"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="text-lg font-bold text-gray-900 min-w-[180px] text-center">
          {monthLabel}
        </div>
        
        <Button
          variant="outline"
          size="icon"
          onClick={handleNextMonth}
          className="h-9 w-9"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active">
            {dict.workerApplications.activeTab || 'My Shifts'}
          </TabsTrigger>
          <TabsTrigger value="archive">
            {dict.workerApplications.archiveTab || 'Archive Shifts'}
          </TabsTrigger>
        </TabsList>

      <TabsContent value="active" className="mt-6">
        {activeApps.length === 0 ? (
          renderEmptyState()
        ) : (
          <div className="space-y-3">
            {activeApps.map((app) => renderApplicationCard(app, false))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="archive" className="mt-6">
        {archiveApps.length === 0 ? (
          renderEmptyState()
        ) : (
          <div className="space-y-3">
            {archiveApps.map((app) => renderApplicationCard(app, true))}
          </div>
        )}
      </TabsContent>
      </Tabs>
    </div>
  );
}
