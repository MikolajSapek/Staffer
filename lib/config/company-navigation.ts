import {
  LayoutDashboard,
  Briefcase,
  LayoutList,
  Wallet,
  Clock,
  Globe,
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';

export interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
  hasBadge?: boolean;
}

// Flat sidebar: Dashboard, Applicants, Shifts, Job Listings, Timesheets, Finances
// Staff: tylko kafelek na dashboardzie
// Badges: Applicants (if > 0), Timesheets (pending approval), Finances (pending payments)
export const COMPANY_NAVIGATION_ITEMS: NavigationItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Applicants', href: '/applicants', icon: LayoutList, hasBadge: true },
  { name: 'Shifts', href: '/listings', icon: Briefcase },
  { name: 'Job Listings', href: '/market', icon: Globe },
  { name: 'Timesheets', href: '/timesheets', icon: Clock, hasBadge: true },
  { name: 'Finances', href: '/billing', icon: Wallet, hasBadge: true },
];
