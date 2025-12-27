import { getCurrentProfile } from '@/utils/supabase/server';
import { createClient } from '@/utils/supabase/server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { createShift } from '@/app/actions/shifts';
import CreateShiftForm from '@/components/company/CreateShiftForm';
import type { Database } from '@/types/database';

type Location = Database['public']['Tables']['locations']['Row'];

export default async function CreateShiftPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  if (!profile) {
    return null;
  }

  const profileData = profile as { id: string; role: string };

  // Get company locations
  const { data: locations } = await supabase
    .from('locations')
    .select('*')
    .eq('company_id', profileData.id)
    .order('name', { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Opret skift</h1>
        <p className="text-muted-foreground">Opret nye skift for dit firma</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Skift detaljer</CardTitle>
          <CardDescription>
            Udfyld formularen for at oprette et nyt skift
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateShiftForm locations={locations as Location[] || []} createShiftAction={createShift} />
        </CardContent>
      </Card>

      {(!locations || locations.length === 0) && (
        <Card className="border-yellow-500 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-600">Ingen lokationer</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Du skal tilføje mindst én lokation før du kan oprette skift.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

