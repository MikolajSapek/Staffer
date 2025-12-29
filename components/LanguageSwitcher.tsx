'use client';

import { usePathname, useRouter } from 'next/navigation';

const locales = ['en-US', 'da'] as const;
type Locale = typeof locales[number];

export default function LanguageSwitcher() {
  const pathname = usePathname();
  const router = useRouter();

  // Extract current locale from pathname
  const pathSegments = pathname.split('/').filter(Boolean);
  const currentLocale = pathSegments[0] as Locale;
  const isValidLocale = locales.includes(currentLocale);

  // Get the path without locale
  const pathWithoutLocale = isValidLocale 
    ? '/' + pathSegments.slice(1).join('/')
    : pathname;

  const switchLocale = (newLocale: Locale) => {
    const newPath = `/${newLocale}${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`;
    router.push(newPath);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex items-center p-1 rounded-full bg-white/90 dark:bg-black/90 backdrop-blur-md border border-gray-200 dark:border-gray-800 shadow-lg">
      <button
        onClick={() => switchLocale('en-US')}
        className={`px-3 py-1.5 rounded-full text-xs transition-all duration-200 cursor-pointer ${
          currentLocale === 'en-US'
            ? 'bg-white dark:bg-gray-800 text-black dark:text-white shadow-sm font-semibold'
            : 'text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white bg-transparent'
        }`}
      >
        🇺🇸 EN
      </button>
      <button
        onClick={() => switchLocale('da')}
        className={`px-3 py-1.5 rounded-full text-xs transition-all duration-200 cursor-pointer ${
          currentLocale === 'da'
            ? 'bg-white dark:bg-gray-800 text-black dark:text-white shadow-sm font-semibold'
            : 'text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white bg-transparent'
        }`}
      >
        🇩🇰 DA
      </button>
    </div>
  );
}

