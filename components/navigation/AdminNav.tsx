import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import LogoutButton from '@/components/auth/LogoutButton';

export default async function AdminNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="text-xl font-bold">
            Vikar System - Admin
          </Link>
          <div className="flex gap-4">
            <Link href="/admin" className="text-sm hover:underline">
              Dashboard
            </Link>
            <Link href="/admin/users" className="text-sm hover:underline">
              Brugere
            </Link>
            <Link href="/admin/payroll" className="text-sm hover:underline">
              Løn
            </Link>
            <Link href="/admin/strikes" className="text-sm hover:underline">
              Strikes
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

