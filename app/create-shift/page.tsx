import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import CreateShiftForm from './CreateShiftForm';

export default async function CreateShiftPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get user profile to check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'company') {
    redirect('/');
  }

  // Fetch company locations
  const { data: locations } = await supabase
    .from('locations')
    .select('id, name, address')
    .eq('company_id', user.id)
    .order('name', { ascending: true });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Opret vagt</h1>
        <p className="text-muted-foreground">
          Opret et nyt jobopslag
        </p>
      </div>

      <div className="max-w-2xl">
        <CreateShiftForm companyId={user.id} locations={locations || []} />
      </div>
    </div>
  );
}

