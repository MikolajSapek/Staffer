'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getCompanyNotificationCounts } from '@/app/actions/notifications';
import { COMPANY_NAVIGATION, SYSTEM_LINKS, NavigationCategory, NavigationItem } from '@/lib/config/company-navigation';
import { cn } from '@/lib/utils';
import { LogOut, Settings, User } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

interface CompanySidebarProps {
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
    };
    navigation: {
      logout: string;
      role: string;
      noRoleAssigned: string;
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

export function CompanySidebar({ dict, lang }: CompanySidebarProps) {
  // Jeśli lang jest undefined/null, użyj 'en-US'
  const currentLang = lang || 'en-US';
  
  // Debug (opcjonalnie, usuń po testach)
  if (!lang) {
    console.warn('CompanySidebar: lang is missing, using fallback "en-US"');
  }
  
  const pathname = usePathname();
  const router = useRouter();
  const [counts, setCounts] = useState({ applicants: 0, finances: 0 });

  // Fetch notification counts
  useEffect(() => {
    getCompanyNotificationCounts().then(setCounts).catch(() => {
      setCounts({ applicants: 0, finances: 0 });
    });
  }, []);

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
      'Job Listings': (dict as any).jobBoard?.title || 'Job Listings', // Dla SYSTEM_LINKS (marketplace)
      'Timesheets': dict.nav?.timesheets || 'Timesheets',
      'Applicants': dict.nav?.applicants || 'Applicants',
      'Locations': dict.nav?.locations || 'Locations',
      'Templates': (dict as any).dashboard?.templates || 'Templates',
      'Team': (dict as any).dashboard?.team || 'Team',
      'Finances': dict.nav?.finances || 'Finances',
      'Settings': dict.nav?.settings || 'Settings',
      'Support': dict.nav?.support || 'Support',
      'Public Job Board': (dict as any).jobBoard?.title || 'Public Job Board',
    };
    return labelMap[name] || name;
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


  // Filter SYSTEM_LINKS to exclude Settings (it will be in footer)
  // Job Listings and Support stay in main nav
  const systemLinksWithoutSettings = SYSTEM_LINKS.filter(item => item.name !== 'Settings');

  return (
    <div className="flex flex-col h-full">
      {/* Logo - Top */}
      <div className="h-16 flex items-center px-6 border-b">
        <Link href={`/${currentLang}/dashboard`} className="flex items-center">
          <span className="italic font-bold text-2xl tracking-tight text-slate-900">
            Staffer
          </span>
        </Link>
      </div>

      {/* Navigation - Middle (scrollable) */}
      <nav className="flex-1 overflow-y-auto p-4">
        {COMPANY_NAVIGATION.map((category: NavigationCategory) => (
          <div key={category.category} className="mb-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">
              {category.category}
            </h3>
            <ul className="space-y-1">
              {category.items.map((item) => {
                const Icon = item.icon;
                const isItemActive = isActive(item.href);
                const notificationCount = item.hasBadge ? getNotificationCount(item.name) : 0;

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
                      <span className="flex-1">{getItemLabel(item.name)}</span>
                      {notificationCount > 0 && (
                        <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full min-w-[1.25rem]">
                          {notificationCount}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        
        {/* System Links (without Settings) - Still in main nav */}
        {systemLinksWithoutSettings.length > 0 && (
          <div className="mb-6">
            <ul className="space-y-1">
              {systemLinksWithoutSettings.map((item: NavigationItem) => {
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
                      <span className="flex-1">{getItemLabel(item.name)}</span>
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
            href={`/${currentLang}/company/profile`}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              isActive('/company/profile')
                ? "bg-primary text-primary-foreground"
                : "text-gray-700 hover:bg-gray-100"
            )}
          >
            <User className="h-5 w-5 flex-shrink-0" />
            <span className="flex-1">{dict.nav?.profile || 'Profile'}</span>
          </Link>
          
          {/* Settings Link */}
          <Link
            href={`/${currentLang}/settings`}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              isActive('/settings')
                ? "bg-primary text-primary-foreground"
                : "text-gray-700 hover:bg-gray-100"
            )}
          >
            <Settings className="h-5 w-5 flex-shrink-0" />
            <span className="flex-1">{dict.nav?.settings || 'Settings'}</span>
          </Link>
          
          {/* Log Out Button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors text-gray-700 hover:bg-gray-100"
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            <span className="flex-1 text-left">{dict.nav?.logout || dict.navigation.logout}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
