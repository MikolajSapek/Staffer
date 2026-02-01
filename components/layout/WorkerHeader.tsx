'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { getWorkerNotificationCounts } from '@/app/actions/notifications';
import { Menu, LogOut, User, LifeBuoy, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet';
import { WORKER_NAVIGATION } from '@/lib/config/worker-navigation';

interface WorkerHeaderProps {
  lang: string;
}

export function WorkerHeader({ lang }: WorkerHeaderProps) {
  const currentLang = lang || 'en-US';
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [workerName, setWorkerName] = useState<{ first_name: string | null; last_name: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [counts, setCounts] = useState({ finances: 0 });

  const refreshCounts = useCallback(() => {
    getWorkerNotificationCounts()
      .then(setCounts)
      .catch(() => setCounts({ finances: 0 }));
  }, []);

  useEffect(() => {
    refreshCounts();
  }, [refreshCounts]);

  // Check if a nav item is active
  const isActive = (href: string) => {
    if (!pathname) return false;
    const pathWithoutLang = pathname.replace(/^\/(en-US|da)/, '') || '/';
    const hrefWithoutLang = href.startsWith('/') ? href : `/${href}`;
    if (pathWithoutLang === hrefWithoutLang) return true;
    if (hrefWithoutLang !== '/' && pathWithoutLang.startsWith(hrefWithoutLang)) return true;
    return false;
  };

  // Handle logout
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
      '/schedule': 'My Schedule',
      '/applications': 'My Shifts',
      '/finances': 'Financial Overview',
      '/profile': 'My Profile',
      '/market': 'Job Listings',
      '/support': 'Support',
      '/worker/settings': 'Settings',
    };
    
    return titleMap[pathWithoutLang] || '';
  };

  // Fetch user and worker details
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
          // Fetch worker details (avatar and name)
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', user.id)
            .maybeSingle();
          
          const { data: workerDetails } = await supabase
            .from('worker_details')
            .select('avatar_url')
            .eq('profile_id', user.id)
            .maybeSingle();
          
          setWorkerName(profile ? { first_name: profile.first_name, last_name: profile.last_name } : null);
          setAvatarUrl(workerDetails?.avatar_url || null);
        } else {
          setAvatarUrl(null);
          setWorkerName(null);
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
          Promise.all([
            supabase
              .from('profiles')
              .select('first_name, last_name')
              .eq('id', session.user.id)
              .maybeSingle(),
            supabase
              .from('worker_details')
              .select('avatar_url')
              .eq('profile_id', session.user.id)
              .maybeSingle()
          ]).then(([{ data: profile }, { data: workerDetails }]) => {
            if (mounted) {
              setWorkerName(profile ? { first_name: profile.first_name, last_name: profile.last_name } : null);
              setAvatarUrl(workerDetails?.avatar_url || null);
            }
          });
        } else {
          setAvatarUrl(null);
          setWorkerName(null);
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
    if (workerName?.first_name) {
      return workerName.first_name.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const getDisplayName = () => {
    if (workerName?.first_name && workerName?.last_name) {
      return `${workerName.first_name} ${workerName.last_name}`;
    }
    if (workerName?.first_name) {
      return workerName.first_name;
    }
    return 'Worker';
  };

  const pageTitle = getPageTitle();

  if (loading) {
    return (
      <header className="h-16 border-b bg-white flex items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-muted animate-pulse rounded md:hidden" />
          <div className="h-6 w-32 bg-muted animate-pulse rounded" />
        </div>
        <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
      </header>
    );
  }

  return (
    <header className="h-16 border-b bg-white flex items-center justify-between px-4 md:px-6 z-20">
      {/* Mobile: Hamburger Menu + Logo | Desktop: Page Title */}
      <div className="flex items-center gap-3">
        {/* Mobile Menu Trigger - visible when sidebar is hidden (lg breakpoint) */}
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
            {/* Mobile Navigation - same structure as WorkerSidebar */}
            <div className="flex flex-col h-full bg-white">
              {/* Logo - Top */}
              <div className="h-16 flex items-center justify-center px-6 border-b">
                <Link
                  href={`/${currentLang}/market`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center"
                >
                  <span className="italic font-bold text-2xl tracking-tight text-slate-900">
                    Staffer
                  </span>
                </Link>
              </div>

              {/* Navigation - Middle (scrollable, flat, no category headers) */}
              <nav className="flex-1 overflow-y-auto p-4">
                <ul className="space-y-0.5">
                  {WORKER_NAVIGATION.flatMap((cat) => cat.items).map((item) => {
                    const Icon = item.icon;
                    const isItemActive = isActive(item.href);
                    const notificationCount = item.hasBadge ? counts.finances : 0;

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
                          <span className="flex-1">{item.name}</span>
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

              {/* Footer - Bottom: Profile, Support, Settings, Log Out */}
              <div className="mt-auto border-t border-slate-200 p-4 bg-white space-y-2">
                <Link
                  href={`/${currentLang}/profile`}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive('/profile')
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  )}
                >
                  <User className="h-5 w-5 flex-shrink-0" />
                  <span>Profile</span>
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
                  <span>Support</span>
                </Link>
                <Link
                  href={`/${currentLang}/worker/settings`}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive('/worker/settings')
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  )}
                >
                  <Settings className="h-5 w-5 flex-shrink-0" />
                  <span>Settings</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-slate-700 hover:bg-slate-100 text-left"
                >
                  <LogOut className="h-5 w-5 flex-shrink-0" />
                  <span>Log out</span>
                </button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Mobile: Logo (hidden on lg+) */}
        <Link
          href={`/${currentLang}/market`}
          className="lg:hidden italic font-bold text-xl tracking-tight text-slate-900"
        >
          Staffer
        </Link>

        {/* Desktop: Page Title (hidden on mobile) */}
        {pageTitle && (
          <h1 className="hidden lg:block font-bold text-xl text-foreground">
            {pageTitle}
          </h1>
        )}
      </div>

      {/* Worker Identity - Top right: first_name last_name (Bold), email (gray small), right-aligned */}
      <div className="flex items-center gap-3 ml-auto flex-row flex-shrink-0 justify-end">
        <div className="text-right hidden sm:block">
          <div className="font-bold text-sm text-slate-900">
            {getDisplayName()}
          </div>
          <div className="text-xs text-slate-500 truncate max-w-[180px]">
            {user?.email || 'User'}
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
