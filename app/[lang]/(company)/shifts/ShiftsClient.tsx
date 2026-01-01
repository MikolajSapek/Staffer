'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { createClient } from '@/utils/supabase/client';
import { Loader2, Calendar, MapPin } from 'lucide-react';
import { formatTime, formatDateShort } from '@/lib/date-utils';
import Link from 'next/link';

interface Shift {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  hourly_rate: number;
  vacancies_total: number;
  vacancies_taken: number;
  status: 'published' | 'full' | 'completed' | 'cancelled';
  locations: {
    name: string;
    address: string;
  } | null;
}

interface ShiftsClientProps {
  dict: {
    title: string;
    description: string;
    activeShifts: string;
    archiveShifts: string;
    noActiveShifts: string;
    noArchiveShifts: string;
    loading: string;
    date: string;
    time: string;
    rate: string;
    booked: string;
    status: string;
    location: string;
    locationNotSpecified: string;
    viewDetails: string;
    edit: string;
    cancel: string;
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

export default function ShiftsClient({ dict, statusDict, lang }: ShiftsClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchShifts();
  }, []);

  const fetchShifts = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push(`/${lang}/login`);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('shifts')
        .select(`
          id,
          title,
          start_time,
          end_time,
          hourly_rate,
          vacancies_total,
          vacancies_taken,
          status,
          locations (
            name,
            address
          )
        `)
        .eq('company_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setShifts(data || []);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Could not fetch shifts';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, statusDict: {
    active: string;
    fullyBooked: string;
    completed: string;
    cancelled: string;
  }) => {
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

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">{dict.loading}</p>
          </div>
        </div>
      </div>
    );
  }

  // Separate active and archived shifts
  const activeShifts = shifts.filter(s => s.status !== 'completed' && s.status !== 'cancelled');
  const archiveShifts = shifts.filter(s => s.status === 'completed' || s.status === 'cancelled');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{dict.title}</h1>
        <p className="text-muted-foreground">
          {dict.description}
        </p>
      </div>

      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="py-4">
            <p className="text-red-800 text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Active Shifts Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">{dict.activeShifts}</h2>
        {activeShifts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">
                {dict.noActiveShifts}
              </p>
              <Button asChild>
                <Link href={`/${lang}/create-shift`}>
                  {dict.createNewShift}
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeShifts.map((shift) => (
              <Card key={shift.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-xl">{shift.title}</CardTitle>
                    {getStatusBadge(shift.status, statusDict)}
                  </div>
                  <CardDescription>
                    {shift.locations?.name || dict.locationNotSpecified}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">{dict.date}:</span>{' '}
                      {formatDateShort(shift.start_time)}
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
                      <span className="font-medium">{dict.booked}:</span>{' '}
                      {shift.vacancies_taken || 0} / {shift.vacancies_total}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Archive Shifts Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">{dict.archiveShifts}</h2>
        {archiveShifts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                {dict.noArchiveShifts}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {archiveShifts.map((shift) => (
              <Card key={shift.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-xl">{shift.title}</CardTitle>
                    {getStatusBadge(shift.status, statusDict)}
                  </div>
                  <CardDescription>
                    {shift.locations?.name || dict.locationNotSpecified}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">{dict.date}:</span>{' '}
                      {formatDateShort(shift.start_time)}
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
                      <span className="font-medium">{dict.booked}:</span>{' '}
                      {shift.vacancies_taken || 0} / {shift.vacancies_total}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

