import { getCurrentProfile } from '@/utils/supabase/server';
import { createClient } from '@/utils/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { acceptApplication } from '@/app/actions/shifts';
import AcceptApplicationButton from '@/components/company/AcceptApplicationButton';
import type { Database } from '@/types/database';

type ShiftApplication = Database['public']['Tables']['shift_applications']['Row'];
type Shift = Database['public']['Tables']['shifts']['Row'];
type WorkerDetails = Database['public']['Tables']['worker_details']['Row'];

export default async function CandidatesPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  if (!profile) {
    return null;
  }

  const profileData = profile as { id: string; role: string };

  // Get company shifts
  const { data: companyShifts } = await supabase
    .from('shifts')
    .select('id')
    .eq('company_id', profileData.id);

  const shiftIds = (companyShifts || []).map((s: any) => s.id);

  // Get applications for company shifts
  const { data: applications } = shiftIds.length > 0
    ? await supabase
        .from('shift_applications')
        .select(`
          *,
          shifts!inner(id, title, start_time, end_time),
          profiles!worker_id(worker_details(first_name, last_name, phone_number))
        `)
        .in('shift_id', shiftIds)
        .order('applied_at', { ascending: false })
    : { data: [] };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    accepted: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    waitlist: 'bg-blue-100 text-blue-800',
  };

  // Group by shift
  const applicationsByShift = (applications || []).reduce((acc: Record<string, any[]>, app: any) => {
    const shiftId = app.shifts?.id;
    if (!shiftId) return acc;
    if (!acc[shiftId]) {
      acc[shiftId] = [];
    }
    acc[shiftId].push(app);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Kandidatstyring</h1>
        <p className="text-muted-foreground">Administrer ansøgninger til dine skift</p>
      </div>

      <div className="space-y-6">
        {Object.entries(applicationsByShift).map(([shiftId, apps]) => {
          const firstApp = apps[0];
          const shift = firstApp?.shifts as Shift;
          
          return (
            <Card key={shiftId}>
              <CardHeader>
                <CardTitle>{shift?.title || 'Ukendt skift'}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {shift?.start_time
                    ? new Date(shift.start_time).toLocaleString('da-DK')
                    : 'N/A'}
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {apps.map((app: any) => {
                    const application = app as ShiftApplication & { 
                      shifts: Shift;
                      profiles: { worker_details: WorkerDetails | null } | null;
                    };
                    const workerDetails = application.profiles?.worker_details;
                    
                    return (
                      <div
                        key={application.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div>
                              <p className="font-medium">
                                {workerDetails
                                  ? `${workerDetails.first_name} ${workerDetails.last_name}`
                                  : 'Ukendt arbejder'}
                              </p>
                              {workerDetails?.phone_number && (
                                <p className="text-sm text-muted-foreground">
                                  {workerDetails.phone_number}
                                </p>
                              )}
                            </div>
                            <Badge className={statusColors[application.status] || ''}>
                              {application.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            Ansøgt: {new Date(application.applied_at).toLocaleString('da-DK')}
                          </p>
                        </div>
                        {application.status === 'pending' && (
                          <AcceptApplicationButton applicationId={application.id} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {(!applications || applications.length === 0) && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Ingen ansøgninger endnu</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
