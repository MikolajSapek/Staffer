import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatTime, formatDateLong } from '@/lib/date-utils';
import { getDictionary } from './dictionaries';

export const dynamic = 'force-dynamic';

export default async function JobBoardPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang as 'en-US' | 'da');
  let user = null;
  let shifts: any[] = [];

  try {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    user = userData?.user || null;

    // Fetch active shifts - this should work for public access
    // Wrap in try-catch to handle any errors gracefully
    try {
      const { data: shiftsData, error: shiftsError } = await supabase
        .from('shifts')
        .select(`
          id,
          title,
          hourly_rate,
          start_time,
          end_time,
          vacancies_total,
          vacancies_taken,
          status,
          locations (
            name,
            address
          )
        `)
        .eq('status', 'published')
        .order('start_time', { ascending: true });

      if (shiftsError) {
        console.warn('Error fetching shifts:', {
          message: shiftsError.message,
          details: shiftsError.details,
          hint: shiftsError.hint,
          code: shiftsError.code
        });
        // Set shifts to empty array instead of crashing
        shifts = [];
      } else {
        shifts = shiftsData || [];
      }
    } catch (fetchError: any) {
      console.warn('Error in shifts query:', {
        message: fetchError?.message,
        name: fetchError?.name
      });
      // Set shifts to empty array instead of crashing
      shifts = [];
    }
  } catch (err: any) {
    console.warn('Unexpected error in JobBoardPage:', {
      message: err?.message,
      name: err?.name,
      stack: err?.stack
    });
    // Don't set error - just use empty shifts array
    shifts = [];
  }


  const availableSpots = (shift: any) => {
    return (shift.vacancies_total || 0) - (shift.vacancies_taken || 0);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{dict.jobBoard.title}</h1>
        <p className="text-muted-foreground">
          {dict.jobBoard.subtitle}
        </p>
      </div>

      {!shifts || shifts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {dict.jobBoard.noJobs}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {shifts.map((shift) => (
            <Card key={shift.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-xl">{shift.title}</CardTitle>
                  <Badge variant="secondary">
                    {shift.hourly_rate} DKK/t
                  </Badge>
                </div>
                <CardDescription>
                  {shift.locations?.name || dict.jobBoard.locationNotSpecified}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">{dict.jobBoard.date}:</span>{' '}
                    {formatDateLong(shift.start_time)}
                  </div>
                  <div>
                    <span className="font-medium">{dict.jobBoard.time}:</span>{' '}
                    {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                  </div>
                  <div>
                    <span className="font-medium">{dict.jobBoard.address}:</span>{' '}
                    {shift.locations?.address || dict.jobBoard.notSpecified}
                  </div>
                  <div>
                    <span className="font-medium">{dict.jobBoard.availableSpots}:</span>{' '}
                    {availableSpots(shift)} / {shift.vacancies_total}
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                {!user ? (
                  <Button asChild className="w-full">
                    <Link href={`/${lang}/login`}>{dict.jobBoard.loginToApply}</Link>
                  </Button>
                ) : (
                  <Button asChild className="w-full" disabled={availableSpots(shift) === 0}>
                    <Link href={`/${lang}/shifts/${shift.id}/apply`}>
                      {availableSpots(shift) === 0 ? dict.jobBoard.fullyBooked : dict.jobBoard.apply}
                    </Link>
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

