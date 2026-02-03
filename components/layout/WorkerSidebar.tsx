'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getWorkerNotificationCounts } from '@/app/actions/notifications';
import { WORKER_NAVIGATION } from '@/lib/config/worker-navigation';
import { cn } from '@/lib/utils';
import { LifeBuoy, LogOut, Settings, User } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

interface WorkerSidebarProps {
  dict: {
    nav?: {
      profile?: string;
      support?: string;
      settings?: string;
      logout?: string;
      finances?: string;
    };
    navigation?: { logout?: string; myCalendar?: string; applications?: string };
    jobBoard?: { title?: string };
    workerApplications?: { title?: string };
  };
  lang: string;
}

export function WorkerSidebar({ dict, lang }: WorkerSidebarProps) {
  const currentLang = lang || 'en-US';
  const pathname = usePathname();
  const router = useRouter();
  const [counts, setCounts] = useState({ finances: 0 });

  const refreshCounts = useCallback(() => {
    getWorkerNotificationCounts()
      .then(setCounts)
      .catch(() => setCounts({ finances: 0 }));
  }, []);

  useEffect(() => {
    refreshCounts();
  }, [refreshCounts]);

  // Tabela 'payments' NIE jest w supabase_realtime (dozwolone: shifts, shift_applications, profiles, notification_logs, timesheets, worker_skills).
  // Zamiast Realtime używamy okresowego re-fetch, żeby nie blokować UI na kanale, którego nie ma w publikacji.
  useEffect(() => {
    const intervalId = setInterval(refreshCounts, 60_000); // co 60 sekund
    return () => clearInterval(intervalId);
  }, [refreshCounts]);

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
      'My Calendar': dict.navigation?.myCalendar || 'My Calendar',
      'Job Listings': dict.jobBoard?.title || 'Job Listings',
      'My Shifts': dict.workerApplications?.title || dict.navigation?.applications || 'My Shifts',
      'Finances': dict.nav?.finances || 'Finances',
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

  const mainItems = WORKER_NAVIGATION.flatMap((cat) => cat.items);

  return (
    <div className="flex flex-col h-full bg-[#FFFFFF] border-r border-black/10">
      <div className="h-16 flex items-center justify-center px-6 border-b border-black/10">
        <Link href={`/${currentLang}/market`} className="flex items-center">
          <span className="italic font-bold text-2xl tracking-tight text-[#000000]">
            Staffer
          </span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-0.5">
          {mainItems.map((item) => {
            const Icon = item.icon;
            const isItemActive = isActive(item.href);
            const notificationCount = item.hasBadge ? counts.finances : 0;

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
                      className="inline-flex items-center justify-center min-w-[1rem] h-4 px-1 text-[10px] font-bold leading-none text-white rounded-full"
                      style={{ backgroundColor: '#EF4444' }}
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
          href={`/${currentLang}/profile`}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isActive('/profile')
                ? 'bg-[#000000] text-white'
                : 'text-[#000000] hover:bg-[#F3F4F6]'
            )}
          >
            <User className="h-5 w-5 flex-shrink-0" />
            <span>{dict.nav?.profile || 'Profile'}</span>
          </Link>

        <Link
          href={`/${currentLang}/worker/support`}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
            isActive('/worker/support')
              ? 'bg-[#000000] text-white'
              : 'text-[#000000] hover:bg-[#F3F4F6]'
          )}
        >
          <LifeBuoy className="h-5 w-5 flex-shrink-0" />
          <span>{dict.nav?.support || 'Support'}</span>
        </Link>

        <Link
          href={`/${currentLang}/worker/settings`}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
            isActive('/worker/settings')
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
