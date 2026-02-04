import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import StaffTabs from '@/components/dashboard/StaffTabs';

export const dynamic = 'force-dynamic';

export default async function StaffPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${lang}/login`);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'company') {
    redirect(`/${lang}`);
  }

  const { data: relationsData } = await supabase
    .from('worker_relations')
    .select(`
      id,
      worker_id,
      relation_type,
      created_at,
      worker:profiles!worker_relations_worker_id_fkey(
        id,
        first_name,
        last_name,
        worker_details:worker_details!worker_details_profile_id_fkey(first_name, last_name, avatar_url)
      )
    `)
    .eq('company_id', user.id);

  const mapRelationToStaffWorker = (r: any) => {
    const worker = Array.isArray(r?.worker) ? r.worker[0] : r?.worker;
    if (!worker) return null;
    const details = Array.isArray(worker?.worker_details) ? worker.worker_details[0] : worker?.worker_details;
    return {
      id: r.id,
      worker_id: r.worker_id,
      relation_type: r.relation_type,
      created_at: r.created_at ?? null,
      first_name: worker.first_name ?? details?.first_name ?? '',
      last_name: worker.last_name ?? details?.last_name ?? '',
      avatar_url: details?.avatar_url ?? null,
    };
  };

  const staffWorkers = (relationsData ?? []).map(mapRelationToStaffWorker).filter(Boolean) as Array<{
    id: string;
    worker_id: string;
    relation_type: 'favorite' | 'blacklist';
    created_at: string | null;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  }>;
  const favorites = staffWorkers.filter((w) => w.relation_type === 'favorite');
  const blacklist = staffWorkers.filter((w) => w.relation_type === 'blacklist');

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Staff</h1>
        <p className="text-slate-500 mt-0.5 text-sm">
          Manage your favorites and blacklist.
        </p>
      </div>
      <StaffTabs
        favorites={favorites}
        blacklist={blacklist}
        companyId={user.id}
        lang={lang}
      />
    </div>
  );
}
