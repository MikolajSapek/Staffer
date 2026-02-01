'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { WORKER_NAVIGATION, WORKER_SYSTEM_LINKS, NavigationCategory, NavigationItem } from '@/lib/config/worker-navigation';
import { cn } from '@/lib/utils';
import { LogOut, Settings, User } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

interface WorkerSidebarProps {
  lang: string;
}

export function WorkerSidebar({ lang }: WorkerSidebarProps) {
  // Fallback: jeśli lang jest undefined/null, użyj 'en-US' (Kluczowe dla uniknięcia błędów routingu!)
  const currentLang = lang || 'en-US';
  
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) => {
    if (!pathname) return false;
    const pathWithoutLang = pathname.replace(/^\/(en-US|da)/, '') || '/';
    const hrefWithoutLang = href.startsWith('/') ? href : `/${href}`;
    
    // Exact match
    if (pathWithoutLang === hrefWithoutLang) return true;
    
    // For nested routes, check if pathname starts with href
    if (hrefWithoutLang !== '/' && pathWithoutLang.startsWith(hrefWithoutLang)) return true;
    
    return false;
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

  // Filter WORKER_SYSTEM_LINKS to exclude Settings and Profile (they will be in footer)
  // Support stays in main nav
  const systemLinksForMainNav = WORKER_SYSTEM_LINKS.filter(item => item.name !== 'Settings' && item.name !== 'Profile');

  return (
    <div className="flex flex-col h-full w-64 bg-white border-r">
      {/* Logo - Top */}
      <div className="h-16 flex items-center px-6 border-b">
        <Link href={`/${currentLang}/market`} className="flex items-center">
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
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                        isItemActive
                          ? "bg-primary text-primary-foreground"
                          : "text-gray-700 hover:bg-gray-100"
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
        
        {/* System Links (Support) - Still in main nav */}
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
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                        isItemActive
                          ? "bg-primary text-primary-foreground"
                          : "text-gray-700 hover:bg-gray-100"
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
      <div className="mt-auto border-t border-slate-800/50 p-4 bg-white">
        <div className="space-y-1">
          {/* Profile Link */}
          <Link
            href={`/${currentLang}/profile`}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              isActive('/profile')
                ? "bg-primary text-primary-foreground"
                : "text-gray-700 hover:bg-gray-100"
            )}
          >
            <User className="h-5 w-5 flex-shrink-0" />
            <span className="flex-1">Profile</span>
          </Link>
          
          {/* Settings Link */}
          <Link
            href={`/${currentLang}/worker/settings`}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              isActive('/worker/settings')
                ? "bg-primary text-primary-foreground"
                : "text-gray-700 hover:bg-gray-100"
            )}
          >
            <Settings className="h-5 w-5 flex-shrink-0" />
            <span className="flex-1">Settings</span>
          </Link>
          
          {/* Log Out Button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors text-gray-700 hover:bg-gray-100"
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            <span className="flex-1 text-left">Log Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
