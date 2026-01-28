'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getCompanyNotificationCounts } from '@/app/actions/notifications';
import { COMPANY_NAVIGATION } from '@/lib/config/company-navigation';
import { 
  User, 
  LogOut, 
  Calendar, 
  Briefcase, 
  DollarSign, 
  UserCircle, 
  LayoutDashboard, 
  Plus, 
  Users, 
  FileText,
  MapPin,
  Clock,
  Globe,
  Wallet,
  Settings,
  LifeBuoy
} from 'lucide-react';

interface NavbarProps {
  dict: {
    navigation: {
      dashboard: string;
      login: string;
      register: string;
      profile: string;
      schedule: string;
      timesheets: string;
      applications: string;
      applicants: string;
      finances: string;
      myCalendar: string;
      createShift: string;
      logout: string;
      userMenu: string;
      role: string;
      noRoleAssigned: string;
    };
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
    };
    common: {
      user: string;
    };
    workerNav: {
      roleLabel: string;
      calendar: string;
      applications: string;
      finances: string;
    };
  };
  lang: string;
}

export default function Navbar({ dict, lang }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  
  // Lista tras, które mają WŁASNY layout (Sidebar) i nie potrzebują starego Navbara
  const routesWithSidebar = [
    // Trasy Firmy
    '/dashboard',
    '/listings',    // Zmienione z /shifts na /listings
    '/applicants',
    '/locations',
    '/templates',
    '/billing',
    '/managers',
    '/timesheets',
    '/create-shift',
    '/settings',    // Tylko company settings (nie /worker/settings)
    '/company/profile', // Profil firmy
    
    // Trasy Pracownika (DODANE TERAZ)
    '/market',       // To jest Job Listings dla zalogowanego
    '/schedule',
    '/applications', // My Shifts
    '/finances',
    '/profile',      // Profil pracownika
    '/worker/settings',
    '/support'       // Support również jest w (worker)
  ];

  // Sprawdź, czy aktualna ścieżka zawiera którąś z powyższych
  // Usuwamy prefix języka przed sprawdzeniem
  const pathWithoutLang = pathname?.replace(/^\/(en-US|da)/, '') || '/';
  
  // Sprawdź czy jesteśmy na którejś z tych tras
  const shouldHideNavbar = routesWithSidebar.some(route => {
    // Dla /settings, upewnij się że to nie jest /worker/settings
    if (route === '/settings') {
      return pathWithoutLang === '/settings' || 
             (pathWithoutLang.startsWith('/settings/') && !pathWithoutLang.startsWith('/worker/'));
    }
    // Dla pozostałych routes użyj startsWith, żeby złapać też podstrony (np. /shifts/[id])
    return pathWithoutLang.startsWith(route);
  });

  // Jeśli to strona z własnym Sidebar -> Nie renderuj starego Navbara
  if (shouldHideNavbar) return null;
  
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [role, setRole] = useState<'worker' | 'company' | 'admin' | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ applicants: 0, finances: 0 });

  // Get page title based on pathname
  const getPageTitle = () => {
    if (!pathname) return '';
    
    // Remove language prefix (e.g., /en-US or /da)
    // If result is empty, default to '/' (home page)
    const pathWithoutLang = pathname.replace(/^\/(en-US|da)/, '') || '/';
    
    const titleMap: Record<string, string> = {
      // Worker pages
      '/': 'Job Listing',
      '/applications': 'My Shifts',
      '/schedule': 'My Schedule',
      '/finances': 'Financial Overview',
      '/profile': 'My Profile',
      '/support': 'Support',
      '/worker/settings': 'Settings',
      
      // Company pages
      '/dashboard': 'Dashboard',
      '/create-shift': 'Create Shift',
      '/listings': 'Job Listings',
      '/applicants': 'Applicants',
      '/managers': 'Managers',
      '/templates': 'Shift Templates',
      '/locations': 'Locations',
      '/timesheets': 'Timesheets',
      '/billing': 'Financial Overview',
      '/settings': 'Company Settings',
    };
    
    return titleMap[pathWithoutLang] || '';
  };

  const pageTitle = getPageTitle();

  // Fetch user and role
  useEffect(() => {
    let mounted = true;
    
    async function fetchUser() {
      try {
        const supabase = createClient();

        // Get initial user with error handling for network failures
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (!mounted) return;

        // Handle AuthSessionMissingError gracefully - this is normal for logged out users
        if (error) {
          // Check if it's a network/fetch error
          if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
            console.error('Supabase connection error:', error.message);
            // Don't crash - just show as logged out
            setUser(null);
            setRole(null);
            setAvatarUrl(null);
            setLoading(false);
            return;
          }
          
          // Other auth errors (session missing, etc.) are normal for logged out users
          setUser(null);
          setRole(null);
          setAvatarUrl(null);
          setLoading(false);
          return;
        }

        setUser(user);
        if (user) {
          fetchUserRole(user.id);
        } else {
          setAvatarUrl(null);
          setLoading(false);
        }
      } catch (err: unknown) {
        // Catch any unexpected errors (e.g., Supabase client creation failures)
        console.error('Error fetching user:', err);
        if (!mounted) return;
        setUser(null);
        setRole(null);
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
          fetchUserRole(session.user.id);
        } else {
          setRole(null);
          setAvatarUrl(null);
          setLoading(false);
        }
      });
      subscription = authSubscription;
    } catch (err: unknown) {
      console.error('Error setting up auth listener:', err);
    }

    async function fetchUserRole(userId: string) {
      try {
        const supabase = createClient();
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .maybeSingle();

        if (error) {
          // Log error for debugging
          console.error('[Navbar] Error fetching user role:', {
            error: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
            userId
          });
          // Handle RLS/permission errors gracefully
          setRole(null);
          setAvatarUrl(null);
        } else if (profile && 'role' in profile) {
          const profileData = profile as { role: 'worker' | 'company' | 'admin' };
          console.log('[Navbar] User role fetched successfully:', profileData.role);
          setRole(profileData.role);
          
          // Fetch avatar_url based on role
          if (profileData.role === 'worker') {
            // Fetch avatar_url from worker_details
            const { data: workerDetails } = await supabase
              .from('worker_details')
              .select('avatar_url')
              .eq('profile_id', userId)
              .maybeSingle();
            setAvatarUrl(workerDetails?.avatar_url || null);
          } else if (profileData.role === 'company') {
            // For companies, use logo_url from company_details as avatar
            const { data: companyDetails } = await supabase
              .from('company_details')
              .select('logo_url')
              .eq('profile_id', userId)
              .maybeSingle();
            setAvatarUrl(companyDetails?.logo_url || null);
          } else {
            setAvatarUrl(null);
          }
        } else {
          // Profile doesn't exist or doesn't have role
          console.warn('[Navbar] Profile not found or missing role:', {
            profile,
            userId
          });
          setRole(null);
          setAvatarUrl(null);
        }
      } catch (err: unknown) {
        // Handle AuthSessionMissingError and other errors gracefully
        const error = err as { message?: string };
        console.error('[Navbar] Exception fetching user role:', error);
        if (error?.message?.includes('session') || error?.message?.includes('JWT')) {
          // Session error - user might be logged out
          setUser(null);
          setRole(null);
          setAvatarUrl(null);
        }
        setRole(null);
        setAvatarUrl(null);
      } finally {
        setLoading(false);
      }
    }

    return () => {
      mounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  // Fetch notification counts for company users
  useEffect(() => {
    if (role === 'company' && user) {
      getCompanyNotificationCounts().then(setCounts).catch(() => {
        // Silently fail if there's an error
        setCounts({ applicants: 0, finances: 0 });
      });
    } else {
      setCounts({ applicants: 0, finances: 0 });
    }
  }, [role, user]);

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setUser(null);
      setRole(null);
      setAvatarUrl(null);
      router.push(`/${lang}`);
      router.refresh();
    } catch (error) {
      // Error signing out - user will need to try again
    }
  };

  const getUserInitials = () => {
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const getNotificationCount = (itemName: string) => {
    if (itemName === 'Applicants') return counts.applicants;
    if (itemName === 'Finances') return counts.finances;
    return 0;
  };

  // Map item names to dictionary keys
  const getItemLabel = (name: string) => {
    const labelMap: Record<string, string> = {
      'Dashboard': dict.nav?.dashboard || dict.navigation.dashboard,
      'Shifts': dict.nav?.shifts || 'Shifts',
      'Job Listings': 'Job Listings',
      'Timesheets': dict.nav?.timesheets || dict.navigation.timesheets,
      'Applicants': dict.nav?.applicants || dict.navigation.applicants,
      'Locations': dict.nav?.locations || 'Locations',
      'Templates': 'Templates',
      'Team': 'Team',
      'Finances': dict.nav?.finances || dict.navigation.finances,
    };
    return labelMap[name] || name;
  };

  if (loading) {
    return (
      <nav className="border-b bg-background sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href={role === 'company' ? `/${lang}/dashboard` : '/'} className="italic font-bold text-2xl tracking-tight text-slate-900">
              Staffer
            </Link>
            <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="border-b bg-background sticky top-0 z-50" suppressHydrationWarning={true}>
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between relative">
          <Link href={role === 'company' ? `/${lang}/dashboard` : '/'} className="italic font-bold text-2xl tracking-tight text-slate-900">
            Staffer
          </Link>

          {/* Page Title - Center */}
          {pageTitle && (
            <div className="absolute left-1/2 transform -translate-x-1/2 hidden md:block">
              <h1 className="font-bold text-xl text-foreground">
                {pageTitle}
              </h1>
            </div>
          )}

          {!user ? (
            <div className="flex items-center gap-2">
              <Button variant="ghost" asChild>
                <Link href={`/${lang}/login`}>{dict.navigation.login}</Link>
              </Button>
              <Button asChild>
                <Link href={`/${lang}/register`}>{dict.navigation.register}</Link>
              </Button>
            </div>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-10 w-10 rounded-full p-0 overflow-hidden ring-1 ring-border hover:ring-2 hover:ring-primary/30 focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={avatarUrl || undefined} alt={user?.email || dict.common.user} />
                    <AvatarFallback>{getUserInitials()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                {/* Header */}
                <DropdownMenuLabel>
                  <div>
                    <p className="text-sm font-semibold truncate" title={user?.email || dict.common.user}>
                      {user?.email || dict.common.user}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {role === 'worker' 
                        ? dict.workerNav.roleLabel
                        : role 
                        ? `${dict.navigation.role}: ${role}` 
                        : dict.navigation.noRoleAssigned}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {/* Mobile Navigation Section - Only for company users */}
                {role === 'company' && (
                  <div className="lg:hidden">
                    {(() => {
                      const flat = COMPANY_NAVIGATION.flatMap((c) => c.items);
                      const dashboard = flat.find((i) => i.name === 'Dashboard');
                      const shifts = flat.find((i) => i.name === 'Shifts');
                      const finances = flat.find((i) => i.name === 'Finances');

                      return (
                        <>
                          {dashboard && (
                            <DropdownMenuItem asChild>
                              <Link href={`/${lang}${dashboard.href}`} className="flex w-full items-center gap-2">
                                <dashboard.icon className="h-4 w-4" />
                                <span className="flex-1">{getItemLabel(dashboard.name)}</span>
                              </Link>
                            </DropdownMenuItem>
                          )}
                          {shifts && (
                            <DropdownMenuItem asChild>
                              <Link href={`/${lang}${shifts.href}`} className="flex w-full items-center gap-2">
                                <shifts.icon className="h-4 w-4" />
                                <span className="flex-1">{getItemLabel(shifts.name)}</span>
                              </Link>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem asChild>
                            <Link href={`/${lang}/marketplace`} className="flex w-full items-center gap-2">
                              <Globe className="h-4 w-4" />
                              <span className="flex-1">Job Listings</span>
                            </Link>
                          </DropdownMenuItem>
                          {finances && (
                            <DropdownMenuItem asChild>
                              <Link href={`/${lang}${finances.href}`} className="flex w-full items-center gap-2">
                                <finances.icon className="h-4 w-4" />
                                <span className="flex-1">{getItemLabel(finances.name)}</span>
                                {finances.hasBadge && getNotificationCount(finances.name) > 0 && (
                                  <span className="ml-2 inline-flex items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-bold leading-none text-white min-w-[1.25rem]">
                                    {getNotificationCount(finances.name)}
                                  </span>
                                )}
                              </Link>
                            </DropdownMenuItem>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* Worker Navigation Section - Mobile */}
                {role === 'worker' && (
                  <div className="lg:hidden">
                    <DropdownMenuItem asChild>
                      <Link href={`/${lang}/schedule`} className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{dict.workerNav.calendar}</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/${lang}/applications`} className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        <span>{dict.workerNav.applications}</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/${lang}/finances`} className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        <span>{dict.workerNav.finances}</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </div>
                )}

                {/* Common Links - Always visible */}
                <DropdownMenuSeparator className="lg:hidden" />
                <DropdownMenuItem asChild>
                  <Link
                    href={
                      role === 'company'
                        ? `/${lang}/company/profile`
                        : `/${lang}/profile`
                    }
                    className="flex w-full items-center gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                  <LogOut className="h-4 w-4 mr-2" />
                  <span>{dict.nav?.logout || dict.navigation.logout}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </nav>
  );
}

