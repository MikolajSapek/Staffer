import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { Button } from '@/components/ui/button';
import LogoutButton from '@/components/auth/LogoutButton';

export default async function CompanyNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/company" className="text-xl font-bold">
            Vikar System
          </Link>
          <div className="flex gap-4">
            <Link href="/company" className="text-sm hover:underline">
              Dashboard
            </Link>
            <Link href="/company/shifts" className="text-sm hover:underline">
              Skift
            </Link>
            <Link href="/company/applications" className="text-sm hover:underline">
              Ansøgninger
            </Link>
            <Link href="/company/timesheets" className="text-sm hover:underline">
              Tidsregistrering
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {user && (
            <>
              <span className="text-sm text-muted-foreground">{user.email}</span>
              <LogoutButton />
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

