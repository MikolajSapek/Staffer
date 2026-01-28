import {
  LayoutDashboard,
  Briefcase, // Ikona dla Job Listings (Wewnętrzne)
  FileText,
  Users,
  MapPin,
  Copy,
  UserCog,
  Wallet,
  Globe,     // Ikona dla Public Job Board (Zewnętrzne)
  Settings,
  LifeBuoy
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';

export interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
  hasBadge?: boolean;
}

export interface NavigationCategory {
  category: string;
  items: NavigationItem[];
}

export const COMPANY_NAVIGATION: NavigationCategory[] = [
  {
    category: "OPERATIONS",
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      // KLUCZOWE: To jest link do panelu zarządzania zmianami
      { name: 'Shifts', href: '/listings', icon: Briefcase }, 
      { name: 'Timesheets', href: '/timesheets', icon: FileText },
      { name: 'Applicants', href: '/applicants', icon: Users, hasBadge: true },
    ]
  },
  {
    category: "MANAGEMENT",
    items: [
      { name: 'Locations', href: '/locations', icon: MapPin },
      { name: 'Templates', href: '/templates', icon: Copy },
      { name: 'Team', href: '/managers', icon: UserCog },
    ]
  },
  {
    category: "FINANCE",
    items: [
      { name: 'Finances', href: '/billing', icon: Wallet, hasBadge: true },
    ]
  }
];

export const SYSTEM_LINKS: NavigationItem[] = [
  // KLUCZOWE: Marketplace - podgląd wszystkich ofert na rynku
  { name: 'Job Listings', href: '/marketplace', icon: Globe }, 
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Support', href: '/support', icon: LifeBuoy },
];
