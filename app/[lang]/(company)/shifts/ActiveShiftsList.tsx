'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { formatTime, formatDateShort } from '@/lib/date-utils';
import { Calendar, Users, Phone, MapPin, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface WorkerDetails {
  avatar_url: string | null;
  phone_number: string | null;
}

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  worker_details?: WorkerDetails | null;
}

interface Application {
  id: string;
  status: string;
  profiles: Profile | null;
}

interface Location {
  name: string;
  address: string;
}

interface Shift {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  hourly_rate: number;
  vacancies_total: number;
  vacancies_taken: number;
  status: string;
  locations: Location | null;
  shift_applications?: Application[];
}

interface ActiveShiftsListProps {
  shifts: Shift[];
  dict: {
    title: string;
    description: string;
    activeShifts: string;
    noActiveShifts: string;
    date: string;
    time: string;
    rate: string;
    booked: string;
    location: string;
    locationNotSpecified: string;
    createNewShift: string;
  };
  statusDict: {
    active: string;
    fullyBooked: string;
    completed: string;
    cancelled: string;
  };
  lang: string;
}

export default function ActiveShiftsList({
  shifts,
  dict,
  statusDict,
  lang,
}: ActiveShiftsListProps) {
  const [expandedShift, setExpandedShift] = useState<string | null>(null);

  // Helper to extract worker_details (as object)
  const getWorkerDetails = (profile: Profile | null): WorkerDetails | null => {
    if (!profile?.worker_details) return null;
    // worker_details is returned as an object, not an array
    return profile.worker_details as WorkerDetails;
  };

  // Helper to get status badge
  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      published: 'default',
      full: 'secondary',
      completed: 'outline',
      cancelled: 'destructive',
    };
    const labels: Record<string, string> = {
      published: statusDict.active,
      full: statusDict.fullyBooked,
      completed: statusDict.completed,
      cancelled: statusDict.cancelled,
    };
    return (
      <Badge variant={variants[status] || 'secondary'}>
        {labels[status] || status}
      </Badge>
    );
  };

  // Filter to only accepted applications (hired team)
  const getHiredTeam = (shift: Shift): Application[] => {
    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log('Shift:', shift.id, shift.title);
      console.log('All Applications:', shift.shift_applications);
      if (shift.shift_applications && shift.shift_applications.length > 0) {
        console.log('First Application:', shift.shift_applications[0]);
        console.log('First App Profiles:', shift.shift_applications[0]?.profiles);
        console.log('First App Worker Details:', shift.shift_applications[0]?.profiles?.worker_details);
      }
    }

    return (shift.shift_applications || []).filter(
      (app) => app.status === 'accepted'
    );
  };

  const toggleShift = (shiftId: string) => {
    setExpandedShift(expandedShift === shiftId ? null : shiftId);
  };

  if (shifts.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{dict.title}</h1>
          <p className="text-muted-foreground">{dict.description}</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">{dict.noActiveShifts}</p>
            <Button asChild>
              <Link href={`/${lang}/create-shift`}>{dict.createNewShift}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{dict.title}</h1>
        <p className="text-muted-foreground">{dict.description}</p>
      </div>

      <div className="w-full space-y-2">
        {shifts.map((shift) => {
          const hiredTeam = getHiredTeam(shift);
          const capacityText = `${hiredTeam.length}/${shift.vacancies_total} Hired`;
          const isExpanded = expandedShift === shift.id;

          return (
            <div key={shift.id} className="border rounded-lg bg-card">
              <button
                onClick={() => toggleShift(shift.id)}
                className="w-full px-4 py-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex flex-1 items-center justify-between">
                  <div className="flex flex-1 items-center gap-4 min-w-0">
                    {/* Shift Title */}
                    <div className="flex-1 min-w-0 text-left">
                      <div className="font-semibold text-lg truncate">{shift.title}</div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDateShort(shift.start_time)}
                        </span>
                        <span>
                          {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                        </span>
                        {shift.locations?.name && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {shift.locations.name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Hired Team Avatars and Capacity */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {/* Hired Team Avatars */}
                      {hiredTeam.length > 0 && (
                        <div className="flex items-center gap-1 -space-x-2">
                          {hiredTeam.slice(0, 4).map((application) => {
                            const profile = application.profiles;
                            if (!profile) return null;
                            
                            const workerDetails = getWorkerDetails(profile);
                            const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown Worker';
                            const initials = profile.first_name && profile.last_name
                              ? `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`.toUpperCase()
                              : '??';
                            const avatarUrl = workerDetails?.avatar_url || null;

                            return (
                              <Avatar key={application.id} className="h-8 w-8 border-2 border-background">
                                <AvatarImage src={avatarUrl || undefined} alt={fullName} />
                                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                              </Avatar>
                            );
                          })}
                          {hiredTeam.length > 4 && (
                            <div className="h-8 w-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs font-medium">
                              +{hiredTeam.length - 4}
                            </div>
                          )}
                        </div>
                      )}
                      <div className="text-sm font-medium text-muted-foreground">
                        {capacityText}
                      </div>
                      {getStatusBadge(shift.status)}
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 shrink-0 transition-transform duration-200',
                          isExpanded && 'rotate-180'
                        )}
                      />
                    </div>
                  </div>
                </div>
              </button>
              <div
                className={cn(
                  'overflow-hidden transition-all duration-200',
                  isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                )}
              >
                <div className="px-4 pt-2 pb-4">
                  {/* Shift Details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-sm">
                    <div>
                      <div className="font-medium text-muted-foreground mb-1">{dict.rate}</div>
                      <div>{shift.hourly_rate} DKK/t</div>
                    </div>
                    {shift.locations?.address && (
                      <div className="col-span-2">
                        <div className="font-medium text-muted-foreground mb-1">Address</div>
                        <div>{shift.locations.address}</div>
                      </div>
                    )}
                  </div>

                  {/* Hired Team Section */}
                  <div className="border-t pt-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-semibold">Hired Team</h3>
                    </div>
                    {hiredTeam.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No workers assigned yet</p>
                      </div>
                    ) : (
                      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {hiredTeam.map((application) => {
                          const profile = application.profiles;
                          if (!profile) return null;

                          const workerDetails = getWorkerDetails(profile);
                          const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown Worker';
                          const initials = profile.first_name && profile.last_name
                            ? `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`.toUpperCase()
                            : '??';
                          const avatarUrl = workerDetails?.avatar_url || null;
                          const phoneNumber = workerDetails?.phone_number || null;

                          return (
                            <div
                              key={application.id}
                              className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                            >
                              {/* Avatar */}
                              <Avatar className="h-12 w-12 flex-shrink-0">
                                <AvatarImage src={avatarUrl || undefined} alt={fullName} />
                                <AvatarFallback>{initials}</AvatarFallback>
                              </Avatar>

                              {/* Worker Info */}
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{fullName}</div>
                                {phoneNumber && (
                                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                                    <Phone className="h-3 w-3" />
                                    <span>{phoneNumber}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

