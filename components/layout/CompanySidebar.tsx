'use client';

import { useEffect, useState } from 'react';
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
  const [counts, setCounts] = useState({ applicants: 0, finances: 0 });

  useEffect(() => {
    getCompanyNotificationCounts().then(setCounts).catch(() => {
      setCounts({ applicants: 0, finances: 0 });
    });
  }, []);

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
    if (itemName === 'Finances') return counts.finances;
    return 0;
  };

  const getItemLabel = (name: string) => {
    const labelMap: Record<string, string> = {
      Dashboard: dict.nav?.dashboard || 'Dashboard',
      Shifts: dict.nav?.shifts || 'Shifts',
      Applicants: dict.nav?.applicants || 'Applicants',
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
    <div className="flex flex-col h-full bg-white">
      <div className="h-16 flex items-center justify-center px-6 border-b border-slate-200">
        <Link href={`/${currentLang}/dashboard`} className="flex items-center">
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
                      className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-[11px] font-bold leading-none text-white rounded-full"
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
          href={`/${currentLang}/company/profile`}
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
  );
}
