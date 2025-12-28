import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { da } from 'date-fns/locale/da';

export default async function JobBoardPage() {
  let user = null;
  let shifts: any[] = [];
  let error = null;

  try {
    const supabase = createClient();
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

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'HH:mm', { locale: da });
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'EEEE d. MMMM yyyy', { locale: da });
  };

  const availableSpots = (shift: any) => {
    return (shift.vacancies_total || 0) - (shift.vacancies_taken || 0);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Jobopslag</h1>
        <p className="text-muted-foreground">
          Find din næste vikarvagt her
        </p>
      </div>

      {error ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-red-600 mb-2">
              Der opstod en fejl ved indlæsning af jobopslag.
            </p>
            <p className="text-sm text-muted-foreground">
              Prøv at opdatere siden eller kontakt support hvis problemet fortsætter.
            </p>
          </CardContent>
        </Card>
      ) : !shifts || shifts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Der er ingen aktive jobopslag i øjeblikket.
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
                  {shift.locations?.name || 'Lokation ikke angivet'}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Dato:</span>{' '}
                    {formatDate(shift.start_time)}
                  </div>
                  <div>
                    <span className="font-medium">Tid:</span>{' '}
                    {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                  </div>
                  <div>
                    <span className="font-medium">Adresse:</span>{' '}
                    {shift.locations?.address || 'Ikke angivet'}
                  </div>
                  <div>
                    <span className="font-medium">Ledige pladser:</span>{' '}
                    {availableSpots(shift)} / {shift.vacancies_total}
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                {!user ? (
                  <Button asChild className="w-full">
                    <Link href="/login">Log ind for at ansøge</Link>
                  </Button>
                ) : (
                  <Button asChild className="w-full" disabled={availableSpots(shift) === 0}>
                    <Link href={`/shifts/${shift.id}/apply`}>
                      {availableSpots(shift) === 0 ? 'Fuldt booket' : 'Ansøg nu'}
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

