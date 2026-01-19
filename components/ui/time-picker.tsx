'use client';

import * as React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface TimePickerProps {
  value?: string; // Format: "HH:mm"
  onChange?: (value: string) => void;
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

export function TimePicker({
  value,
  onChange,
  disabled = false,
  required = false,
  className,
  id,
}: TimePickerProps) {
  // Parse the time string into hour and minute parts
  const parseValue = (timeString?: string) => {
    if (!timeString) {
      return { hour: '09', minute: '00' };
    }
    
    const [h, m] = timeString.split(':');
    const hour = h?.padStart(2, '0') || '09';
    const minute = m?.padStart(2, '0') || '00';
    
    // Round minute to nearest 10
    const roundedMinute = minutes.reduce((prev, curr) => {
      return Math.abs(parseInt(curr) - parseInt(minute)) < Math.abs(parseInt(prev) - parseInt(minute))
        ? curr
        : prev;
    });
    
    return { hour, minute: roundedMinute };
  };

  const parsed = parseValue(value);
  const [hour, setHour] = React.useState(parsed.hour);
  const [minute, setMinute] = React.useState(parsed.minute);

  // Update local state when value prop changes
  React.useEffect(() => {
    const newParsed = parseValue(value);
    setHour(newParsed.hour);
    setMinute(newParsed.minute);
  }, [value]);

  // Construct time string from parts and call onChange
  const updateValue = (newHour: string, newMinute: string) => {
    if (!newHour || !newMinute) return;
    
    // Construct time string: HH:mm
    const timeString = `${newHour}:${newMinute}`;
    
    if (onChange) {
      onChange(timeString);
    }
  };

  const handleHourChange = (newHour: string) => {
    setHour(newHour);
    updateValue(newHour, minute);
  };

  const handleMinuteChange = (newMinute: string) => {
    setMinute(newMinute);
    updateValue(hour, newMinute);
  };

  return (
    <div className={cn('grid grid-cols-2 gap-2', className)} id={id}>
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
  );
}
