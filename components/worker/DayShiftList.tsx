'use client';

import { isSameDay } from 'date-fns';
import { format } from 'date-fns';
import { da } from 'date-fns/locale/da';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { formatTime, formatDateLong } from '@/lib/date-utils';
import { Clock, MapPin, Building2, CalendarDays } from 'lucide-react';
import { JobDetailsDialog } from '@/components/JobDetailsDialog';
import type { User } from '@supabase/supabase-js';

interface Shift {
  id: string;
  start_time: string;
  end_time: string;
  title: string;
  hourly_rate: number;
  description?: string | null;
  category?: string;
  break_minutes?: number;
  is_break_paid?: boolean;
  vacancies_total?: number;
  vacancies_taken?: number;
  status?: string;
  company_id?: string;
  is_urgent?: boolean;
  possible_overtime?: boolean;
  must_bring?: string | null;
  applicationStatus?: string;
  locations: {
    name: string;
    address: string;
  } | null;
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

interface DayShiftListProps {
  shifts: Shift[];
  selectedDate: Date | null;
  dict: {
    noShiftsOnDate: string;
    shiftDetails?: string;
    time: string;
    address: string;
    locationNotSpecified: string;
    selectDate?: string;
    statusPending?: string;
    statusAccepted?: string;
  };
  fullDict?: any;
  lang?: string;
  user?: User;
  userRole?: string;
  verificationStatus?: string | null;
}

function getStatusStyles(applicationStatus: string | undefined) {
  const status = (applicationStatus || '').toLowerCase();
  const isAccepted = status === 'accepted' || status === 'approved';
  const isPending = status === 'pending';

  if (isAccepted) {
    return {
      card: 'bg-emerald-50 border-emerald-200 hover:border-emerald-300',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    };
  }
  if (isPending) {
    return {
      card: 'bg-amber-50 border-amber-200 hover:border-amber-300',
      badge: 'bg-amber-100 text-amber-800 border-amber-200',
    };
  }
  return {
    card: 'bg-white border-border hover:border-primary/50',
    badge: 'bg-muted text-muted-foreground',
  };
}

export default function DayShiftList({
  shifts,
  selectedDate,
  dict,
  fullDict,
  lang,
  user,
  userRole,
  verificationStatus,
}: DayShiftListProps) {
  // Mode A: List View (!selectedDate) - all upcoming shifts
  if (!selectedDate) {
    const upcomingShifts = shifts
      .filter((shift) => new Date(shift.start_time) >= new Date())
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    if (upcomingShifts.length === 0) {
      return (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">{dict.noShiftsOnDate}</p>
            <p className="text-sm text-muted-foreground mt-1">{dict.selectDate}</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Upcoming Shifts</h3>
        <div className="space-y-3">
          {upcomingShifts.map((shift) => (
            <ListShiftCard
              key={shift.id}
              shift={shift}
              dict={dict}
              fullDict={fullDict}
              lang={lang}
              user={user}
              userRole={userRole}
              verificationStatus={verificationStatus}
            />
          ))}
        </div>
      </div>
    );
  }

  // Mode B: Detail View (selectedDate) - shifts for that day
  const shiftsForDate = shifts.filter((shift) => {
    const shiftDate = new Date(shift.start_time);
    return isSameDay(shiftDate, selectedDate);
  });

  if (shiftsForDate.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="font-medium text-muted-foreground">{dict.noShiftsOnDate}</p>
          <p className="text-sm text-muted-foreground mt-1">{dict.selectDate}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">{formatDateLong(selectedDate.toISOString())}</h3>
      <div className="space-y-4">
        {shiftsForDate.map((shift) => (
          <DetailShiftCard
            key={shift.id}
            shift={shift}
            dict={dict}
            fullDict={fullDict}
            lang={lang}
            user={user}
            userRole={userRole}
            verificationStatus={verificationStatus}
          />
        ))}
      </div>
    </div>
  );
}

/** Compact card for List View: Date, Time, Company, Position + status badge */
function ListShiftCard({
  shift,
  dict,
  fullDict,
  lang,
  user,
  userRole,
  verificationStatus,
}: {
  shift: Shift;
  dict: DayShiftListProps['dict'];
  fullDict?: any;
  lang?: string;
  user?: User;
  userRole?: string;
  verificationStatus?: string | null;
}) {
  const companyName = shift.profiles?.company_details?.company_name || 'Unknown Company';
  const companyLogo = shift.profiles?.company_details?.logo_url || null;
  const companyInitials = companyName.substring(0, 2).toUpperCase();
  const status = (shift.applicationStatus || '').toLowerCase();
  const isAccepted = status === 'accepted' || status === 'approved';
  const statusLabel = isAccepted ? (dict.statusAccepted ?? 'Accepted') : (dict.statusPending ?? 'Pending');
  const styles = getStatusStyles(shift.applicationStatus);
  const dateStr = format(new Date(shift.start_time), 'EEE d. MMM', { locale: da });

  const shiftForDialog = {
    ...shift,
    description: shift.description || null,
    category: shift.category || 'general',
    break_minutes: shift.break_minutes || 0,
    is_break_paid: shift.is_break_paid || false,
    vacancies_total: shift.vacancies_total || 1,
    vacancies_taken: shift.vacancies_taken || 0,
    status: shift.status || 'published',
    company_id: shift.company_id || '',
    is_urgent: shift.is_urgent || false,
    possible_overtime: shift.possible_overtime || false,
    must_bring: shift.must_bring || null,
  };

  const cardContent = (
    <Card className={`cursor-pointer hover:shadow-md transition-all border ${styles.card}`}>
      <CardHeader className="py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={companyLogo || undefined} alt={companyName} />
              <AvatarFallback>{companyInitials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base">{shift.title}</CardTitle>
              <CardDescription className="flex items-center gap-1 mt-0.5">
                <Building2 className="h-3 w-3 shrink-0" />
                {companyName}
              </CardDescription>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {dateStr} · {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                </span>
              </div>
            </div>
          </div>
          <Badge variant="outline" className={`shrink-0 ${styles.badge}`}>
            {statusLabel}
          </Badge>
        </div>
      </CardHeader>
    </Card>
  );

  if (fullDict && lang && user) {
    return (
      <JobDetailsDialog
        shift={shiftForDialog}
        isApplied={true}
        userRole={userRole || 'worker'}
        user={user}
        dict={fullDict}
        lang={lang}
        applicationStatus={shift.applicationStatus || undefined}
        verificationStatus={verificationStatus}
      >
        {cardContent}
      </JobDetailsDialog>
    );
  }

  return cardContent;
}

/** Full detail card for Detail View - opens JobDetailsDialog */
function DetailShiftCard({
  shift,
  dict,
  fullDict,
  lang,
  user,
  userRole,
  verificationStatus,
}: {
  shift: Shift;
  dict: DayShiftListProps['dict'];
  fullDict?: any;
  lang?: string;
  user?: User;
  userRole?: string;
  verificationStatus?: string | null;
}) {
  const companyName = shift.profiles?.company_details?.company_name || 'Unknown Company';
  const companyLogo = shift.profiles?.company_details?.logo_url || null;
  const companyInitials = companyName.substring(0, 2).toUpperCase();
  const status = (shift.applicationStatus || '').toLowerCase();
  const isAccepted = status === 'accepted' || status === 'approved';
  const statusLabel = isAccepted ? (dict.statusAccepted ?? 'Accepted') : (dict.statusPending ?? 'Pending');
  const styles = getStatusStyles(shift.applicationStatus);

  const shiftForDialog = {
    ...shift,
    description: shift.description || null,
    category: shift.category || 'general',
    break_minutes: shift.break_minutes || 0,
    is_break_paid: shift.is_break_paid || false,
    vacancies_total: shift.vacancies_total || 1,
    vacancies_taken: shift.vacancies_taken || 0,
    status: shift.status || 'published',
    company_id: shift.company_id || '',
    is_urgent: shift.is_urgent || false,
    possible_overtime: shift.possible_overtime || false,
    must_bring: shift.must_bring || null,
  };

  const cardContent = (
    <Card className={`cursor-pointer hover:shadow-lg transition-all border ${styles.card}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4 flex-1">
            <Avatar className="h-14 w-14">
              <AvatarImage src={companyLogo || undefined} alt={companyName} />
              <AvatarFallback>{companyInitials}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-xl">{shift.title}</CardTitle>
                <Badge variant="outline" className={styles.badge}>
                  {statusLabel}
                </Badge>
              </div>
              <CardDescription className="flex items-center gap-1 mt-1">
                <Building2 className="h-4 w-4" />
                {companyName}
              </CardDescription>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-emerald-700">{shift.hourly_rate} DKK/h</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>
              <span className="font-medium">{dict.time}:</span>{' '}
              {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>
              <span className="font-medium">{dict.address}:</span>{' '}
              {shift.locations?.address || dict.locationNotSpecified}
            </span>
          </div>
          {shift.locations?.name && (
            <div className="text-muted-foreground ml-6">{shift.locations.name}</div>
          )}
        </div>
        {fullDict?.jobBoard?.viewDetails && (
          <p className="text-sm text-muted-foreground pt-2 border-t">
            {fullDict.jobBoard.viewDetails}
          </p>
        )}
      </CardContent>
    </Card>
  );

  if (fullDict && lang && user) {
    return (
      <JobDetailsDialog
        shift={shiftForDialog}
        isApplied={true}
        userRole={userRole || 'worker'}
        user={user}
        dict={fullDict}
        lang={lang}
        applicationStatus={shift.applicationStatus || undefined}
        verificationStatus={verificationStatus}
      >
        {cardContent}
      </JobDetailsDialog>
    );
  }

  return cardContent;
}
