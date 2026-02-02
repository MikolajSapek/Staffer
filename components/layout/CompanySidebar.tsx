'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getCompanyNotificationCounts } from '@/app/actions/notifications';
import { COMPANY_NAVIGATION_ITEMS } from '@/lib/config/company-navigation';
import { cn } from '@/lib/utils';
import { LifeBuoy, LogOut, Settings, User } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

interface CompanySidebarProps {
  dict: {
      nav?: {
      dashboard: string;
      shifts: string;
      applicants: string;
      timesheets: string;
      profile: string;
      support: string;
      settings: string;
      logout: string;
      finances: string;
    };
    navigation: {
      logout: string;
      role: string;
      noRoleAssigned: string;
    };
    common: {
      user: string;
    };
  };
  lang: string;
}

export function CompanySidebar({ dict, lang }: CompanySidebarProps) {
  const currentLang = lang || 'en-US';
  const pathname = usePathname();
  const router = useRouter();
  const [counts, setCounts] = useState({ applicants: 0, finances: 0, timesheets: 0 });

  const refreshCounts = useCallback(() => {
    getCompanyNotificationCounts()
      .then(setCounts)
      .catch(() => setCounts({ applicants: 0, finances: 0, timesheets: 0 }));
  }, []);

  useEffect(() => {
    refreshCounts();
  }, [refreshCounts]);

  // Realtime: refetch counts when timesheets or shift_applications change (instant badge update)
  // Tabele w supabase_realtime: shifts, shift_applications, profiles, notification_logs, timesheets, worker_skills
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('sidebar-notification-counts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'timesheets' },
        () => refreshCounts()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shift_applications' },
        () => refreshCounts()
      )
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') {
          console.warn('Realtime subscription failed for tables timesheets, shift_applications:', status);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshCounts]);

  const isActive = (href: string) => {
    if (!pathname) return false;
    const pathWithoutLang = pathname.replace(/^\/(en-US|da)/, '') || '/';
    const hrefWithoutLang = href.startsWith('/') ? href : `/${href}`;
    if (pathWithoutLang === hrefWithoutLang) return true;
    if (hrefWithoutLang !== '/' && pathWithoutLang.startsWith(hrefWithoutLang)) return true;
    return false;
  };

  const getNotificationCount = (itemName: string) => {
    if (itemName === 'Applicants') return counts.applicants;
    if (itemName === 'Timesheets') return counts.timesheets;
    if (itemName === 'Finances') return counts.finances;
    return 0;
  };

  const getItemLabel = (name: string) => {
    const labelMap: Record<string, string> = {
      Dashboard: dict.nav?.dashboard || 'Dashboard',
      Shifts: dict.nav?.shifts || 'Shifts',
      Applicants: dict.nav?.applicants || 'Applicants',
      Timesheets: dict.nav?.timesheets || 'Timesheets',
      Finances: dict.nav?.finances || 'Finances',
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

  return (
    <div className="flex flex-col h-full bg-[#FFFFFF] border-r border-black/10">
      <div className="h-16 flex items-center justify-center px-6 border-b border-black/10">
        <Link href={`/${currentLang}/dashboard`} className="flex items-center">
          <span className="italic font-bold text-2xl tracking-tight text-[#000000]">
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
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isItemActive
                      ? 'bg-[#000000] text-white'
                      : 'text-[#000000] hover:bg-[#F3F4F6]'
                  )}
                >
                  <Icon className={cn('h-5 w-5 flex-shrink-0', isItemActive ? 'text-white' : 'text-[#000000]')} />
                  <span className="flex-1">{getItemLabel(item.name)}</span>
                  {item.hasBadge && notificationCount > 0 ? (
                    <span
                      className="inline-flex items-center justify-center min-w-[1rem] h-4 px-1 text-[10px] font-bold leading-none text-white rounded-full bg-[#000000]"
                    >
                      {notificationCount}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-auto border-t border-black/10 p-4 bg-[#FFFFFF] space-y-2">
        <Link
          href={`/${currentLang}/company/profile`}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
            isActive('/company/profile')
              ? 'bg-[#000000] text-white'
              : 'text-[#000000] hover:bg-[#F3F4F6]'
          )}
        >
          <User className="h-5 w-5 flex-shrink-0" />
          <span>{dict.nav?.profile || 'Profile'}</span>
        </Link>

        <Link
          href={`/${currentLang}/support`}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
            isActive('/support')
              ? 'bg-[#000000] text-white'
              : 'text-[#000000] hover:bg-[#F3F4F6]'
          )}
        >
          <LifeBuoy className="h-5 w-5 flex-shrink-0" />
          <span>{dict.nav?.support || 'Support'}</span>
        </Link>

        <Link
          href={`/${currentLang}/settings`}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
            isActive('/settings')
              ? 'bg-[#000000] text-white'
              : 'text-[#000000] hover:bg-[#F3F4F6]'
          )}
        >
          <Settings className="h-5 w-5 flex-shrink-0" />
          <span>{dict.nav?.settings || 'Settings'}</span>
        </Link>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-[#000000] hover:bg-[#F3F4F6] text-left"
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          <span>{dict.nav?.logout || dict.navigation?.logout || 'Log out'}</span>
        </button>
      </div>
    </div>
  );
}
