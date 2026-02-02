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

export default function ConditionalNavbar({ dict, lang, hasUser = false }: ConditionalNavbarProps) {
  const pathname = usePathname();
  const pathWithoutLang = pathname?.replace(/^\/(en-US|da)/, '') || '';

  // Hide Navbar for company routes (they use Sidebar + Header instead)
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
                         pathname?.includes('/create-shift') ||
                         pathname?.includes('/company-setup') ||
                         pathname?.includes('/company') ||
                         pathname?.includes('/marketplace') ||
                         pathname?.includes('/support');

  // Hide Navbar for worker routes (WorkerSidebar + WorkerHeader) – tylko gdy użytkownik zalogowany
  // Niezalogowani na /market widzą Navbar (Login, Register)
  const isWorkerPath = /^\/(applications|schedule|finances|profile|market)(\/|$)/.test(pathWithoutLang) ||
                        pathWithoutLang.startsWith('/worker/');
  const isWorkerRoute = isWorkerPath && hasUser;

  if (isCompanyRoute || isWorkerRoute) {
    return null;
  }

  return <Navbar dict={dict} lang={lang} />;
}
