import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../globals.css';
import dynamic from 'next/dynamic';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { getDictionary } from './dictionaries';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

const inter = Inter({ subsets: ['latin'] });

// Conditionally render Navbar (hidden for company routes which use Sidebar)
const ConditionalNavbar = dynamic(() => import('@/components/company/ConditionalNavbar'), {
  ssr: true,
});

export const metadata: Metadata = {
  title: 'Staffer Systems - Danish Staffing Platform',
  description: 'B2B staffing platform connecting companies with temporary workers',
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
  return (
    <html lang={lang}>
      <body className={inter.className} suppressHydrationWarning>
        <LanguageSwitcher />
        <ConditionalNavbar dict={dict} lang={lang} />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

