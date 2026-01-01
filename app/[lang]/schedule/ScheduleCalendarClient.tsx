'use client';

import { useState } from 'react';
import ScheduleCalendar from '@/components/worker/ScheduleCalendar';
import DayShiftList from '@/components/worker/DayShiftList';

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
    last_name: string;
    company_details: {
      logo_url: string | null;
    }[] | null;
  } | null;
}

interface ScheduleCalendarClientProps {
  shifts: Shift[];
  dict: {
    selectDate: string;
    noShiftsOnDate: string;
    shiftDetails: string;
    time: string;
    address: string;
    locationNotSpecified: string;
  };
  lang: string;
}

export default function ScheduleCalendarClient({
  shifts,
  dict,
  lang,
}: ScheduleCalendarClientProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div>
        <ScheduleCalendar
          shifts={shifts}
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          dict={dict}
        />
      </div>
      <div>
        <DayShiftList
          shifts={shifts}
          selectedDate={selectedDate}
          dict={dict}
        />
      </div>
    </div>
  );
}

