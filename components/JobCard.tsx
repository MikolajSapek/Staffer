'use client';

import React from 'react';
import { format, differenceInMinutes } from 'date-fns';
import { da } from 'date-fns/locale/da';
import { MapPin, Clock, Building2, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Shift {
  id: string;
  title: string;
  hourly_rate: number;
  start_time: string;
  end_time: string;
  vacancies_total: number;
  vacancies_taken: number;
  status: string;
  company_id: string;
  locations: { name: string; address: string } | null;
  profiles: {
    company_details: {
      company_name: string;
      logo_url: string | null;
    } | null;
  } | null;
}

interface JobCardProps {
  shift: Shift;
  onApply: (shift: Shift) => void;
  hasApplied: boolean;
  userRole: string;
  dict: any;
  lang: string;
  applicationStatus?: string;
  getStatusBadge?: (shiftId: string) => React.ReactNode;
}

export function JobCard({ shift, onApply, hasApplied, userRole, dict, lang, applicationStatus, getStatusBadge }: JobCardProps) {
  const isFullyBooked = shift.vacancies_taken >= shift.vacancies_total || shift.status === 'full';
  const canApply = userRole === 'worker' && !hasApplied && !isFullyBooked;

  const start = new Date(shift.start_time);
  const end = new Date(shift.end_time);
  const durationHours = differenceInMinutes(end, start) / 60;
  const totalPay = Math.round(durationHours * shift.hourly_rate);

  const dateFormatted = format(start, 'dd/MM', { locale: da });
  const timeFormatted = `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`;

  const companyName = shift.profiles?.company_details?.company_name || 'Company';
  const locationName = shift.locations?.name || shift.locations?.address || dict.jobBoard.locationNotSpecified;
  const logoUrl = shift.profiles?.company_details?.logo_url;

  return (
    <Card className="flex flex-col overflow-hidden transition-all hover:shadow-md border border-gray-100 bg-white">
      {/* HEADER */}
      <div className="p-4 pb-2 flex justify-between items-start gap-3">
        <div className="flex gap-3 items-center">
          <div className="h-10 w-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
            {logoUrl ? (
              <img src={logoUrl} alt={companyName} className="h-full w-full object-cover" />
            ) : (
              <Building2 className="h-5 w-5 text-gray-400" />
            )}
          </div>
          <div>
            <div className="text-xs text-gray-500 font-medium mb-0.5">{companyName}</div>
            <h3 className="text-base font-bold text-gray-900 leading-tight">{shift.title}</h3>
          </div>
        </div>
        
        {hasApplied && getStatusBadge && getStatusBadge(shift.id)}
        {hasApplied && !getStatusBadge && <Badge className="bg-blue-600 text-xs px-2 py-0.5">Applied</Badge>}
        {isFullyBooked && !hasApplied && <Badge variant="outline" className="text-gray-500 text-xs">Full</Badge>}
      </div>

      {/* DETAILS GRID */}
      <div className="px-4 py-2 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
          <span className="font-medium text-gray-700">{dateFormatted}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-400 shrink-0" />
          <span>{timeFormatted}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center text-gray-400 text-[10px] font-bold border rounded-full border-gray-400 w-4 h-4 shrink-0">kr</div>
          <span>{shift.hourly_rate} kr/h</span>
        </div>
        <div className="flex items-center gap-2 col-span-2 sm:col-span-1 truncate">
          <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
          <span className="truncate">{locationName}</span>
        </div>
      </div>

      {/* FOOTER ACTION */}
      <div className="mt-auto p-4 pt-2 border-t border-gray-100 flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-xs text-gray-500">Total Pay</span>
          <span className="text-lg font-bold text-red-600">{totalPay} kr</span>
        </div>
        <div className="flex-1 max-w-[200px]">
          {isFullyBooked ? (
            <Badge variant="outline" className="w-full justify-center">
              {dict.jobBoard.fullyBooked}
            </Badge>
          ) : canApply ? (
            <Button
              onClick={() => onApply(shift)}
              className="w-full"
            >
              {dict.jobBoard.apply}
            </Button>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                window.location.href = `/${lang}/login`;
              }}
            >
              {dict.jobBoard.loginToApply}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

