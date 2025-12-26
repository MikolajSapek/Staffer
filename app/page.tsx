import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If user is logged in, redirect to their dashboard
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile) {
      const profileData = profile as { role: 'worker' | 'company' | 'admin' };
      if (profileData.role === 'company') redirect('/company');
      if (profileData.role === 'worker') redirect('/worker');
      if (profileData.role === 'admin') redirect('/admin');
    }
  }

  // If not logged in, show job listings (public view)
  const { data: availableShifts } = await supabase
    .from('shifts')
    .select('*')
    .eq('status', 'published')
    .gt('vacancies_total', 'vacancies_taken')
    .order('start_time', { ascending: true })
    .limit(10);

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto py-12 px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Vikar System</h1>
          <p className="text-lg text-muted-foreground mb-8">Danish Staffing Platform</p>
          <div className="flex gap-4 justify-center">
            <Link href="/login">
              <Button>Log ind</Button>
            </Link>
            <Link href="/register">
              <Button variant="outline">Opret konto</Button>
            </Link>
          </div>
        </div>

        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6">Tilgængelige skift</h2>
          {availableShifts && availableShifts.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {availableShifts.map((shift: any) => (
                <Card key={shift.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{shift.title}</CardTitle>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline">{shift.category}</Badge>
                      <Badge variant="secondary">
                        {shift.hourly_rate} DKK/t
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-2">
                      {shift.description || 'Ingen beskrivelse'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(shift.start_time).toLocaleDateString('da-DK', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Ledige pladser: {shift.vacancies_total - shift.vacancies_taken} / {shift.vacancies_total}
                    </p>
                    <Link href="/login" className="mt-4 block">
                      <Button variant="outline" className="w-full mt-4">
                        Ansøg nu
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">Ingen tilgængelige skift lige nu</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
