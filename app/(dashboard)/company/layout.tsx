import RoleProtector from '@/components/auth/RoleProtector';
import Link from 'next/link';
import { getCurrentUser } from '@/utils/supabase/server';
import LogoutButton from '@/components/auth/LogoutButton';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Users, 
  FileText 
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default async function CompanyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  const navItems = [
    { href: '/company/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/company/create-shift', label: 'Opret skift', icon: PlusCircle },
    { href: '/company/candidates', label: 'Kandidater', icon: Users },
    { href: '/company/timesheets', label: 'Tidsregistrering', icon: FileText },
  ];

  return (
    <RoleProtector allowedRoles={['company', 'admin']}>
      <div className="min-h-screen bg-background flex">
        {/* Sidebar */}
        <aside className="w-64 border-r bg-card">
          <div className="flex flex-col h-full">
            <div className="p-6 border-b">
              <Link href="/company/dashboard" className="text-xl font-bold">
                Staffer
              </Link>
            </div>
            <nav className="flex-1 p-4 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      'hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="p-4 border-t">
              {user && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <LogoutButton />
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto py-6 px-4">{children}</div>
        </main>
      </div>
    </RoleProtector>
  );
}
