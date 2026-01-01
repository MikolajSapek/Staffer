import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { formatTime, formatDateShort, formatDateTime } from '@/lib/date-utils';
import { getDictionary } from '@/app/[lang]/dictionaries';

export default async function ApplicationsPage({
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

  // Get user profile to check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'worker') {
    redirect(`/${lang}`);
  }

  // Fetch user's applications with company details
  const { data: applications } = await supabase
    .from('shift_applications')
    .select(`
      id,
      status,
      applied_at,
      worker_message,
      shift_id,
      shifts (
        id,
        title,
        start_time,
        end_time,
        hourly_rate,
        company_id,
        locations (
          name,
          address
        ),
        profiles:profiles!shifts_company_id_fkey (
          last_name,
          company_details (
            logo_url
          )
        )
      )
    `)
    .eq('worker_id', user.id)
    .order('applied_at', { ascending: false });


  const getStatusBadge = (status: string) => {
    // Map 'accepted' to 'approved' for display consistency
    const displayStatus = status === 'accepted' ? 'approved' : status;
    
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      approved: 'default',
      accepted: 'default', // Backward compatibility
      pending: 'secondary',
      rejected: 'destructive',
      waitlist: 'outline',
      completed: 'outline',
    };
    const labels: Record<string, string> = {
      approved: dict.workerApplications.statusAccepted || 'Approved',
      accepted: dict.workerApplications.statusAccepted || 'Accepted', // Backward compatibility
      pending: dict.workerApplications.statusPending,
      rejected: dict.workerApplications.statusRejected,
      waitlist: dict.workerApplications.statusWaitlist,
      completed: 'Completed',
    };
    return (
      <Badge variant={variants[displayStatus] || 'secondary'}>
        {labels[displayStatus] || status}
      </Badge>
    );
  };

  interface ShiftWithCompany {
    profiles?: {
      last_name: string | null;
      company_details?: Array<{ logo_url: string | null }>;
    } | null;
  }

  const getCompanyName = (shift: ShiftWithCompany) => {
    return shift.profiles?.last_name || 'Unknown Company';
  };

  const getCompanyLogo = (shift: ShiftWithCompany) => {
    return shift.profiles?.company_details?.[0]?.logo_url || null;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{dict.workerApplications.title}</h1>
        <p className="text-muted-foreground">
          {dict.workerApplications.subtitle}
        </p>
      </div>

      {!applications || applications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {dict.workerApplications.noApplications}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => {
            const shift = app.shifts;
            if (!shift) return null;

            const companyName = getCompanyName(shift);
            const companyLogo = getCompanyLogo(shift);
            const companyInitials = companyName.substring(0, 2).toUpperCase();

            return (
              <Card key={app.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={companyLogo || undefined} alt={companyName} />
                        <AvatarFallback>{companyInitials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <CardTitle>{shift.title}</CardTitle>
                        <CardDescription>
                          {companyName}
                        </CardDescription>
                        <CardDescription className="mt-1">
                          {dict.workerApplications.applied}: {formatDateTime(app.applied_at)}
                        </CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(app.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">{dict.workerApplications.date}:</span>{' '}
                      {formatDateShort(shift.start_time)}
                    </div>
                    <div>
                      <span className="font-medium">{dict.workerApplications.time}:</span>{' '}
                      {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                    </div>
                    <div>
                      <span className="font-medium">{dict.workerApplications.rate}:</span>{' '}
                      {shift.hourly_rate} DKK/t
                    </div>
                    <div>
                      <span className="font-medium">{dict.workerApplications.location}:</span>{' '}
                      {shift.locations?.name || dict.workerApplications.locationNotSpecified}
                    </div>
                    {app.worker_message && (
                      <div className="mt-3 pt-3 border-t">
                        <span className="font-medium">{dict.workerApplications.message || 'Your message'}:</span>
                        <p className="text-muted-foreground mt-1">{app.worker_message}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

