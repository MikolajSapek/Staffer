import { redirect } from 'next/navigation';

// Redirect old /company/dashboard path to new /dashboard path
export default async function CompanyDashboardRedirect() {
  redirect('/dashboard');
}

