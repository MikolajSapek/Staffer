import {
  LayoutDashboard,
  Briefcase,
  LayoutList,
  Wallet,
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';

export interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
  hasBadge?: boolean;
}

// Flat sidebar: Dashboard, Applicants, Shifts, Finances
// Badges: Applicants (if > 0), Finances (pending payments)
export const COMPANY_NAVIGATION_ITEMS: NavigationItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Applicants', href: '/applicants', icon: LayoutList, hasBadge: true },
  { name: 'Shifts', href: '/listings', icon: Briefcase },
  { name: 'Finances', href: '/billing', icon: Wallet, hasBadge: true },
];
