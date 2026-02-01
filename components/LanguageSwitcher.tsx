'use client';

import { usePathname, useRouter } from 'next/navigation';

const locales = ['en-US', 'da'] as const;

// SVG flags - always visible (no emoji font dependency)
const FlagUS = () => (
  <span className="inline-flex w-5 h-3.5 overflow-hidden rounded-[2px] flex-shrink-0" style={{ minWidth: 20 }}>
    <svg viewBox="0 0 60 30" className="w-full h-full block" preserveAspectRatio="xMidYMid slice">
      {/* Stripes */}
      {[...Array(13)].map((_, i) => (
        <rect key={i} y={i * (30/13)} width="60" height={30/13 + 0.5} fill={i % 2 === 0 ? '#b22234' : '#fff'}/>
      ))}
      {/* Canton */}
      <rect width="24" height="14" fill="#3c3b6e"/>
      {/* Stars */}
      {[...Array(5)].flatMap((_, i) =>
        [...Array(6)].map((_, j) => (
          <circle key={`${i}-${j}`} cx={2 + j * 4} cy={1.5 + i * 2.5} r="0.6" fill="#fff"/>
        ))
      )}
    </svg>
  </span>
);

const FlagDK = () => (
  <span className="inline-flex w-5 h-3.5 overflow-hidden rounded-[2px] flex-shrink-0" style={{ minWidth: 20 }}>
    <svg viewBox="0 0 60 40" className="w-full h-full block" preserveAspectRatio="xMidYMid slice">
      <rect width="60" height="40" fill="#c8102e"/>
      <rect x="22" width="8" height="40" fill="#fff"/>
      <rect y="16" width="60" height="8" fill="#fff"/>
    </svg>
  </span>
);

type Locale = (typeof locales)[number];

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
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs transition-all duration-200 cursor-pointer ${
          currentLocale === 'en-US'
            ? 'bg-white dark:bg-gray-800 text-black dark:text-white shadow-sm font-semibold'
            : 'text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white bg-transparent'
        }`}
      >
        <FlagUS />
        EN
      </button>
      <button
        onClick={() => switchLocale('da')}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs transition-all duration-200 cursor-pointer ${
          currentLocale === 'da'
            ? 'bg-white dark:bg-gray-800 text-black dark:text-white shadow-sm font-semibold'
            : 'text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white bg-transparent'
        }`}
      >
        <FlagDK />
        DA
      </button>
    </div>
  );
}

