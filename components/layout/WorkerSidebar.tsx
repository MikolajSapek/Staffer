'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { WORKER_NAVIGATION, WORKER_SYSTEM_LINKS, NavigationCategory } from '@/lib/config/worker-navigation';
import { cn } from '@/lib/utils';
import { LogOut } from 'lucide-react';
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

  return (
    <div className="flex flex-col h-full w-64 bg-white border-r">
      {/* Logo - Top */}
      <div className="h-16 flex items-center justify-center px-6 border-b">
        <Link href={`/${currentLang}/market`} className="flex items-center">
          <span className="italic font-bold text-2xl tracking-tight text-slate-900">
            Staffer
          </span>
        </Link>
      </div>

      {/* Navigation - Middle (scrollable) */}
      <nav className="flex-1 overflow-y-auto p-4">
        {WORKER_NAVIGATION.map((category: NavigationCategory) => (
          <div key={category.category || 'main'}>
            <ul className="space-y-0.5">
              {category.items.map((item) => {
                const Icon = item.icon;
                const isItemActive = isActive(item.href);

                return (
                  <li key={item.name}>
                    <Link
                      href={`/${currentLang}${item.href}`}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                        isItemActive
                          ? "bg-slate-900 text-white"
                          : "text-slate-700 hover:bg-slate-100"
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
      </nav>

      {/* Footer - Bottom (Pinned) */}
      <div className="mt-auto border-t border-slate-200 p-4 bg-white space-y-2">
        {WORKER_SYSTEM_LINKS.map((item) => {
          const Icon = item.icon;
          const isItemActive = isActive(item.href);

          return (
            <Link
              key={item.name}
              href={`/${currentLang}${item.href}`}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isItemActive
                  ? "bg-slate-900 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span className="flex-1">{item.name}</span>
            </Link>
          );
        })}
        
        {/* Log Out Button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-slate-700 hover:bg-slate-100 text-left"
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          <span className="flex-1 text-left">Log Out</span>
        </button>
      </div>
    </div>
  );
}
