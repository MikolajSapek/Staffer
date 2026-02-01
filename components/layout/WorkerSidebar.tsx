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
    <div className="flex flex-col h-full w-20 bg-white border-r border-black">
      {/* Logo - Top */}
      <div className="h-16 flex items-center justify-center px-3 border-b border-black">
        <Link href={`/${currentLang}/market`} className="flex items-center" title="Staffer">
          <span className="italic font-bold text-xl tracking-tight text-black">
            S
          </span>
        </Link>
      </div>

      {/* Navigation - Middle (icon-only for top 4 items) */}
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
                      title={item.name}
                      className={cn(
                        "flex items-center justify-center p-3 rounded-lg text-sm font-medium transition-colors",
                        isItemActive
                          ? "bg-black text-white"
                          : "text-black hover:bg-gray-100"
                      )}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer - Bottom (Pinned, icon-only) */}
      <div className="mt-auto border-t border-black p-4 bg-white space-y-2">
        {WORKER_SYSTEM_LINKS.map((item) => {
          const Icon = item.icon;
          const isItemActive = isActive(item.href);

          return (
            <Link
              key={item.name}
              href={`/${currentLang}${item.href}`}
              title={item.name}
              className={cn(
                "flex items-center justify-center p-3 rounded-lg text-sm font-medium transition-colors",
                isItemActive
                  ? "bg-black text-white"
                  : "text-black hover:bg-gray-100"
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
            </Link>
          );
        })}
        
        {/* Log Out Button */}
        <button
          onClick={handleLogout}
          title="Log Out"
          className="w-full flex items-center justify-center p-3 rounded-lg text-sm font-medium transition-colors text-black hover:bg-gray-100"
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
        </button>
      </div>
    </div>
  );
}
