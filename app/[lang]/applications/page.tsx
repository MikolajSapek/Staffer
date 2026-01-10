import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Star } from 'lucide-react';
import { formatTime, formatDateShort, formatDateTime } from '@/lib/date-utils';
import { getDictionary } from '@/app/[lang]/dictionaries';
import { cn } from '@/lib/utils';

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

  // Step 1: Fetch user's applications with company details
  const { data: applicationsRaw } = await supabase
    .from('shift_applications')
    .select(`
      id,
      status,
      applied_at,
      worker_message,
      shift_id,
      shifts (
        *,
        locations!location_id (*),
        profiles!company_id (
          company_details!profile_id (
            company_name,
            logo_url
          )
        )
      )
    `)
    .eq('worker_id', user.id);

  // Step 2: Fetch all reviews for this worker
  const { data: reviews } = await supabase
    .from('reviews')
    .select('id, shift_id, rating, comment, tags, created_at')
    .eq('reviewee_id', user.id);

  // Sort applications by shift start_time (ascending) - from nearest shift to furthest
  // Handle both array and object formats for shifts relation
  const applicationsSorted = (applicationsRaw || []).sort((a: any, b: any) => {
    const shiftA = Array.isArray(a.shifts) ? a.shifts[0] : a.shifts;
    const shiftB = Array.isArray(b.shifts) ? b.shifts[0] : b.shifts;
    
    if (!shiftA?.start_time || !shiftB?.start_time) return 0;
    
    const dateA = new Date(shiftA.start_time).getTime();
    const dateB = new Date(shiftB.start_time).getTime();
    
    return dateA - dateB; // Ascending order (earliest first)
  });

  // Step 3: Merge reviews with applications based on shift_id
  const applications = applicationsSorted.map((app) => ({
    ...app,
    review: reviews?.find((r) => r.shift_id === app.shift_id) || null,
  }));


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
      company_details: {
        company_name: string;
        logo_url: string | null;
      } | null;
    } | null;
  }

  const getCompanyName = (shift: ShiftWithCompany) => {
    return shift.profiles?.company_details?.company_name || 'Unknown Company';
  };

  const getCompanyLogo = (shift: ShiftWithCompany) => {
    return shift.profiles?.company_details?.logo_url || null;
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
            // Handle both array and object formats for shifts relation
            const shift = Array.isArray(app.shifts) ? app.shifts[0] : app.shifts;
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
                    {shift.locations?.address && (
                      <div className="text-muted-foreground ml-4 text-xs">
                        {shift.locations.address}
                      </div>
                    )}
                    {app.worker_message && (
                      <div className="mt-3 pt-3 border-t">
                        <span className="font-medium">{dict.workerApplications.message || 'Your message'}:</span>
                        <p className="text-muted-foreground mt-1">{app.worker_message}</p>
                      </div>
                    )}
                  </div>

                  {/* Company Feedback Section */}
                  {app.review && (
                    <div className="mt-4 pt-4 border-t bg-muted/30 rounded-lg p-4 space-y-3">
                      <div className="font-medium text-sm">Company Feedback:</div>
                      
                      {/* Star Rating */}
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={cn(
                              'h-4 w-4',
                              star <= app.review.rating
                                ? 'fill-yellow-400 stroke-yellow-400'
                                : 'fill-muted stroke-muted'
                            )}
                          />
                        ))}
                        <span className="text-xs text-muted-foreground ml-1">
                          {app.review.rating}/5
                        </span>
                      </div>

                      {/* Comment */}
                      {app.review.comment && (
                        <div>
                          <p className="text-sm text-foreground whitespace-pre-wrap">
                            {app.review.comment}
                          </p>
                        </div>
                      )}

                      {/* Tags */}
                      {app.review.tags && app.review.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {app.review.tags.map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

