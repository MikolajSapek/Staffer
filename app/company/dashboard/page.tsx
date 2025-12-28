import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';
import { da } from 'date-fns/locale/da';

// Type definitions for Supabase response
interface LocationData {
  name: string;
  address?: string;
}

interface ShiftData {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  hourly_rate: number;
  vacancies_total: number;
  vacancies_taken: number | null;
  status: string;
  locations: LocationData | LocationData[] | null;
}

// Helper function to safely extract location name from Supabase response
// Handles both array (one-to-many) and object (one-to-one) responses
const getLocationName = (locations: unknown): string => {
  if (!locations) return 'Lokation ikke angivet';
  
  // Handle Array (Supabase One-to-Many response)
  if (Array.isArray(locations)) {
    return locations[0]?.name || 'Lokation ikke angivet';
  }
  
  // Handle Single Object (Supabase One-to-One response)
  if (typeof locations === 'object' && locations !== null && 'name' in locations) {
    return (locations as LocationData).name || 'Lokation ikke angivet';
  }

  return 'Lokation ikke angivet';
};

export default async function CompanyDashboardPage() {
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

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'HH:mm', { locale: da });
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'd. MMMM yyyy', { locale: da });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      published: 'default',
      full: 'secondary',
      completed: 'outline',
      cancelled: 'destructive',
    };
    const labels: Record<string, string> = {
      published: 'Aktiv',
      full: 'Fuldt booket',
      completed: 'Afsluttet',
      cancelled: 'Annulleret',
    };
    return (
      <Badge variant={variants[status] || 'secondary'}>
        {labels[status] || status}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Oversigt over dine jobopslag
          </p>
        </div>
        <Button asChild>
          <Link href="/create-shift">
            <Plus className="mr-2 h-4 w-4" />
            Opret vagt
          </Link>
        </Button>
      </div>

      {!shifts || shifts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              Du har ingen jobopslag endnu.
            </p>
            <Button asChild>
              <Link href="/create-shift">
                <Plus className="mr-2 h-4 w-4" />
                Opret dit første jobopslag
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {(shifts as ShiftData[]).map((shift) => (
            <Card key={shift.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-xl">{shift.title}</CardTitle>
                  {getStatusBadge(shift.status)}
                </div>
                <CardDescription>
                  {getLocationName(shift.locations)}
                </CardDescription>
              </CardHeader>
              <CardContent>
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
                    <span className="font-medium">Sats:</span>{' '}
                    {shift.hourly_rate} DKK/t
                  </div>
                  <div>
                    <span className="font-medium">Booket:</span>{' '}
                    {shift.vacancies_taken || 0} / {shift.vacancies_total}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

