'use client';

import { useState, useMemo } from 'react';
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

  const calendarData = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const firstDayOfWeek = getDay(monthStart);
    const adjustedFirstDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    const emptyCells = Array.from({ length: adjustedFirstDay }, (_, i) => i);
    
    return { monthStart, monthEnd, daysInMonth, emptyCells };
  }, [currentDate]);

  const shiftsByDate = useMemo(() => {
    const map = new Map<string, Shift[]>();
    shifts.forEach((shift) => {
      const shiftDate = new Date(shift.start_time);
      const dateKey = format(shiftDate, 'yyyy-MM-dd');
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(shift);
    });
    return map;
  }, [shifts]);

  const now = useMemo(() => new Date(), []);

  const hasShiftOnDate = useMemo(() => {
    return (date: Date) => {
      const dateKey = format(date, 'yyyy-MM-dd');
      return shiftsByDate.has(dateKey);
    };
  }, [shiftsByDate]);

  const getShiftStatusForDate = useMemo(() => {
    return (date: Date): 'past' | 'future' | null => {
      const dateKey = format(date, 'yyyy-MM-dd');
      const shiftsOnDate = shiftsByDate.get(dateKey) || [];
      if (shiftsOnDate.length === 0) return null;

      const hasPastShift = shiftsOnDate.some((shift) => {
        const endTime = new Date(shift.end_time);
        return endTime < now;
      });

      const hasFutureShift = shiftsOnDate.some((shift) => {
        const startTime = new Date(shift.start_time);
        return startTime >= now;
      });

      return hasPastShift ? 'past' : hasFutureShift ? 'future' : null;
    };
  }, [shiftsByDate, now]);

  const handlePreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="w-full">
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
          {format(calendarData.monthStart, 'MMMM yyyy')}
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

      <div className="border rounded-lg overflow-hidden">
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

        <div className="grid grid-cols-7 p-1">
          {calendarData.emptyCells.map((_, index) => (
            <div key={`empty-${index}`} className="aspect-square" />
          ))}

          {calendarData.daysInMonth.map((day) => {
            const hasShift = hasShiftOnDate(day);
            const shiftStatus = getShiftStatusForDate(day);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());
            const dayNumber = format(day, 'd');
            const shiftBgColor = shiftStatus === 'past' ? 'bg-emerald-500' : shiftStatus === 'future' ? 'bg-blue-500' : '';

            return (
              <button
                key={day.toISOString()}
                onClick={() => onDateSelect(day)}
                className={cn(
                  'aspect-square text-sm transition-colors relative flex items-center justify-center border border-border',
                  !isSameMonth(day, calendarData.monthStart) && 'text-muted-foreground/50',
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
                    {dayNumber}
                  </div>
                ) : (
                  <span
                    className={cn(
                      'text-sm',
                      isSelected && 'font-bold',
                      isToday && !isSelected && 'font-semibold'
                    )}
                  >
                    {dayNumber}
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
