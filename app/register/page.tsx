import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import RegisterForm from '@/components/auth/RegisterForm';

export default async function RegisterPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // If already logged in, redirect
  if (user) {
    redirect('/');
  }

  return (
    <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[calc(100vh-200px)]">
      <div className="w-full max-w-md">
        <RegisterForm />
      </div>
    </div>
  );
}

