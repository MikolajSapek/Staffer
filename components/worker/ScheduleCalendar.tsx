'use client';

import { useState } from 'react';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay, isSameMonth, addMonths, subMonths, getDay } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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

interface ScheduleCalendarProps {
  shifts: Shift[];
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  dict: {
    selectDate: string;
  };
}

export default function ScheduleCalendar({
  shifts,
  selectedDate,
  onDateSelect,
  dict,
}: ScheduleCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get first day of week (0 = Sunday, 1 = Monday, etc.)
  const firstDayOfWeek = getDay(monthStart);
  // Adjust for Monday as first day (0 = Monday)
  const adjustedFirstDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  // Create array with empty cells for days before month starts
  const emptyCells = Array.from({ length: adjustedFirstDay }, (_, i) => i);

  const hasShiftOnDate = (date: Date) => {
    return shifts.some((shift) => {
      const shiftDate = new Date(shift.start_time);
      return isSameDay(shiftDate, date);
    });
  };

  const getShiftsForDate = (date: Date) => {
    return shifts.filter((shift) => {
      const shiftDate = new Date(shift.start_time);
      return isSameDay(shiftDate, date);
    });
  };

  const getShiftStatusForDate = (date: Date): 'past' | 'future' | null => {
    const shiftsOnDate = getShiftsForDate(date);
    if (shiftsOnDate.length === 0) return null;

    const now = new Date();
    // Check if any shift is past (end_time < now)
    const hasPastShift = shiftsOnDate.some((shift) => {
      const endTime = new Date(shift.end_time);
      return endTime < now;
    });

    // Check if any shift is future (start_time >= now)
    const hasFutureShift = shiftsOnDate.some((shift) => {
      const startTime = new Date(shift.start_time);
      return startTime >= now;
    });

    // Prioritize past if there's any past shift, otherwise future
    return hasPastShift ? 'past' : hasFutureShift ? 'future' : null;
  };

  const handlePreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="w-full">
      {/* Header with month navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="outline"
          size="icon"
          onClick={handlePreviousMonth}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-semibold">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
        <Button
          variant="outline"
          size="icon"
          onClick={handleNextMonth}
          className="h-8 w-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="border rounded-lg overflow-hidden">
        {/* Week day headers */}
        <div className="grid grid-cols-7 bg-muted/50">
          {weekDays.map((day) => (
            <div
              key={day}
              className="p-2 text-center text-sm font-medium text-muted-foreground"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 p-1">
          {/* Empty cells for days before month starts */}
          {emptyCells.map((_, index) => (
            <div key={`empty-${index}`} className="aspect-square" />
          ))}

          {/* Days of the month */}
          {daysInMonth.map((day) => {
            const hasShift = hasShiftOnDate(day);
            const shiftStatus = getShiftStatusForDate(day);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());

            const shiftBgColor = shiftStatus === 'past' ? 'bg-emerald-500' : shiftStatus === 'future' ? 'bg-blue-500' : '';

            return (
              <button
                key={day.toISOString()}
                onClick={() => onDateSelect(day)}
                className={cn(
                  'aspect-square text-sm transition-colors relative flex items-center justify-center border border-border',
                  !isSameMonth(day, currentDate) && 'text-muted-foreground/50',
                  !hasShift && 'hover:bg-muted/30',
                  isSelected && 'border-2 border-primary',
                  isToday && !isSelected && !hasShift && 'ring-1 ring-inset ring-gray-200'
                )}
              >
                {hasShift ? (
                  <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center font-bold text-white',
                    shiftBgColor
                  )}>
                    {format(day, 'd')}
                  </div>
                ) : (
                  <span
                    className={cn(
                      'text-sm',
                      isSelected && 'font-bold',
                      isToday && !isSelected && 'font-semibold'
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {!selectedDate && (
        <p className="text-sm text-muted-foreground mt-4 text-center">
          {dict.selectDate}
        </p>
      )}
    </div>
  );
}


