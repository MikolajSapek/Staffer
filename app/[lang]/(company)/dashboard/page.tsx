import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus, Briefcase, Users, MapPin } from 'lucide-react';
import { formatTime, formatDateShort } from '@/lib/date-utils';
import { getDictionary } from '@/app/[lang]/dictionaries';

export default async function CompanyDashboardPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang as 'en-US' | 'da');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${lang}/login`);
  }

  // Get user profile to check role (layout already checks this, but double-check for safety)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'company') {
    redirect(`/${lang}`);
  }

  // Check if company has completed onboarding
  const { data: companyDetails } = await supabase
    .from('company_details')
    .select('company_name')
    .eq('profile_id', user.id)
    .maybeSingle();

  // If no company_details, redirect to company-setup
  if (!companyDetails) {
    redirect(`/${lang}/company-setup`);
  }

  // Fetch company's shifts
  const { data: shifts } = await supabase
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
    .order('created_at', { ascending: false })
    .limit(10);

  // Fetch stats
  const { count: activeShiftsCount } = await supabase
    .from('shifts')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', user.id)
    .in('status', ['published', 'full']);

  // Get all shift IDs for this company
  const { data: allShifts } = await supabase
    .from('shifts')
    .select('id')
    .eq('company_id', user.id);

  const shiftIds = allShifts?.map(s => s.id) || [];

  // Count total accepted applications
  const { count: totalHires } = await supabase
    .from('shift_applications')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'accepted')
    .in('shift_id', shiftIds.length > 0 ? shiftIds : ['00000000-0000-0000-0000-000000000000']);

  // Count locations
  const { count: locationsCount } = await supabase
    .from('locations')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', user.id);


  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      published: 'default',
      full: 'secondary',
      completed: 'outline',
      cancelled: 'destructive',
    };
    const labels: Record<string, string> = {
      published: dict.status.active,
      full: dict.status.fullyBooked,
      completed: dict.status.completed,
      cancelled: dict.status.cancelled,
    };
    return (
      <Badge variant={variants[status] || 'secondary'}>
        {labels[status] || status}
      </Badge>
    );
  };


  return (
    <div className="container mx-auto px-4 py-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {dict.dashboard.welcome}, {companyDetails.company_name}!
            </h1>
            <p className="text-muted-foreground">
              {dict.dashboard.commandCenter}
            </p>
          </div>
          <Button asChild size="lg">
            <Link href={`/${lang}/create-shift`}>
              <Plus className="mr-2 h-4 w-4" />
              {dict.dashboard.createJobListing}
            </Link>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {dict.dashboard.activeShifts}
              </CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeShiftsCount || 0}</div>
              <p className="text-xs text-muted-foreground">
                {dict.dashboard.publishedAndFullyBooked}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {dict.dashboard.totalHires}
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalHires || 0}</div>
              <p className="text-xs text-muted-foreground">
                {dict.dashboard.acceptedApplications}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {dict.dashboard.locations}
              </CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{locationsCount || 0}</div>
              <div className="text-xs text-muted-foreground">
                <Link href={`/${lang}/locations`} className="text-primary hover:underline">
                  {dict.dashboard.manageLocations}
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Shifts Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">{dict.dashboard.recentJobListings}</h2>
          <Button variant="outline" asChild>
            <Link href={`/${lang}/create-shift`}>
              <Plus className="mr-2 h-4 w-4" />
              {dict.dashboard.createShift}
            </Link>
          </Button>
        </div>

      {!shifts || shifts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              {dict.dashboard.noJobListings}
            </p>
            <Button asChild>
              <Link href={`/${lang}/create-shift`}>
                <Plus className="mr-2 h-4 w-4" />
                {dict.dashboard.createFirstJobListing}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {shifts.map((shift) => (
            <Card key={shift.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-xl">{shift.title}</CardTitle>
                  {getStatusBadge(shift.status)}
                </div>
                <CardDescription>
                  {shift.locations?.name || dict.jobBoard.locationNotSpecified}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">{dict.dashboard.date}:</span>{' '}
                    {formatDateShort(shift.start_time)}
                  </div>
                  <div>
                    <span className="font-medium">{dict.dashboard.time}:</span>{' '}
                    {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                  </div>
                  <div>
                    <span className="font-medium">{dict.dashboard.rate}:</span>{' '}
                    {shift.hourly_rate} DKK/t
                  </div>
                  <div>
                    <span className="font-medium">{dict.dashboard.booked}:</span>{' '}
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

