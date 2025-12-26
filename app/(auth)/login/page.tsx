import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import LoginForm from '@/components/auth/LoginForm';

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Redirect based on role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile) {
      const profileData = profile as { role: 'worker' | 'company' | 'admin' };
      if (profileData.role === 'company') redirect('/company');
      if (profileData.role === 'worker') redirect('/worker');
      if (profileData.role === 'admin') redirect('/admin');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6 text-center">Vikar System</h1>
        <LoginForm />
      </div>
    </div>
  );
}

