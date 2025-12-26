import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import LogoutButton from '@/components/auth/LogoutButton';

export default async function WorkerNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/worker" className="text-xl font-bold">
            Vikar System
          </Link>
          <div className="flex gap-4">
            <Link href="/worker" className="text-sm hover:underline">
              Dashboard
            </Link>
            <Link href="/worker/jobs" className="text-sm hover:underline">
              Jobbørsen
            </Link>
            <Link href="/worker/applications" className="text-sm hover:underline">
              Mine ansøgninger
            </Link>
            <Link href="/worker/calendar" className="text-sm hover:underline">
              Kalender
            </Link>
            <Link href="/worker/profile" className="text-sm hover:underline">
              Profil
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

