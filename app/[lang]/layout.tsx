import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../globals.css';
import dynamic from 'next/dynamic';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { getDictionary } from './dictionaries';

const inter = Inter({ subsets: ['latin'] });

// Dynamically import Navbar to prevent chunk loading errors
const Navbar = dynamic(() => import('@/components/Navbar'), {
  ssr: true,
  loading: () => (
    <nav className="border-b bg-background">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-32 bg-muted animate-pulse rounded" />
          <div className="h-8 w-8 bg-muted animate-pulse rounded-full" />
        </div>
      </div>
    </nav>
  ),
});

export const metadata: Metadata = {
  title: 'Vikar System - Danish Staffing Platform',
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
      <body className={inter.className}>
        <LanguageSwitcher />
        <Navbar dict={dict} lang={lang} />
        {children}
      </body>
    </html>
  );
}

