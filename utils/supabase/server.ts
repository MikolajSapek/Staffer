import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

/**
 * Get the current authenticated user
 */
export async function getCurrentUser() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

/**
 * Get the user's role from the profiles table
 * Returns null if user is not authenticated or profile doesn't exist
 */
export async function getUserRole(): Promise<'worker' | 'company' | 'admin' | null> {
  const user = await getCurrentUser();
  
  if (!user) {
    return null;
  }

  const supabase = createClient();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !profile) {
    return null;
  }

  const profileData = profile as { role: 'worker' | 'company' | 'admin' };
  return profileData.role;
}

/**
 * Get the full profile with role
 */
export async function getCurrentProfile() {
  const user = await getCurrentUser();
  
  if (!user) {
    return null;
  }

  const supabase = createClient();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !profile) {
    return null;
  }

  return profile;
}

