'use client';

import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';

const Navbar = dynamic(() => import('@/components/Navbar'), {
  ssr: true,
  loading: () => (
    <nav className="border-b bg-background">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="italic font-bold text-2xl tracking-tight text-slate-900">
            Staffer
          </div>
          <div className="h-8 w-8 bg-muted animate-pulse rounded-full" />
        </div>
      </div>
    </nav>
  ),
});

interface ConditionalNavbarProps {
  dict: any;
  lang: string;
  /** When false, /market shows Navbar (Login/Register) for guests */
  hasUser?: boolean;
}

// Routes where the global Navbar is always hidden (own layout/design)
const HIDE_NAVBAR_ROUTES = [
  '/market',
  '/login',
  '/register',
  '/dashboard',
] as const;

export default function ConditionalNavbar({ dict, lang, hasUser = false }: ConditionalNavbarProps) {
  const pathname = usePathname();
  const pathWithoutLang = pathname?.replace(/^\/(en-US|da)/, '') || '';

  // Hide Navbar for company routes (Sidebar + Header)
  const isCompanyRoute = pathname?.includes('/dashboard') ||
                         pathname?.includes('/listings') ||
                         pathname?.includes('/shifts') ||
                         pathname?.includes('/locations') ||
                         pathname?.includes('/timesheets') ||
                         pathname?.includes('/applicants') ||
                         pathname?.includes('/billing') ||
                         pathname?.includes('/settings') ||
                         pathname?.includes('/templates') ||
                         pathname?.includes('/managers') ||
                         pathname?.includes('/staff') ||
                         pathname?.includes('/create-shift') ||
                         pathname?.includes('/company-setup') ||
                         pathname?.includes('/company') ||
                         pathname?.includes('/marketplace') ||
                         pathname?.includes('/support');

  // Hide Navbar for worker routes (WorkerSidebar + WorkerHeader) when user is logged in
  const isWorkerPath = /^\/(applications|schedule|finances|profile|market)(\/|$)/.test(pathWithoutLang) ||
                        pathWithoutLang.startsWith('/worker/');
  const isWorkerRoute = isWorkerPath && hasUser;

  // Hide Navbar on hybrid routes (own layout, e.g. Market) – zawsze, także dla gości
  const isHideNavbarRoute = HIDE_NAVBAR_ROUTES.some(
    (route) => pathWithoutLang === route || pathWithoutLang.startsWith(route + '/')
  );

  const shouldHideNavbar = isCompanyRoute || isWorkerRoute || isHideNavbarRoute;

  if (shouldHideNavbar) {
    return null;
  }

  return <Navbar dict={dict} lang={lang} />;
}
