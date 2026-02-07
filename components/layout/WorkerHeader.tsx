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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { WORKER_NAVIGATION } from '@/lib/config/worker-navigation';

interface WorkerHeaderProps {
  lang: string;
}

const PAGE_TITLE_MAP: Record<string, string> = {
  '/market': 'Job Listings',
  '/schedule': 'My Calendar',
  '/applications': 'My Shifts',
  '/finances': 'Finances',
  '/profile': 'My Profile',
  '/worker/settings': 'Settings',
  '/worker/support': 'Support',
  '/dashboard': 'Dashboard',
};

export function WorkerHeader({ lang }: WorkerHeaderProps) {
  const currentLang = lang || 'en-US';
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [workerName, setWorkerName] = useState<{
    first_name: string | null;
    last_name: string | null;
  } | null>(null);
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

  const getPageTitle = () => {
    if (!pathname) return '';
    const pathWithoutLang = pathname.replace(/^\/(en-US|da)/, '') || '/';
    return PAGE_TITLE_MAP[pathWithoutLang] ?? '';
  };

  const isActive = (href: string) => {
    if (!pathname) return false;
    const pathWithoutLang = pathname.replace(/^\/(en-US|da)/, '') || '/';
    const hrefWithoutLang = href.startsWith('/') ? href : `/${href}`;
    if (pathWithoutLang === hrefWithoutLang) return true;
    if (hrefWithoutLang !== '/' && pathWithoutLang.startsWith(hrefWithoutLang))
      return true;
    return false;
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
    if (workerName?.first_name) return workerName.first_name;
    return 'Worker';
  };

  useEffect(() => {
    let mounted = true;

    async function fetchUser() {
      try {
        const supabase = createClient();
        const {
          data: { user: authUser },
          error,
        } = await supabase.auth.getUser();

        if (!mounted) return;

        if (error) {
          setUser(null);
          setAvatarUrl(null);
          setLoading(false);
          return;
        }

        setUser(authUser);
        if (authUser) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', authUser.id)
            .maybeSingle();

          const { data: workerDetails } = await supabase
            .from('worker_details')
            .select('avatar_url')
            .eq('profile_id', authUser.id)
            .maybeSingle();

          setWorkerName(
            profile
              ? {
                  first_name: profile.first_name,
                  last_name: profile.last_name,
                }
              : null
          );
          setAvatarUrl(workerDetails?.avatar_url || null);
        } else {
          setAvatarUrl(null);
          setWorkerName(null);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching user:', err);
        if (!mounted) return;
        setUser(null);
        setAvatarUrl(null);
        setLoading(false);
      }
    }

    fetchUser();

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
              .maybeSingle(),
          ]).then(([{ data: profile }, { data: workerDetails }]) => {
            if (mounted) {
              setWorkerName(
                profile
                  ? {
                      first_name: profile.first_name,
                      last_name: profile.last_name,
                    }
                  : null
              );
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
    } catch (err) {
      console.error('Error setting up auth listener:', err);
    }

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const pageTitle = getPageTitle();

  if (loading) {
    return (
      <header className="relative h-16 border-b border-black/10 bg-white flex items-center px-4 md:px-6 z-20 flex-shrink-0">
        <div className="flex-1 flex items-center min-w-0">
          <div className="h-8 w-8 bg-muted animate-pulse rounded lg:hidden" />
        </div>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="h-6 w-32 bg-muted animate-pulse rounded" />
        </div>
        <div className="flex-1 flex justify-end items-center min-w-0">
          <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
        </div>
      </header>
    );
  }

  return (
    <header className="relative h-16 border-b border-black/10 bg-white flex items-center px-4 md:px-6 z-20 flex-shrink-0">
      {/* Left: Menu button (mobile only) */}
      <div className="flex items-center min-w-0 flex-1">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <button
              className="lg:hidden p-2 -ml-2 rounded-md hover:bg-gray-100 transition-colors flex-shrink-0"
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6 text-slate-700" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <div className="flex flex-col h-full bg-white">
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
                  href={`/${currentLang}/worker/support`}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive('/worker/support')
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
      </div>

      {/* Center: Absolute – Title always perfectly centered */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        {pageTitle ? (
          <h1 className="text-xl font-bold tracking-tight text-foreground whitespace-nowrap">
            {pageTitle}
          </h1>
        ) : (
          <Link
            href={`/${currentLang}/market`}
            className="italic font-bold text-xl tracking-tight text-slate-900 pointer-events-auto"
          >
            Staffer
          </Link>
        )}
      </div>

      {/* Right: Profile block – Name + Email (md+) | Avatar only (mobile), justify-end */}
      <div className="flex items-center justify-end gap-3 flex-shrink-0 min-w-0 flex-1">
        <div className="hidden md:block text-right min-w-0 max-w-[200px]">
          <div className="font-medium text-sm text-foreground truncate">
            {getDisplayName()}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {user?.email || 'User'}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="rounded-full ring-2 ring-white focus:outline-none focus:ring-2 focus:ring-slate-400 flex-shrink-0"
              aria-label="Open account menu"
            >
              <Avatar className="h-10 w-10 rounded-full border-2 border-white shadow-sm">
                <AvatarImage src={avatarUrl ?? undefined} alt="Profile" />
                <AvatarFallback className="rounded-full bg-blue-600 text-white font-bold">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link
                href={`/${currentLang}/profile`}
                className="flex items-center gap-2 cursor-pointer"
              >
                <User className="h-4 w-4" />
                Profil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                href={`/${currentLang}/worker/settings`}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Settings className="h-4 w-4" />
                Ustawienia
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleLogout}
              className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-600"
            >
              <LogOut className="h-4 w-4" />
              Wyloguj
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
