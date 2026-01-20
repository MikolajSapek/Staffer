'use client';

import { isSameDay } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { formatTime, formatDateLong } from '@/lib/date-utils';
import { Clock, MapPin, Building2 } from 'lucide-react';
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
    shiftDetails: string;
    time: string;
    address: string;
    locationNotSpecified: string;
  };
  fullDict?: any;
  lang?: string;
  user?: User;
  userRole?: string;
  verificationStatus?: string | null;
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
  if (!selectedDate) {
    // Show upcoming shifts (next 3)
    const upcomingShifts = shifts
      .filter((shift) => new Date(shift.start_time) >= new Date())
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      .slice(0, 3);

    if (upcomingShifts.length === 0) {
      return (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {dict.noShiftsOnDate}
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Upcoming Shifts</h3>
        {upcomingShifts.map((shift) => (
          <ShiftCard 
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
    );
  }

  // Filter shifts for selected date
  const shiftsForDate = shifts.filter((shift) => {
    const shiftDate = new Date(shift.start_time);
    return isSameDay(shiftDate, selectedDate);
  });

  if (shiftsForDate.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            {dict.noShiftsOnDate}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">
        {formatDateLong(selectedDate.toISOString())}
      </h3>
      {shiftsForDate.map((shift) => (
        <ShiftCard 
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
  );
}

function ShiftCard({ 
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

  // Convert shift to format expected by JobDetailsDialog
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

  // If we don't have the required props for JobDetailsDialog, render simple card
  if (!fullDict || !lang || !user) {
    return (
      <Card className="cursor-pointer hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <Avatar className="h-12 w-12">
                <AvatarImage src={companyLogo || undefined} alt={companyName} />
                <AvatarFallback>{companyInitials}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <CardTitle>{shift.title}</CardTitle>
                <CardDescription className="flex items-center gap-1 mt-1">
                  <Building2 className="h-3 w-3" />
                  {companyName}
                </CardDescription>
              </div>
            </div>
            <Badge variant="secondary">
              {shift.hourly_rate} DKK/t
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                <span className="font-medium">{dict.time}:</span>{' '}
                {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>
                <span className="font-medium">{dict.address}:</span>{' '}
                {shift.locations?.address || dict.locationNotSpecified}
              </span>
            </div>
            {shift.locations?.name && (
              <div className="text-muted-foreground ml-6">
                {shift.locations.name}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <JobDetailsDialog
      shift={shiftForDialog}
      isApplied={true}
      userRole={userRole || 'worker'}
      user={user}
      dict={fullDict}
      lang={lang}
      applicationStatus="accepted"
      verificationStatus={verificationStatus}
    >
      <Card className="cursor-pointer hover:shadow-md transition-shadow hover:border-primary/50">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <Avatar className="h-12 w-12">
                <AvatarImage src={companyLogo || undefined} alt={companyName} />
                <AvatarFallback>{companyInitials}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <CardTitle>{shift.title}</CardTitle>
                <CardDescription className="flex items-center gap-1 mt-1">
                  <Building2 className="h-3 w-3" />
                  {companyName}
                </CardDescription>
              </div>
            </div>
            <Badge variant="secondary">
              {shift.hourly_rate} DKK/t
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                <span className="font-medium">{dict.time}:</span>{' '}
                {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>
                <span className="font-medium">{dict.address}:</span>{' '}
                {shift.locations?.address || dict.locationNotSpecified}
              </span>
            </div>
            {shift.locations?.name && (
              <div className="text-muted-foreground ml-6">
                {shift.locations.name}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </JobDetailsDialog>
  );
}


