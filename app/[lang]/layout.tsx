import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../globals.css';
import dynamicImport from 'next/dynamic';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { getDictionary } from './dictionaries';
import { getCurrentUser } from '@/utils/supabase/server';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

// Force dynamic – prevents stale hasUser after login (Ghost Header fix)
export const dynamic = 'force-dynamic';

// Conditionally render Navbar (hidden for company/worker routes which use Sidebar+Header)
const ConditionalNavbar = dynamicImport(() => import('@/components/company/ConditionalNavbar'), {
  ssr: true,
  loading: () => null, // Prevent flash of Navbar loading state on worker routes
});

export const metadata: Metadata = {
  title: 'Staffer Systems - Danish Staffing Platform',
  description: 'B2B staffing platform connecting companies with temporary workers',
  icons: { icon: '/favicon.ico' },
};

export function generateStaticParams() {
  return [{ lang: 'en-US' }, { lang: 'da' }]
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang as 'en-US' | 'da');
  const user = await getCurrentUser();
  return (
    <html lang={lang}>
      <body className={inter.className} suppressHydrationWarning>
        <LanguageSwitcher />
        <ConditionalNavbar dict={dict} lang={lang} hasUser={!!user} />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

