'use client';

import React from 'react';
import { format, differenceInMinutes } from 'date-fns';
import { da } from 'date-fns/locale/da';
import { formatInTimeZone } from 'date-fns-tz';
import { MapPin, Clock, Building2, Calendar, Flame, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { JobDetailsDialog } from '@/components/JobDetailsDialog';
import CompanyProfileDialog from '@/components/CompanyProfileDialog';
import { getMapsLink } from '@/lib/utils';
import type { User } from '@supabase/supabase-js';

interface Shift {
  id: string;
  title: string;
  description: string | null;
  category: string;
  hourly_rate: number;
  start_time: string;
  end_time: string;
  break_minutes: number;
  is_break_paid: boolean;
  possible_overtime: boolean;
  vacancies_total: number;
  vacancies_taken: number;
  status: string;
  company_id: string;
  is_urgent: boolean;
  must_bring: string | null;
  locations: { name: string; address: string } | null;
  company?: { company_name?: string; logo_url?: string | null };
  profiles?: {
    company_details?: {
      company_name?: string;
      logo_url?: string | null;
    } | null;
  } | null;
}

interface JobCardProps {
  shift: Shift;
  onApply: (shift: Shift) => void;
  hasApplied: boolean;
  userRole: string;
  user: User | null;
  dict: any;
  lang: string;
  applicationStatus?: string | null; // e.g. 'pending', 'accepted', 'rejected'
  getStatusBadge?: (shiftId: string) => React.ReactNode;
  onApplySuccess?: () => void;
  verificationStatus?: string | null;
}

export function JobCard({
  shift,
  onApply,
  hasApplied,
  userRole,
  user,
  dict,
  lang,
  applicationStatus,
  getStatusBadge,
  onApplySuccess,
  verificationStatus,
}: JobCardProps) {
  const start = new Date(shift.start_time);
  const end = new Date(shift.end_time);
  const durationMinutes = differenceInMinutes(end, start);
  const unpaidBreak = !shift.is_break_paid ? (shift.break_minutes || 0) : 0;
  const totalPay = Math.round(((durationMinutes - unpaidBreak) / 60) * shift.hourly_rate);

  // Force Copenhagen display time
  const timeZone = 'Europe/Copenhagen';
  const dateFormatted = formatInTimeZone(start, timeZone, 'dd/MM', { locale: da });
  const startTimeFormatted = formatInTimeZone(start, timeZone, 'HH:mm', { locale: da });
  const endTimeFormatted = formatInTimeZone(end, timeZone, 'HH:mm', { locale: da });
  const timeFormatted = `${startTimeFormatted} - ${endTimeFormatted}`;

  const companyName = shift.company?.company_name ?? shift.profiles?.company_details?.company_name ?? 'Company';
  const locationName = shift.locations?.name || shift.locations?.address || dict.jobBoard.locationNotSpecified;
  const logoUrl = shift.company?.logo_url ?? shift.profiles?.company_details?.logo_url;

  return (
    <JobDetailsDialog
      shift={{ ...shift, profiles: shift.profiles ?? null }}
      isApplied={hasApplied}
      userRole={userRole}
      user={user}
      dict={dict}
      lang={lang}
      applicationStatus={applicationStatus}
      onApply={onApply}
      onApplySuccess={onApplySuccess}
      verificationStatus={verificationStatus}
    >
      <Card className="flex flex-col overflow-hidden transition-all hover:shadow-lg hover:border-gray-300 border border-gray-100 bg-white cursor-pointer">
      {/* HEADER */}
      <div className="p-4 pb-2 flex justify-between items-start gap-3">
        <div className="flex gap-3 items-start flex-1 min-w-0">
          <CompanyProfileDialog companyId={shift.company_id} lang={lang}>
            <div className="h-10 w-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity">
              {logoUrl ? (
                <img src={logoUrl} alt={companyName} className="h-full w-full object-cover" />
              ) : (
                <Building2 className="h-5 w-5 text-gray-400" />
              )}
            </div>
          </CompanyProfileDialog>
          <div className="flex-1 min-w-0">
            <CompanyProfileDialog companyId={shift.company_id} lang={lang}>
              <div className="text-xs text-gray-500 font-medium mb-0.5 cursor-pointer hover:underline transition-opacity">
                {companyName}
              </div>
            </CompanyProfileDialog>
            <h3 className="text-base font-bold text-gray-900 leading-tight">{shift.title}</h3>
            {shift.is_urgent && (
              <Badge className="bg-red-600 text-white font-bold flex items-center gap-1 shadow-sm mt-2 w-fit">
                <Flame className="h-3 w-3" />
                URGENT
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-2 shrink-0">
          {hasApplied && getStatusBadge && getStatusBadge(shift.id)}
          {hasApplied && !getStatusBadge && <Badge className="bg-blue-600 text-xs px-2 py-0.5">Applied</Badge>}
          {shift.vacancies_taken >= shift.vacancies_total && !hasApplied && (
            <Badge variant="outline" className="text-gray-500 text-xs">Full</Badge>
          )}
        </div>
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
        <a
          href={getMapsLink(shift.locations)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 col-span-2 sm:col-span-1 truncate text-gray-600 hover:text-blue-600 hover:underline transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
          <span className="truncate">{locationName}</span>
        </a>
        <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
          <Users className="h-4 w-4 text-gray-400 shrink-0" />
          <span className="text-gray-600">
            {shift.vacancies_total} {shift.vacancies_total === 1 ? 'person' : 'persons'} needed
          </span>
        </div>
      </div>

      {/* FOOTER - Summary Only */}
      <div className="mt-auto p-4 pt-2 border-t border-gray-50 bg-gray-50/50">
        {/* Total Pay Display */}
        <div className="text-lg font-bold text-red-700">
          {totalPay} DKK
        </div>
      </div>
    </Card>
    </JobDetailsDialog>
  );
}

