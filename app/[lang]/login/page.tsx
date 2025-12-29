import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import LoginForm from '@/components/auth/LoginForm';
import Link from 'next/link';

export default async function LoginPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // If already logged in, redirect based on role
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile) {
      const role = profile.role as 'worker' | 'company' | 'admin';
      if (role === 'company') redirect('/dashboard');
      if (role === 'worker') redirect('/schedule');
      if (role === 'admin') redirect('/admin');
    }
    redirect('/');
  }

  return (
    <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[calc(100vh-200px)]">
      <div className="w-full max-w-md">
        <LoginForm />
        <div className="mt-4 text-center text-sm text-muted-foreground">
          Har du ikke en konto?{' '}
          <Link href="/register" className="text-primary hover:underline">
            Opret profil
          </Link>
        </div>
      </div>
    </div>
  );
}
