import {
  CalendarDays, // My Calendar
  Briefcase,    // My Shifts
  Wallet,       // Finances
  Globe,        // Job Listings
  User,         // Profile
  LifeBuoy,     // Support
  Settings,     // Settings
  LogOut
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

export const WORKER_NAVIGATION: NavigationCategory[] = [
  {
    category: "",
    items: [
      { name: 'My Calendar', href: '/schedule', icon: CalendarDays },
      { name: 'Job Listings', href: '/market', icon: Globe },
      { name: 'My Shifts', href: '/applications', icon: Briefcase },
      { name: 'Finances', href: '/finances', icon: Wallet, hasBadge: true },
    ]
  }
];

export const WORKER_SYSTEM_LINKS: NavigationItem[] = [
  { name: 'Profile', href: '/profile', icon: User },
  { name: 'Support', href: '/worker/support', icon: LifeBuoy },
  { name: 'Settings', href: '/worker/settings', icon: Settings },
];
