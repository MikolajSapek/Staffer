'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { formatTime, formatDateShort } from '@/lib/date-utils';
import { ArrowLeft, Mail, Phone, Users } from 'lucide-react';
import Link from 'next/link';

interface WorkerDetails {
  avatar_url: string | null;
  phone_number: string | null;
}

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  worker_details?: WorkerDetails | null;
}

interface Application {
  id: string;
  status: string;
  applied_at: string;
  worker_message: string | null;
  profiles: Profile | null;
}

interface Location {
  id: string;
  name: string;
  address: string;
}

interface Shift {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  hourly_rate: number;
  vacancies_total: number;
  vacancies_taken: number;
  status: string;
  category: string;
  locations: Location | null;
  shift_applications?: Application[];
}

interface ShiftDetailsClientProps {
  shift: Shift;
  hiredTeam: Application[];
  lang: string;
  dict: any;
}

export default function ShiftDetailsClient({
  shift,
  hiredTeam,
  lang,
  dict,
}: ShiftDetailsClientProps) {
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
      published: dict.status?.active || 'Active',
      full: dict.status?.fullyBooked || 'Fully Booked',
      completed: dict.status?.completed || 'Completed',
      cancelled: dict.status?.cancelled || 'Cancelled',
    };
    return (
      <Badge variant={variants[status] || 'secondary'}>
        {labels[status] || status}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back Button */}
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href={`/${lang}/shifts`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {dict.companyShifts?.viewDetails || 'Back to Shifts'}
          </Link>
        </Button>
      </div>

      {/* Shift Header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-3xl mb-2">{shift.title}</CardTitle>
              <CardDescription className="text-base">
                {shift.locations?.name || dict.jobBoard?.locationNotSpecified || 'Location not specified'}
              </CardDescription>
            </div>
            {getStatusBadge(shift.status)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">
                {dict.dashboard?.date || 'Date'}
              </div>
              <div className="text-base">{formatDateShort(shift.start_time)}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">
                {dict.dashboard?.time || 'Time'}
              </div>
              <div className="text-base">
                {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">
                {dict.dashboard?.rate || 'Rate'}
              </div>
              <div className="text-base">{shift.hourly_rate} DKK/t</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">
                {dict.dashboard?.booked || 'Booked'}
              </div>
              <div className="text-base">
                {shift.vacancies_taken || 0} / {shift.vacancies_total}
              </div>
            </div>
          </div>

          {shift.description && (
            <div className="mt-6 pt-6 border-t">
              <div className="text-sm font-medium text-muted-foreground mb-2">
                Description
              </div>
              <p className="text-sm whitespace-pre-wrap">{shift.description}</p>
            </div>
          )}

          {shift.locations?.address && (
            <div className="mt-4">
              <div className="text-sm font-medium text-muted-foreground mb-1">
                Address
              </div>
              <p className="text-sm">{shift.locations.address}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hired Team Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <CardTitle>Hired Team</CardTitle>
          </div>
          <CardDescription>
            Workers approved for this shift
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hiredTeam.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">
                No workers hired yet
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                  <Card key={application.id} className="border">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        {/* Avatar */}
                        <Avatar className="h-16 w-16 flex-shrink-0">
                          <AvatarImage src={avatarUrl || undefined} alt={fullName} />
                          <AvatarFallback className="text-lg">{initials}</AvatarFallback>
                        </Avatar>

                        {/* Worker Info */}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-base mb-1 truncate">
                            {fullName}
                          </div>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            {profile.email && (
                              <div className="flex items-center gap-2 truncate">
                                <Mail className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">{profile.email}</span>
                              </div>
                            )}
                            {phoneNumber && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-3 w-3 flex-shrink-0" />
                                <span>{phoneNumber}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

