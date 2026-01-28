'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { usePathname, useParams } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { COMPANY_NAVIGATION, SYSTEM_LINKS } from '@/lib/config/company-navigation';
import { LayoutDashboard, Briefcase, FileText, Users, MapPin, Copy, UserCog, Wallet, Settings, LogOut } from 'lucide-react';
import { getCompanyNotificationCounts } from '@/app/actions/notifications';

interface CompanyHeaderProps {
  dict: {
    nav?: {
      dashboard: string;
      shifts: string;
      locations: string;
      timesheets: string;
      applicants: string;
      settings: string;
      profile: string;
      support: string;
      logout: string;
      finances: string;
    };
    navigation: {
      logout: string;
    };
    common: {
      user: string;
    };
    dashboard?: {
      team?: string;
      templates?: string;
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
  const [counts, setCounts] = useState({ applicants: 0, finances: 0 });

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

  // Fetch notification counts
  useEffect(() => {
    if (user) {
      getCompanyNotificationCounts().then(setCounts).catch(() => {
        setCounts({ applicants: 0, finances: 0 });
      });
    } else {
      setCounts({ applicants: 0, finances: 0 });
    }
  }, [user]);


  const getUserInitials = () => {
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push(`/${currentLang}`);
      router.refresh();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getNotificationCount = (itemName: string) => {
    if (itemName === 'Applicants') return counts.applicants;
    if (itemName === 'Finances') return counts.finances;
    return 0;
  };

  // Map item names to dictionary keys
  const getItemLabel = (name: string) => {
    const labelMap: Record<string, string> = {
      'Dashboard': dict.nav?.dashboard || 'Dashboard',
      'Shifts': dict.nav?.shifts || 'Shifts',
      'Job Listings': 'Job Listings',
      'Timesheets': dict.nav?.timesheets || 'Timesheets',
      'Applicants': dict.nav?.applicants || 'Applicants',
      'Locations': dict.nav?.locations || 'Locations',
      'Templates': dict.dashboard?.templates || 'Templates',
      'Team': dict.dashboard?.team || 'Team',
      'Finances': dict.nav?.finances || 'Finances',
      'Settings': dict.nav?.settings || 'Settings',
      'Support': dict.nav?.support || 'Support',
    };
    return labelMap[name] || name;
  };

  const isActive = (href: string) => {
    if (!pathname) return false;
    const pathWithoutLang = pathname.replace(/^\/(en-US|da)/, '') || '/';
    const hrefWithoutLang = href.startsWith('/') ? href : `/${href}`;
    
    if (pathWithoutLang === hrefWithoutLang) return true;
    if (hrefWithoutLang !== '/' && pathWithoutLang.startsWith(hrefWithoutLang)) return true;
    
    return false;
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
          
          {/* Mobile Navigation Dropdown */}
          <div className="block lg:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-sm ring-2 ring-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Profile" className="h-full w-full rounded-full object-cover" />
                  ) : (
                    <span className="font-bold">{getUserInitials()}</span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div>
                    <p className="text-sm font-semibold truncate">{user?.email || dict.common.user}</p>
                    <p className="text-xs text-muted-foreground">Company</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {/* Navigation Links from Sidebar */}
                {COMPANY_NAVIGATION.map((category) =>
                  category.items.map((item) => {
                    const Icon = item.icon;
                    const notificationCount = item.hasBadge ? getNotificationCount(item.name) : 0;
                    
                    return (
                      <DropdownMenuItem key={item.name} asChild>
                        <Link
                          href={`/${currentLang}${item.href}`}
                          className={`flex items-center gap-2 ${isActive(item.href) ? 'bg-accent' : ''}`}
                        >
                          <Icon className="h-4 w-4" />
                          <span className="flex-1">{getItemLabel(item.name)}</span>
                          {notificationCount > 0 && (
                            <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full min-w-[1.25rem]">
                              {notificationCount}
                            </span>
                          )}
                        </Link>
                      </DropdownMenuItem>
                    );
                  })
                )}
                
                {/* System Links (excluding Settings - it goes at the bottom) */}
                {SYSTEM_LINKS.filter(item => item.name !== 'Settings' && item.name !== 'Support').map((item) => {
                  const Icon = item.icon;
                  return (
                    <DropdownMenuItem key={item.name} asChild>
                      <Link
                        href={`/${currentLang}${item.href}`}
                        className={`flex items-center gap-2 ${isActive(item.href) ? 'bg-accent' : ''}`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{getItemLabel(item.name)}</span>
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
                
                <DropdownMenuSeparator />
                
                {/* Settings and Logout at the bottom */}
                <DropdownMenuItem asChild>
                  <Link
                    href={`/${currentLang}/settings`}
                    className={`flex items-center gap-2 ${isActive('/settings') ? 'bg-accent' : ''}`}
                  >
                    <Settings className="h-4 w-4" />
                    <span>{dict.nav?.settings || 'Settings'}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                  <LogOut className="h-4 w-4 mr-2" />
                  <span>{dict.nav?.logout || dict.navigation.logout}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {/* Desktop Avatar (no dropdown) */}
          <div className="hidden lg:block h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-sm ring-2 ring-white">
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
