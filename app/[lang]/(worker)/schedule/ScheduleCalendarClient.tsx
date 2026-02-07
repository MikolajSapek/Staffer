'use client';

import { useState } from 'react';
import ScheduleCalendar from '@/components/worker/ScheduleCalendar';
import DayShiftList from '@/components/worker/DayShiftList';
import { Button } from '@/components/ui/button';
import { List } from 'lucide-react';
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

interface ScheduleCalendarClientProps {
  shifts: Shift[];
  dict: any;
  lang: string;
  user: User;
  userRole: string;
  verificationStatus: string | null;
}

export default function ScheduleCalendarClient({
  shifts,
  dict,
  lang,
  user,
  userRole,
  verificationStatus,
}: ScheduleCalendarClientProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const handleShowAll = () => {
    setSelectedDate(null);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      {/* Left column: Calendar (col-span-4) */}
      <div className="lg:col-span-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{dict.workerCalendar.title}</h2>
          <Button
            variant={selectedDate ? 'secondary' : 'default'}
            size="sm"
            onClick={handleShowAll}
            className="shrink-0"
          >
            <List className="h-4 w-4 mr-1.5" />
            {dict.workerCalendar.showAllShifts}
          </Button>
        </div>
        <ScheduleCalendar
          shifts={shifts}
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          dict={dict.workerCalendar}
        />
      </div>

      {/* Right column: List or Detail view (col-span-8) */}
      <div className="lg:col-span-8">
        <DayShiftList
          shifts={shifts}
          selectedDate={selectedDate}
          dict={dict.workerCalendar}
          fullDict={dict}
          lang={lang}
          user={user}
          userRole={userRole}
          verificationStatus={verificationStatus}
        />
      </div>
    </div>
  );
}
