import { getCurrentProfile } from '@/utils/supabase/server';
import { createClient } from '@/utils/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Database } from '@/types/database';

type WorkerDetails = Database['public']['Tables']['worker_details']['Row'];

export default async function ProfilePage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  if (!profile) {
    return null;
  }

  const profileData = profile as { id: string; role: string };

  // Get worker details
  const { data: workerDetails } = await supabase
    .from('worker_details')
    .select('*')
    .eq('profile_id', profileData.id)
    .single();

  // Get documents
  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .eq('worker_id', profileData.id)
    .order('created_at', { ascending: false });

  const worker = workerDetails as WorkerDetails | null;
  const verificationStatusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Min profil</h1>
        <p className="text-muted-foreground">Administrer din profil og KYC-oplysninger</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Personlige oplysninger</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {worker ? (
              <>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Navn</p>
                  <p className="text-lg">{worker.first_name} {worker.last_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Telefonnummer</p>
                  <p className="text-lg">{worker.phone_number}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Skattekorttype</p>
                  <p className="text-lg">{worker.tax_card_type}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Bankoplysninger</p>
                  <p className="text-lg">
                    Reg.nr: {worker.bank_reg_number}, Konto: {worker.bank_account_number}
                  </p>
                </div>
                {worker.shirt_size && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">T-shirt størrelse</p>
                    <p className="text-lg">{worker.shirt_size}</p>
                  </div>
                )}
                {worker.shoe_size && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Sko størrelse</p>
                    <p className="text-lg">{worker.shoe_size}</p>
                  </div>
                )}
                {worker.strike_count > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Strikes</p>
                    <p className="text-lg text-yellow-600">{worker.strike_count} / 3</p>
                  </div>
                )}
                {worker.is_banned && (
                  <Badge className="bg-red-100 text-red-800">Banned</Badge>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">Ingen profiloplysninger fundet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>KYC dokumenter</CardTitle>
          </CardHeader>
          <CardContent>
            {documents && documents.length > 0 ? (
              <div className="space-y-3">
                {documents.map((doc: any) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{doc.type}</p>
                      <p className="text-sm text-muted-foreground">
                        Uploaded: {new Date(doc.created_at).toLocaleDateString('da-DK')}
                      </p>
                    </div>
                    <Badge className={verificationStatusColors[doc.verification_status] || ''}>
                      {doc.verification_status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">Ingen dokumenter uploadet endnu</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

