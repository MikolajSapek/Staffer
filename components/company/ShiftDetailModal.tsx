'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatTime, formatDateLong } from '@/lib/date-utils';
import { Users, Phone } from 'lucide-react';

interface Worker {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  avatar_url: string | null;
  phone_number: string | null;
}

interface Shift {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  hourly_rate: number;
  break_minutes: number;
  is_break_paid: boolean;
  possible_overtime: boolean;
  vacancies_total: number;
  vacancies_taken: number;
  status: string;
  locations: {
    name: string;
    address: string;
  } | null;
}

interface ShiftDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift: Shift | null;
  acceptedWorkers: Worker[];
  dict: {
    title: string;
    date: string;
    time: string;
    rate: string;
    address: string;
    location: string;
    locationNotSpecified: string;
    hiredTeam: string;
    noWorkersHired: string;
    booked: string;
  };
}

export default function ShiftDetailModal({
  open,
  onOpenChange,
  shift,
  acceptedWorkers,
  dict,
}: ShiftDetailModalProps) {
  if (!shift) return null;

  const getInitials = (firstName: string | null, lastName: string | null) => {
    const first = firstName?.charAt(0) || '';
    const last = lastName?.charAt(0) || '';
    return `${first}${last}`.toUpperCase() || '??';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{shift.title}</DialogTitle>
          <DialogDescription>
            Shift details, location, and hired team information
          </DialogDescription>
          <div className="text-sm text-muted-foreground">
            <Badge variant={shift.status === 'full' ? 'secondary' : 'default'}>
              {shift.status === 'full' ? 'Full' : 'Active'}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Shift Details */}
          <div className="space-y-2">
            <div>
              <span className="font-medium">{dict.date}:</span>{' '}
              {formatDateLong(shift.start_time)}
            </div>
            <div>
              <span className="font-medium">{dict.time}:</span>{' '}
              {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
            </div>
            <div>
              <span className="font-medium">{dict.rate}:</span>{' '}
              {shift.hourly_rate} DKK/t
            </div>
            <div>
              <span className="font-medium">{dict.location}:</span>{' '}
              {shift.locations?.name || dict.locationNotSpecified}
            </div>
            <div>
              <span className="font-medium">{dict.address}:</span>{' '}
              {shift.locations?.address || dict.locationNotSpecified}
            </div>
            <div>
              <span className="font-medium">{dict.booked}:</span>{' '}
              {shift.vacancies_taken} / {shift.vacancies_total}
            </div>
          </div>

          {/* Hired Team Section */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold">{dict.hiredTeam}</h3>
            </div>
            {acceptedWorkers.length === 0 ? (
              <p className="text-sm text-muted-foreground">{dict.noWorkersHired}</p>
            ) : (
              <div className="space-y-2">
                {acceptedWorkers.map((worker) => {
                  const firstName = worker.first_name || '';
                  const lastName = worker.last_name || '';
                  const fullName = `${firstName} ${lastName}`.trim() || 'Unknown';
                  let avatarUrl = worker.avatar_url || null;
                  
                  // Construct full Supabase Storage URL if avatar_url is just a filename
                  if (avatarUrl && !avatarUrl.startsWith('http://') && !avatarUrl.startsWith('https://')) {
                    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
                    if (supabaseUrl) {
                      if (avatarUrl.includes('/')) {
                        avatarUrl = `${supabaseUrl}/storage/v1/object/public/${avatarUrl}`;
                      } else {
                        avatarUrl = `${supabaseUrl}/storage/v1/object/public/avatars/${avatarUrl}`;
                      }
                    }
                  }
                  
                  const initials = getInitials(worker.first_name, worker.last_name);
                  const phoneNumber = worker.phone_number || null;

                  return (
                    <div
                      key={worker.id}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={avatarUrl || undefined} alt={fullName} />
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="font-medium">{fullName}</div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div>{worker.email}</div>
                          {phoneNumber && (
                            <a
                              href={`tel:${phoneNumber}`}
                              className="flex items-center gap-1 hover:text-primary transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Phone className="h-3 w-3" />
                              {phoneNumber}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

