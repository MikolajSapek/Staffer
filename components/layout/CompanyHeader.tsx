'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { usePathname, useParams } from 'next/navigation';

interface CompanyHeaderProps {
  dict: {
    nav?: {
      logout: string;
    };
    navigation: {
      logout: string;
    };
    common: {
      user: string;
    };
  };
  lang: string;
}

export function CompanyHeader({ dict, lang }: CompanyHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  
  // Jeśli lang jest undefined/null, użyj useParams jako fallback
  const currentLang = lang || (params?.lang as string) || 'en-US';
  
  // Debug (opcjonalnie, usuń po testach)
  if (!lang && !params?.lang) {
    console.warn('CompanyHeader: lang is missing from both props and params, using fallback "en-US"');
  }
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Get page title based on pathname
  const getPageTitle = () => {
    if (!pathname) return '';
    
    const pathWithoutLang = pathname.replace(/^\/(en-US|da)/, '') || '/';
    
    const titleMap: Record<string, string> = {
      '/dashboard': 'Dashboard',
      '/listings': 'Shifts',
      '/timesheets': 'Timesheets',
      '/applicants': 'Applicants',
      '/locations': 'Locations',
      '/templates': 'Templates',
      '/managers': 'Team',
      '/billing': 'Finances',
      '/settings': 'Settings',
      '/company/profile': 'Profile',
      '/support': 'Support',
    };
    
    return titleMap[pathWithoutLang] || '';
  };

  // Fetch user and avatar
  useEffect(() => {
    let mounted = true;
    
    async function fetchUser() {
      try {
        const supabase = createClient();
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (!mounted) return;

        if (error) {
          if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
            console.error('Supabase connection error:', error.message);
            setUser(null);
            setAvatarUrl(null);
            setLoading(false);
            return;
          }
          setUser(null);
          setAvatarUrl(null);
          setLoading(false);
          return;
        }

        setUser(user);
        if (user) {
          // Fetch company logo as avatar
          const { data: companyDetails } = await supabase
            .from('company_details')
            .select('logo_url')
            .eq('profile_id', user.id)
            .maybeSingle();
          setAvatarUrl(companyDetails?.logo_url || null);
        } else {
          setAvatarUrl(null);
        }
        setLoading(false);
      } catch (err: unknown) {
        console.error('Error fetching user:', err);
        if (!mounted) return;
        setUser(null);
        setAvatarUrl(null);
        setLoading(false);
      }
    }

    fetchUser();

    // Listen for auth changes
    let subscription: { unsubscribe: () => void } | null = null;
    
    try {
      const supabase = createClient();
      const {
        data: { subscription: authSubscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!mounted) return;
        setUser(session?.user ?? null);
        if (session?.user) {
          const supabase = createClient();
          supabase
            .from('company_details')
            .select('logo_url')
            .eq('profile_id', session.user.id)
            .maybeSingle()
            .then(({ data: companyDetails }) => {
              if (mounted) {
                setAvatarUrl(companyDetails?.logo_url || null);
              }
            });
        } else {
          setAvatarUrl(null);
          setLoading(false);
        }
      });
      subscription = authSubscription;
    } catch (err: unknown) {
      console.error('Error setting up auth listener:', err);
    }

    return () => {
      mounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);


  const getUserInitials = () => {
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const pageTitle = getPageTitle();

  if (loading) {
    return (
      <header className="h-16 border-b bg-white flex items-center justify-between px-6">
        <div className="h-6 w-32 bg-muted animate-pulse rounded" />
        <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
      </header>
    );
  }

  return (
    <header className="h-16 border-b bg-white flex items-center justify-between px-6 z-20">
      {/* Page Title - Left */}
      {pageTitle && (
        <h1 className="font-bold text-xl text-foreground">
          {pageTitle}
        </h1>
      )}

      {/* User Profile - Right (Fixed) */}
      <div className="flex items-center gap-4 ml-auto">
        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block">
            <p className="text-sm font-medium text-slate-700">{user?.email || dict.common.user}</p>
            <p className="text-xs text-slate-500 capitalize">Company</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-sm ring-2 ring-white">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" className="h-full w-full rounded-full object-cover" />
            ) : (
              <span className="font-bold">{getUserInitials()}</span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
