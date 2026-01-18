'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface DateTimePickerProps {
  value?: string; // ISO string format
  onChange?: (value: string) => void;
  min?: string; // ISO string format
  disabled?: boolean;
  required?: boolean;
  className?: string;
  id?: string;
}

// Generate hours array (00-23)
const hours = Array.from({ length: 24 }, (_, i) => 
  i.toString().padStart(2, '0')
);

// Generate minutes array with 10-minute intervals (00, 10, 20, 30, 40, 50)
const minutes = ['00', '10', '20', '30', '40', '50'];

export function DateTimePicker({
  value,
  onChange,
  min,
  disabled = false,
  required = false,
  className,
  id,
}: DateTimePickerProps) {
  // Parse the ISO string into date, hour, and minute parts
  const parseValue = (isoString?: string) => {
    if (!isoString) {
      return { date: '', hour: '09', minute: '00' };
    }
    
    const dateObj = new Date(isoString);
    const date = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD
    const hour = dateObj.getHours().toString().padStart(2, '0');
    const minute = dateObj.getMinutes().toString().padStart(2, '0');
    
    // Round minute to nearest 10
    const roundedMinute = minutes.reduce((prev, curr) => {
      return Math.abs(parseInt(curr) - parseInt(minute)) < Math.abs(parseInt(prev) - parseInt(minute))
        ? curr
        : prev;
    });
    
    return { date, hour, minute: roundedMinute };
  };

  const parsed = parseValue(value);
  const [date, setDate] = React.useState(parsed.date);
  const [hour, setHour] = React.useState(parsed.hour);
  const [minute, setMinute] = React.useState(parsed.minute);

  // Update local state when value prop changes
  React.useEffect(() => {
    const newParsed = parseValue(value);
    setDate(newParsed.date);
    setHour(newParsed.hour);
    setMinute(newParsed.minute);
  }, [value]);

  // Construct ISO string from parts and call onChange
  const updateValue = (newDate: string, newHour: string, newMinute: string) => {
    if (!newDate || !newHour || !newMinute) return;
    
    // Construct local datetime string: YYYY-MM-DDTHH:mm:00
    const isoString = `${newDate}T${newHour}:${newMinute}:00`;
    
    if (onChange) {
      onChange(isoString);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setDate(newDate);
    updateValue(newDate, hour, minute);
  };

  const handleHourChange = (newHour: string) => {
    setHour(newHour);
    updateValue(date, newHour, minute);
  };

  const handleMinuteChange = (newMinute: string) => {
    setMinute(newMinute);
    updateValue(date, hour, newMinute);
  };

  // Calculate min date for the date input
  const minDate = min ? new Date(min).toISOString().split('T')[0] : undefined;

  return (
    <div className={cn('grid gap-2', className)} id={id}>
      {/* Date input */}
      <Input
        type="date"
        value={date}
        onChange={handleDateChange}
        min={minDate}
        disabled={disabled}
        required={required}
        className="w-full"
      />
      
      {/* Time inputs (hour and minute) */}
      <div className="grid grid-cols-2 gap-2">
        {/* Hour select */}
        <Select
          value={hour}
          onValueChange={handleHourChange}
          disabled={disabled}
          required={required}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="HH" />
          </SelectTrigger>
          <SelectContent>
            {hours.map((h) => (
              <SelectItem key={h} value={h}>
                {h}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Minute select */}
        <Select
          value={minute}
          onValueChange={handleMinuteChange}
          disabled={disabled}
          required={required}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="MM" />
          </SelectTrigger>
          <SelectContent>
            {minutes.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
