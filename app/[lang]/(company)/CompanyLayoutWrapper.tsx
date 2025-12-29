'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export default function CompanyLayoutWrapper({
  children,
  hasCompanyDetails,
}: {
  children: React.ReactNode;
  hasCompanyDetails: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isNavigatingRef = useRef(false);

  useEffect(() => {
    // Prevent multiple simultaneous navigations
    if (isNavigatingRef.current) return;

    // If no company_details, user needs to complete company setup
    if (!hasCompanyDetails) {
      // If on dashboard or other pages, redirect to company-setup
      if (pathname && !pathname.includes('/company-setup')) {
        isNavigatingRef.current = true;
        router.push('/company-setup');
        return;
      }
    } else {
      // If company_details exists and user is on company-setup, redirect to dashboard
      if (pathname?.includes('/company-setup')) {
        isNavigatingRef.current = true;
        router.push('/dashboard');
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
  }, [hasCompanyDetails, pathname, router]);

  return <>{children}</>;
}

