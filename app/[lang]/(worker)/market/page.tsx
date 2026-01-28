import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { getDictionary } from '@/app/[lang]/dictionaries';
import { getCurrentProfile } from '@/utils/supabase/server';
import JobBoardClient from '@/app/[lang]/JobBoardClient';

export const dynamic = 'force-dynamic';

export default async function WorkerMarketPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang as 'en-US' | 'da');
  
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  // Worker layout already handles authentication, but we still need user data
  if (!user) {
    redirect(`/${lang}/login`);
  }

  const profile = await getCurrentProfile();
  const userRole = profile?.role as 'worker' | 'company' | 'admin' | null;
  const verificationStatus = profile?.verification_status ?? null;

  // Ensure only workers can access this page
  if (userRole !== 'worker') {
    redirect(`/${lang}`);
  }
  
  let appliedShiftIds: string[] = [];
  let applicationStatusMap: Record<string, string> = {};

  if (user && userRole === 'worker') {
    const { data: applications } = await supabase
      .from('shift_applications')
      .select('shift_id, status')
      .eq('worker_id', user.id);
    
    appliedShiftIds = applications?.map(app => app.shift_id) || [];
    applications?.forEach(app => {
      const status = app.status === 'accepted' ? 'approved' : app.status;
      applicationStatusMap[app.shift_id] = status;
    });
  }

  // LOG: Informacja o użytkowniku dla diagnostyki
  console.log('═══════════════════════════════════════════════════════');
  console.log('🔍 DIAGNOSTYKA POBIERANIA OFERT (WORKER MARKET)');
  console.log('═══════════════════════════════════════════════════════');
  console.log('👤 Użytkownik:', user ? `${user.id} (${userRole})` : '❌ NIEZALOGOWANY');
  console.log('📅 Czas zapytania:', new Date().toISOString());
  
  // Fetch only essential shift data for worker job market (no manager data)
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
    // Using new Date().toISOString() for UTC timestamp in database queries is correct
    .gt('start_time', new Date().toISOString())
    .order('start_time', { ascending: true });

  // AGRESYWNE LOGOWANIE BŁĘDÓW
  if (shiftsError) {
    console.error('❌ BŁĄD POBIERANIA OFERT:', shiftsError);
    console.error('📝 Szczegóły błędu:');
    console.error('  - Kod:', shiftsError.code);
    console.error('  - Wiadomość:', shiftsError.message);
    console.error('  - Szczegóły:', shiftsError.details);
    console.error('  - Hint:', shiftsError.hint);
  } else {
    console.log('✅ ZAPYTANIE ZAKOŃCZONE SUKCESEM');
    console.log('📊 Pobrano shiftów:', shiftsData?.length || 0);
    
    if (shiftsData && shiftsData.length > 0) {
      console.log('📋 Przykładowy shift (pierwszy):');
      const firstShift = shiftsData[0];
      console.log('  - ID:', firstShift.id);
      console.log('  - Tytuł:', firstShift.title);
      console.log('  - Status:', firstShift.status);
      console.log('  - Start:', firstShift.start_time);
      console.log('  - Wolne miejsca:', `${firstShift.vacancies_taken}/${firstShift.vacancies_total}`);
      console.log('  - Ma lokalizację?', !!firstShift.locations);
      console.log('  - Ma profil firmy?', !!firstShift.profiles);
    } else {
      console.warn('⚠️ PUSTA LISTA OFERT!');
      console.warn('   Możliwe przyczyny:');
      console.warn('   1. Brak ofert ze statusem "published"');
      console.warn('   2. Wszystkie oferty mają datę w przeszłości');
      console.warn('   3. Problem z RLS (Row Level Security)');
      console.warn('   4. Brak danych w bazie');
    }
  }

  // Filtrujemy tylko te zmiany, które mają wolne miejsca
  const availableShifts = (shiftsData || []).filter(shift => 
    shift.vacancies_taken < shift.vacancies_total
  );
  
  console.log('🔍 Po filtrowaniu (wolne miejsca):', availableShifts.length);
  
  if (shiftsData && shiftsData.length > 0 && availableShifts.length === 0) {
    console.warn('⚠️ WSZYSTKIE OFERTY SĄ ZAPEŁNIONE (vacancies_taken >= vacancies_total)');
  }
  
  const shifts = shiftsError ? [] : availableShifts;
  console.log('🎯 FINALNA LICZBA OFERT DO WYŚWIETLENIA:', shifts.length);
  console.log('═══════════════════════════════════════════════════════');

  return (
    <div>
      {!shifts || shifts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {dict.jobBoard.noJobs}
            </p>
          </CardContent>
        </Card>
      ) : (
        <JobBoardClient
          shifts={shifts}
          userRole={userRole}
          user={user}
          appliedShiftIds={appliedShiftIds}
          applicationStatusMap={applicationStatusMap}
          verificationStatus={verificationStatus}
          dict={dict}
          lang={lang}
        />
      )}
    </div>
  );
}
