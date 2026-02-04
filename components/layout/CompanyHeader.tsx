'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Menu, LogOut, LifeBuoy, User, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet';
import { COMPANY_NAVIGATION_ITEMS } from '@/lib/config/company-navigation';
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
      finances?: string;
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
    jobBoard?: { title?: string };
  };
  lang: string;
}

export function CompanyHeader({ dict, lang }: CompanyHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const currentLang = lang || 'en-US';
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [counts, setCounts] = useState({ applicants: 0, finances: 0 });

  const isActive = (href: string) => {
    if (!pathname) return false;
    const pathWithoutLang = pathname.replace(/^\/(en-US|da)/, '') || '/';
    const hrefWithoutLang = href.startsWith('/') ? href : `/${href}`;
    if (pathWithoutLang === hrefWithoutLang) return true;
    if (hrefWithoutLang !== '/' && pathWithoutLang.startsWith(hrefWithoutLang)) return true;
    return false;
  };

  const getItemLabel = (name: string) => {
    const labelMap: Record<string, string> = {
      'Dashboard': dict.nav?.dashboard || 'Dashboard',
      'Shifts': dict.nav?.shifts || 'Shifts',
      'Job Listings': dict.nav?.jobListings || 'Job Listings',
      'Applicants': dict.nav?.applicants || 'Applicants',
      'Timesheets': dict.nav?.timesheets || 'Timesheets',
      'Locations': dict.nav?.locations || 'Locations',
      'Templates': dict.dashboard?.templates || 'Templates',
      'Team': dict.dashboard?.team || 'Team',
      'Finances': dict.nav?.finances || 'Finances',
      'Settings': dict.nav?.settings || 'Settings',
      'Support': dict.nav?.support || 'Support',
      'Public Job Board': dict.jobBoard?.title || 'Public Job Board',
    };
    return labelMap[name] || name;
  };

  const getNotificationCount = (itemName: string) => {
    if (itemName === 'Applicants') return counts.applicants;
    if (itemName === 'Finances') return counts.finances;
    return 0;
  };

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setMobileMenuOpen(false);
      router.push(`/${currentLang}`);
      router.refresh();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getPageTitle = () => {
    if (!pathname) return '';
    const pathWithoutLang = pathname.replace(/^\/(en-US|da)/, '') || '/';
    const titleMap: Record<string, string> = {
      '/dashboard': dict.nav?.dashboard || 'Dashboard',
      '/listings': dict.nav?.shifts || 'Shifts',
      '/market': dict.nav?.jobListings || 'Job Listings',
      '/timesheets': dict.nav?.timesheets || 'Timesheets',
      '/applicants': dict.nav?.applicants || 'Applicants',
      '/locations': dict.nav?.locations || 'Locations',
      '/templates': dict.dashboard?.templates || 'Templates',
      '/managers': dict.dashboard?.team || 'Team',
      '/staff': 'Staff',
      '/billing': dict.nav?.finances || 'Finances',
      '/settings': dict.nav?.settings || 'Settings',
      '/company/profile': dict.nav?.profile || 'Profile',
      '/support': dict.nav?.support || 'Support',
      '/marketplace': dict.jobBoard?.title || 'Job Listings',
      '/create-shift': 'Create Shift',
    };
    return titleMap[pathWithoutLang] || '';
  };

  useEffect(() => {
    getCompanyNotificationCounts().then(setCounts).catch(() => {
      setCounts({ applicants: 0, finances: 0 });
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    async function fetchUser() {
      try {
        const supabase = createClient();
        const { data: { user }, error } = await supabase.auth.getUser();
        if (!mounted) return;
        if (error) {
          setUser(null);
          setAvatarUrl(null);
          setLoading(false);
          return;
        }
        setUser(user);
        if (user) {
          const { data: companyDetails } = await supabase
            .from('company_details')
            .select('logo_url, company_name')
            .eq('profile_id', user.id)
            .maybeSingle();
          setAvatarUrl(companyDetails?.logo_url || null);
          setCompanyName(companyDetails?.company_name || null);
        } else {
          setAvatarUrl(null);
          setCompanyName(null);
        }
        setLoading(false);
      } catch (err) {
        if (mounted) {
          setUser(null);
          setAvatarUrl(null);
          setLoading(false);
        }
      }
    }
    fetchUser();
    let subscription: { unsubscribe: () => void } | null = null;
    try {
      const supabase = createClient();
      const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((_e, session) => {
        if (!mounted) return;
        setUser(session?.user ?? null);
        if (session?.user) {
          createClient()
            .from('company_details')
            .select('logo_url, company_name')
            .eq('profile_id', session.user.id)
            .maybeSingle()
            .then(({ data }) => {
              if (mounted) {
                setAvatarUrl(data?.logo_url || null);
                setCompanyName(data?.company_name || null);
              }
            });
        } else {
          setAvatarUrl(null);
          setCompanyName(null);
        }
      });
      subscription = authSub;
    } catch (_) {}
    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const getUserInitials = () => {
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return 'U';
  };

  const pageTitle = getPageTitle();

  if (loading) {
    return (
      <header className="h-16 border-b bg-white flex items-center justify-between px-4 md:px-6 z-20">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-muted animate-pulse rounded lg:hidden" />
          <div className="h-6 w-32 bg-muted animate-pulse rounded" />
        </div>
        <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
      </header>
    );
  }

  return (
    <header className="h-16 border-b bg-white flex items-center justify-between px-4 md:px-6 z-20">
      {/* Left: Mobile hamburger + Page title (desktop) */}
      <div className="flex items-center gap-3">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <button
              className="lg:hidden p-2 -ml-2 rounded-md hover:bg-gray-100 transition-colors"
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6 text-slate-700" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <div className="flex flex-col h-full bg-white">
              <div className="h-16 flex items-center px-6 border-b border-slate-200">
                <Link
                  href={`/${currentLang}/dashboard`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center"
                >
                  <span className="italic font-bold text-2xl tracking-tight text-slate-900">
                    Staffer
                  </span>
                </Link>
              </div>
              <nav className="flex-1 overflow-y-auto p-4">
                <ul className="space-y-0.5">
                  {COMPANY_NAVIGATION_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isItemActive = isActive(item.href);
                    const notificationCount = item.hasBadge ? getNotificationCount(item.name) : 0;
                    return (
                      <li key={item.name}>
                        <Link
                          href={`/${currentLang}${item.href}`}
                          onClick={() => setMobileMenuOpen(false)}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                            isItemActive
                              ? 'bg-slate-900 text-white'
                              : 'text-slate-700 hover:bg-slate-100'
                          )}
                        >
                          <Icon className="h-5 w-5 flex-shrink-0" />
                          <span className="flex-1">{getItemLabel(item.name)}</span>
                          {item.hasBadge && notificationCount > 0 && (
                            <span
                              className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white rounded-full min-w-[1.25rem]"
                              style={{ backgroundColor: '#EF4444' }}
                            >
                              {notificationCount}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
              <div className="mt-auto border-t border-slate-200 p-4 bg-white">
                <div className="space-y-0.5">
                  <Link
                    href={`/${currentLang}/company/profile`}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive('/company/profile')
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-700 hover:bg-slate-100'
                    )}
                  >
                    <User className="h-5 w-5 flex-shrink-0" />
                    <span>{dict.nav?.profile || 'Profile'}</span>
                  </Link>
                  <Link
                    href={`/${currentLang}/support`}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive('/support')
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-700 hover:bg-slate-100'
                    )}
                  >
                    <LifeBuoy className="h-5 w-5 flex-shrink-0" />
                    <span>{dict.nav?.support || 'Support'}</span>
                  </Link>
                  <Link
                    href={`/${currentLang}/settings`}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive('/settings')
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-700 hover:bg-slate-100'
                    )}
                  >
                    <Settings className="h-5 w-5 flex-shrink-0" />
                    <span>{dict.nav?.settings || 'Settings'}</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-slate-700 hover:bg-slate-100 text-left"
                  >
                    <LogOut className="h-5 w-5 flex-shrink-0" />
                    <span>{dict.nav?.logout || dict.navigation?.logout || 'Log out'}</span>
                  </button>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <Link
          href={`/${currentLang}/dashboard`}
          className="lg:hidden italic font-bold text-xl tracking-tight text-slate-900"
        >
          Staffer
        </Link>

        {pageTitle && (
          <h1 className="hidden lg:block font-bold text-xl text-foreground">
            {pageTitle}
          </h1>
        )}
      </div>

      {/* Right: Company Identity Block */}
      <div className="flex items-center gap-3 ml-auto flex-row flex-shrink-0">
        <div className="text-right hidden sm:block">
          <div className="font-bold text-sm text-slate-900">
            {companyName || 'Company'}
          </div>
          <div className="text-xs text-slate-500 truncate max-w-[180px]">
            {user?.email || dict.common.user}
          </div>
        </div>
        <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-sm ring-2 ring-white flex-shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Profile"
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            <span className="font-bold">{getUserInitials()}</span>
          )}
        </div>
      </div>
    </header>
  );
}
