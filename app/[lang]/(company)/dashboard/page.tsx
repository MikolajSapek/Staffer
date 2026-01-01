import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { formatTime, formatDateShort } from '@/lib/date-utils';
import { getDictionary } from '@/app/[lang]/dictionaries';
import StatsCards from '@/components/dashboard/StatsCards';

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

  // Query 1: Count locations for this company
  const { count: locationsCount } = await supabase
    .from('locations')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', user.id);

  // Query 2: Count active shifts (status is not 'completed')
  const { count: activeShiftsCount } = await supabase
    .from('shifts')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', user.id)
    .neq('status', 'completed');

  // Query 3: Sum vacancies_taken from shifts table for this company
  const { data: shiftsData } = await supabase
    .from('shifts')
    .select('vacancies_taken')
    .eq('company_id', user.id);

  const totalHires = shiftsData?.reduce((sum, shift) => sum + (shift.vacancies_taken || 0), 0) || 0;


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
              {dict.dashboard.welcomeTitle.replace('{name}', companyDetails.company_name || '')}
            </h1>
            <p className="text-muted-foreground">
              {dict.dashboard.welcomeSubtitle}
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
        <div className="mb-8">
          <StatsCards
            stats={{
              shifts: activeShiftsCount || 0,
              locations: locationsCount || 0,
              hires: totalHires,
            }}
            dict={{
              activeShifts: dict.dashboard.activeShifts,
              totalLocations: dict.dashboard.totalLocations,
              totalHires: dict.dashboard.totalHires,
              clickToView: dict.dashboard.clickToView,
              clickToManage: dict.dashboard.clickToManage,
            }}
            lang={lang}
          />
        </div>
      </div>

      {/* Recent Shifts Section */}
      <div id="recent-shifts" className="mb-8 scroll-mt-8">
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

