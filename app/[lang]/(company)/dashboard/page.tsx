import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/**
 * Dashboard route: redirect to Job Listings so company always lands on their shifts view.
 * Job Listings (/listings) is the default company view after login.
 */
export default async function CompanyDashboardPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const currentLang = lang || 'en-US';
  redirect(`/${currentLang}/listings`);
}
