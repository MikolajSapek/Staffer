'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export type RelationType = 'favorite' | 'blacklist';

/**
 * Upsert worker relation (favorite or blacklist)
 * Uses auth.uid() as company_id – nie ufamy wartości z klienta.
 * Jawny payload z mapowaniem camelCase → snake_case.
 */
export async function upsertWorkerRelation(params: {
  workerId: string;
  companyId: string;
  relationType: RelationType;
  lang: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }
  if (user.id !== params.companyId) {
    return { error: 'Unauthorized: company mismatch' };
  }

  const userId = user.id;
  const workerId = params.workerId;
  const selectedType = params.relationType;

  const payload = {
    company_id: userId,
    worker_id: workerId,
    relation_type: selectedType,
  };

  console.log('--- DB ATTEMPT START ---');
  console.log('Relation Payload:', payload);

  const { data, error } = await supabase
    .from('worker_relations')
    .upsert(payload, { onConflict: 'company_id, worker_id' })
    .select();

  if (error) {
    console.error('DB ERROR:', error);
    console.error('DB ERROR details:', { code: error.code, message: error.message, details: error.details });
  }
  console.log('DB DATA:', data);
  console.log('DB ERROR:', error ?? 'null');
  console.log('--- DB ATTEMPT END ---');

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/${params.lang}/dashboard`, 'page');
  revalidatePath(`/${params.lang}/staff`, 'page');
  return { success: true };
}

/**
 * Remove worker from relations (both favorite and blacklist)
 */
export async function removeWorkerRelation(params: {
  workerId: string;
  companyId: string;
  lang: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.id !== params.companyId) {
    return { error: 'Unauthorized' };
  }

  const { error } = await supabase
    .from('worker_relations')
    .delete()
    .eq('company_id', params.companyId)
    .eq('worker_id', params.workerId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/${params.lang}/dashboard`, 'page');
  return { success: true };
}

/**
 * Move worker from one list to another
 */
export async function moveWorkerRelation(params: {
  workerId: string;
  companyId: string;
  toRelationType: RelationType;
  lang: string;
}) {
  return upsertWorkerRelation({
    workerId: params.workerId,
    companyId: params.companyId,
    relationType: params.toRelationType,
    lang: params.lang,
  });
}
