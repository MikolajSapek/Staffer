'use client';

import { isSameDay } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { formatTime, formatDateLong } from '@/lib/date-utils';
import { Clock, MapPin, Building2 } from 'lucide-react';

interface Shift {
  id: string;
  start_time: string;
  end_time: string;
  title: string;
  hourly_rate: number;
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
}

export default function DayShiftList({
  shifts,
  selectedDate,
  dict,
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
          <ShiftCard key={shift.id} shift={shift} dict={dict} />
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
        <ShiftCard key={shift.id} shift={shift} dict={dict} />
      ))}
    </div>
  );
}

function ShiftCard({ shift, dict }: { shift: Shift; dict: DayShiftListProps['dict'] }) {
  const companyName = shift.profiles?.company_details?.company_name || 'Unknown Company';
  const companyLogo = shift.profiles?.company_details?.logo_url || null;
  const companyInitials = companyName.substring(0, 2).toUpperCase();

  return (
    <Card>
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


