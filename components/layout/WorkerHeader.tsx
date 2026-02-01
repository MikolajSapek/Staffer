'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Menu, LogOut, Settings, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  WORKER_NAVIGATION,
  WORKER_SYSTEM_LINKS,
  NavigationCategory,
  NavigationItem,
} from '@/lib/config/worker-navigation';

interface WorkerHeaderProps {
  lang: string;
}

export function WorkerHeader({ lang }: WorkerHeaderProps) {
  const currentLang = lang || 'en-US';
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  // Get page title based on pathname
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

  // Filter system links for main nav (exclude Settings and Profile - they're in footer)
  const systemLinksForMainNav = WORKER_SYSTEM_LINKS.filter(
    (item) => item.name !== 'Settings' && item.name !== 'Profile'
  );

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
          // Fetch worker avatar
          const { data: workerDetails } = await supabase
            .from('worker_details')
            .select('avatar_url')
            .eq('profile_id', user.id)
            .maybeSingle();
          
          setAvatarUrl(workerDetails?.avatar_url || null);
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
            .from('worker_details')
            .select('avatar_url')
            .eq('profile_id', session.user.id)
            .maybeSingle()
            .then(({ data: workerDetails }) => {
              if (mounted) {
                setAvatarUrl(workerDetails?.avatar_url || null);
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
        {/* Mobile Menu Trigger - only visible on mobile */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <button
              className="md:hidden p-2 -ml-2 rounded-md hover:bg-gray-100 transition-colors"
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
              <div className="h-16 flex items-center px-6 border-b">
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

              {/* Navigation - Middle (scrollable) */}
              <nav className="flex-1 overflow-y-auto p-4">
                {WORKER_NAVIGATION.map((category: NavigationCategory) => (
                  <div key={category.category} className="mb-6">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">
                      {category.category}
                    </h3>
                    <ul className="space-y-1">
                      {category.items.map((item) => {
                        const Icon = item.icon;
                        const isItemActive = isActive(item.href);

                        return (
                          <li key={item.name}>
                            <Link
                              href={`/${currentLang}${item.href}`}
                              onClick={() => setMobileMenuOpen(false)}
                              className={cn(
                                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                                isItemActive
                                  ? 'bg-primary text-primary-foreground'
                                  : 'text-gray-700 hover:bg-gray-100'
                              )}
                            >
                              <Icon className="h-5 w-5 flex-shrink-0" />
                              <span className="flex-1">{item.name}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}

                {/* System Links (Support) */}
                {systemLinksForMainNav.length > 0 && (
                  <div className="mb-6">
                    <ul className="space-y-1">
                      {systemLinksForMainNav.map((item: NavigationItem) => {
                        const Icon = item.icon;
                        const isItemActive = isActive(item.href);

                        return (
                          <li key={item.name}>
                            <Link
                              href={`/${currentLang}${item.href}`}
                              onClick={() => setMobileMenuOpen(false)}
                              className={cn(
                                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                                isItemActive
                                  ? 'bg-primary text-primary-foreground'
                                  : 'text-gray-700 hover:bg-gray-100'
                              )}
                            >
                              <Icon className="h-5 w-5 flex-shrink-0" />
                              <span className="flex-1">{item.name}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </nav>

              {/* Footer - Bottom (Pinned) */}
              <div className="mt-auto border-t p-4 bg-white">
                <div className="space-y-1">
                  {/* Profile Link */}
                  <Link
                    href={`/${currentLang}/profile`}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                      isActive('/profile')
                        ? 'bg-primary text-primary-foreground'
                        : 'text-gray-700 hover:bg-gray-100'
                    )}
                  >
                    <User className="h-5 w-5 flex-shrink-0" />
                    <span className="flex-1">Profile</span>
                  </Link>

                  {/* Settings Link */}
                  <Link
                    href={`/${currentLang}/worker/settings`}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                      isActive('/worker/settings')
                        ? 'bg-primary text-primary-foreground'
                        : 'text-gray-700 hover:bg-gray-100'
                    )}
                  >
                    <Settings className="h-5 w-5 flex-shrink-0" />
                    <span className="flex-1">Settings</span>
                  </Link>

                  {/* Log Out Button */}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors text-gray-700 hover:bg-gray-100"
                  >
                    <LogOut className="h-5 w-5 flex-shrink-0" />
                    <span className="flex-1 text-left">Log Out</span>
                  </button>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Mobile: Logo (hidden on md+) */}
        <Link
          href={`/${currentLang}/market`}
          className="md:hidden italic font-bold text-xl tracking-tight text-slate-900"
        >
          Staffer
        </Link>

        {/* Desktop: Page Title (hidden on mobile) */}
        {pageTitle && (
          <h1 className="hidden md:block font-bold text-xl text-foreground">
            {pageTitle}
          </h1>
        )}
      </div>

      {/* User Profile - Right: email + avatar in one line */}
      <div className="flex items-center gap-3 ml-auto flex-row flex-shrink-0">
        <span
          className="text-sm font-medium text-slate-700 truncate max-w-[180px] hidden sm:block"
          title={user?.email || 'User'}
        >
          {user?.email || 'User'}
        </span>
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
