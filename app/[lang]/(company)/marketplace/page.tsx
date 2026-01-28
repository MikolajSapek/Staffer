import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { getDictionary } from '@/app/[lang]/dictionaries';
import { getCurrentProfile } from '@/utils/supabase/server';
import JobBoardClient from '@/app/[lang]/JobBoardClient';

export const dynamic = 'force-dynamic';

export default async function CompanyMarketPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang as 'en-US' | 'da');
  
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  // Company layout already handles authentication, but we still need user data
  if (!user) {
    redirect(`/${lang}/login`);
  }

  const profile = await getCurrentProfile();
  const userRole = profile?.role as 'worker' | 'company' | 'admin' | null;
  const verificationStatus = profile?.verification_status ?? null;

  // Ensure only companies can access this page
  if (userRole !== 'company') {
    redirect(`/${lang}`);
  }
  
  // POBIERANIE WSZYSTKICH OFERT (Marketplace View)
  // Nie filtrujemy po company_id - chcemy widzieć wszystkie oferty na rynku
  const { data: shiftsData, error: shiftsError } = await supabase
    .from('shifts')
    .select(`
      id,
      title,
      description,
      category,
      hourly_rate,
      start_time,
      end_time,
      break_minutes,
      is_break_paid,
      possible_overtime,
      vacancies_total,
      vacancies_taken,
      status,
      is_urgent,
      must_bring,
      company_id,
      locations!location_id (
        name,
        address
      ),
      profiles!company_id (
        company_details!profile_id (
          company_name,
          logo_url
        )
      )
    `)
    .eq('status', 'published')
    .gt('start_time', new Date().toISOString())
    .order('start_time', { ascending: true });

  if (shiftsError) {
    return (
      <div className="p-8 text-red-500">
        <h2 className="text-xl font-bold mb-2">Błąd pobierania rynku</h2>
        <p>{shiftsError.message}</p>
      </div>
    );
  }

  // Filtrujemy tylko te zmiany, które mają wolne miejsca
  const availableShifts = (shiftsData || []).filter(shift => 
    shift.vacancies_taken < shift.vacancies_total
  );
  
  const shifts = shiftsError ? [] : availableShifts;

  return (
    <div>
      {!shifts || shifts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {dict.jobBoard?.noJobs || 'Brak aktywnych ofert na rynku.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <JobBoardClient
          shifts={shifts}
          userRole={userRole}
          user={user}
          appliedShiftIds={[]} // Firma nie aplikuje, więc pusta tablica
          applicationStatusMap={{}} // Firma nie ma statusów aplikacji
          verificationStatus={verificationStatus}
          dict={dict}
          lang={lang}
        />
      )}
    </div>
  );
}
