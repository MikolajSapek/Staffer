'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { getCompanyNotificationCounts } from '@/app/actions/notifications';
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
      candidates: string;
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
      candidates: string;
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
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [role, setRole] = useState<'worker' | 'company' | 'admin' | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ candidates: 0, finances: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);

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
      '/shifts': 'Shifts',
      '/candidates': 'Applicants',
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Fetch user and role
  useEffect(() => {
    const supabase = createClient();

    // Get initial user
    supabase.auth.getUser().then(({ data: { user }, error }) => {
      // Handle AuthSessionMissingError gracefully - this is normal for logged out users
      if (error) {
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
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRole(session.user.id);
      } else {
        setRole(null);
        setAvatarUrl(null);
        setLoading(false);
      }
    });

    async function fetchUserRole(userId: string) {
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .maybeSingle();

        if (error) {
          // Handle RLS/permission errors gracefully
          setRole(null);
          setAvatarUrl(null);
        } else if (profile && 'role' in profile) {
          const profileData = profile as { role: 'worker' | 'company' | 'admin' };
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
          setRole(null);
          setAvatarUrl(null);
        }
      } catch (err: unknown) {
        // Handle AuthSessionMissingError and other errors gracefully
        const error = err as { message?: string };
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
      subscription.unsubscribe();
    };
  }, []);

  // Fetch notification counts for company users
  useEffect(() => {
    if (role === 'company' && user) {
      getCompanyNotificationCounts().then(setCounts).catch(() => {
        // Silently fail if there's an error
        setCounts({ candidates: 0, finances: 0 });
      });
    } else {
      setCounts({ candidates: 0, finances: 0 });
    }
  }, [role, user]);

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setIsOpen(false);
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

  const toggleDropdown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);
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
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={toggleDropdown}
                className="rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary cursor-pointer"
                aria-label={dict.navigation.userMenu}
                type="button"
              >
                <Avatar>
                  <AvatarImage src={avatarUrl || undefined} alt={user?.email || dict.common.user} />
                  <AvatarFallback>{getUserInitials()}</AvatarFallback>
                </Avatar>
              </button>

              {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-[100]">
                  {/* SEKCJA 1: ZAWSZE WIDOCZNA - HEADER */}
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900 truncate max-w-[200px]" title={user?.email || dict.common.user}>
                      {user?.email || dict.common.user}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {role === 'worker' 
                        ? dict.workerNav.roleLabel
                        : role 
                        ? `${dict.navigation.role}: ${role}` 
                        : dict.navigation.noRoleAssigned}
                    </p>
                  </div>

                  {/* SEKCJA 2: OPCJE ZALEŻNE OD ROLI */}
                  {role === 'worker' && (
                    <>
                      <Link
                        href={`/${lang}/schedule`}
                        onClick={() => setIsOpen(false)}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {dict.workerNav.calendar}
                      </Link>
                      <Link
                        href={`/${lang}/applications`}
                        onClick={() => setIsOpen(false)}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <Briefcase className="mr-2 h-4 w-4" />
                        {dict.workerNav.applications}
                      </Link>
                      <Link
                        href={`/${lang}/finances`}
                        onClick={() => setIsOpen(false)}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <DollarSign className="mr-2 h-4 w-4" />
                        {dict.workerNav.finances}
                      </Link>
                    </>
                  )}

                  {role === 'company' && (
                    <>
                      <Link
                        href={`/${lang}/dashboard`}
                        onClick={() => setIsOpen(false)}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        {dict.nav?.dashboard || dict.navigation.dashboard}
                      </Link>
                      <Link
                        href={`/${lang}/shifts`}
                        onClick={() => setIsOpen(false)}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <Clock className="mr-2 h-4 w-4" />
                        {dict.nav?.shifts || 'Shifts'}
                      </Link>
                      <Link
                        href={`/${lang}/locations`}
                        onClick={() => setIsOpen(false)}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <MapPin className="mr-2 h-4 w-4" />
                        {dict.nav?.locations || 'Locations'}
                      </Link>
                      <Link
                        href={`/${lang}/candidates`}
                        onClick={() => setIsOpen(false)}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <Users className="mr-2 h-4 w-4" />
                        <span className="flex items-center">
                          {dict.nav?.candidates || dict.navigation.candidates}
                          {counts.candidates > 0 && (
                            <span className="ml-2 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full min-w-[1.25rem]">
                              {counts.candidates}
                            </span>
                          )}
                        </span>
                      </Link>
                      <Link
                        href={`/${lang}/timesheets`}
                        onClick={() => setIsOpen(false)}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        {dict.nav?.timesheets || dict.navigation.timesheets}
                      </Link>
                      <Link
                        href={`/${lang}/billing`}
                        onClick={() => setIsOpen(false)}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <Wallet className="mr-2 h-4 w-4" />
                        <span className="flex items-center">
                          {dict.nav?.finances || dict.navigation.finances}
                          {counts.finances > 0 && (
                            <span className="ml-2 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full min-w-[1.25rem]">
                              {counts.finances}
                            </span>
                          )}
                        </span>
                      </Link>
                    </>
                  )}

                  {/* SEKCJA 3: ZAWSZE WIDOCZNA - STOPKA */}
                  <div className="border-t border-gray-100 mt-1">
                    <Link
                      href={`/${lang}`}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <Globe className="mr-2 h-4 w-4" />
                      {dict.jobBoard?.title || 'Job Board'}
                    </Link>
                    <Link
                      href={`/${lang}/profile`}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <UserCircle className="mr-2 h-4 w-4" />
                      {dict.nav?.profile || dict.navigation.profile}
                    </Link>
                    <Link
                      href={`/${lang}/support`}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <LifeBuoy className="mr-2 h-4 w-4" />
                      {dict.nav?.support || 'Support'}
                    </Link>
                    {role === 'worker' && (
                      <Link
                        href={`/${lang}/worker/settings`}
                        onClick={() => setIsOpen(false)}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        {dict.nav?.settings || 'Settings'}
                      </Link>
                    )}
                    {role === 'company' && (
                      <Link
                        href={`/${lang}/settings`}
                        onClick={() => setIsOpen(false)}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        {dict.nav?.settings || 'Settings'}
                      </Link>
                    )}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    {dict.nav?.logout || dict.navigation.logout}
                  </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

