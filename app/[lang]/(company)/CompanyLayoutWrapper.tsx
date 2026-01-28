'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const CompanySidebarDynamic = dynamic(() => import('@/components/layout/CompanySidebar').then(mod => ({ default: mod.CompanySidebar })), {
  ssr: true,
  loading: () => (
    <div className="flex flex-col h-full">
      <div className="h-16 flex items-center px-6 border-b">
        <div className="h-8 w-32 bg-muted animate-pulse rounded" />
      </div>
      <div className="flex-1 p-4">
        <div className="space-y-2">
          <div className="h-10 w-full bg-muted animate-pulse rounded" />
          <div className="h-10 w-full bg-muted animate-pulse rounded" />
        </div>
      </div>
    </div>
  ),
});

const CompanyHeaderDynamic = dynamic(() => import('@/components/layout/CompanyHeader').then(mod => ({ default: mod.CompanyHeader })), {
  ssr: true,
  loading: () => (
    <header className="h-16 border-b bg-white flex items-center justify-between px-6">
      <div className="h-6 w-32 bg-muted animate-pulse rounded" />
      <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
    </header>
  ),
});

interface CompanyLayoutWrapperProps {
  children: React.ReactNode;
  hasCompanyDetails: boolean;
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
    };
  };
  lang: string;
}

export default function CompanyLayoutWrapper({
  children,
  hasCompanyDetails,
  dict,
  lang,
}: CompanyLayoutWrapperProps) {
  // Zabezpieczenie: jeśli lang jest undefined, użyj 'en-US'
  const currentLang = lang || 'en-US';
  
  // Debug (opcjonalnie, usuń po testach)
  if (!lang) {
    console.warn('CompanyLayoutWrapper: lang is missing, using fallback "en-US"');
  }
  
  const pathname = usePathname();
  const router = useRouter();
  const isNavigatingRef = useRef(false);

  useEffect(() => {
    // Prevent multiple simultaneous navigations
    if (isNavigatingRef.current) return;

    // Check if we have a valid language prefix to avoid undefined/null in URL
    const langPrefix = currentLang || 'en-US';

    // SCENARIUSZ 1: Brak danych firmy -> Idź do Setupu
    if (!hasCompanyDetails) {
      // Jeśli nie jesteśmy na setupie, przekieruj tam
      if (pathname && !pathname.includes('/company-setup')) {
        isNavigatingRef.current = true;
        console.log('Redirecting to setup (missing details)...');
        router.push(`/${langPrefix}/company-setup`); // ✅ FIX: Dodano język
        return;
      }
    } 
    // SCENARIUSZ 2: Są dane firmy -> Wyjdź z Setupu
    else {
      // Jeśli jesteśmy na setupie (a mamy już dane), wróć do Dashboardu
      if (pathname?.includes('/company-setup')) {
        isNavigatingRef.current = true;
        console.log('Redirecting to dashboard (setup complete)...');
        router.push(`/${langPrefix}/dashboard`); // ✅ FIX: Dodano język
        return;
      }
    }

    // Reset navigation flag after a delay
    const timer = setTimeout(() => {
      isNavigatingRef.current = false;
    }, 1000);

    return () => {
      clearTimeout(timer);
    };
  }, [hasCompanyDetails, pathname, router, currentLang]); // ✅ FIX: Dodano currentLang do zależności

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* 1. Sidebar (Lewa strona, pełna wysokość) */}
      <aside className="hidden lg:flex flex-col w-64 border-r bg-white h-full z-30">
        <CompanySidebarDynamic dict={dict} lang={currentLang} />
      </aside>

      {/* 2. Prawa kolumna (Header + Content) */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Header na górze (Profil, Tytuł) */}
        <header className="flex-shrink-0 z-20">
          <CompanyHeaderDynamic dict={dict} lang={currentLang} />
        </header>

        {/* Scrollowalna treść główna */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

