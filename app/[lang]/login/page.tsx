import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import LoginForm from '@/components/auth/LoginForm';
import Link from 'next/link';
import { getDictionary } from '@/app/[lang]/dictionaries';

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang as 'en-US' | 'da');
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
      if (role === 'company') redirect(`/${lang}/dashboard`);
      if (role === 'worker') redirect(`/${lang}/schedule`);
      if (role === 'admin') redirect(`/${lang}/dashboard`);
    }
    redirect(`/${lang}`);
  }

  return (
    <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[calc(100vh-200px)]">
      <div className="w-full max-w-md">
        <LoginForm dict={dict.auth} lang={lang} />
        <div className="mt-4 text-center text-sm text-muted-foreground">
          {dict.auth.noAccount}{' '}
          <Link href={`/${lang}/register`} className="text-primary hover:underline">
            {dict.auth.registerLink}
          </Link>
        </div>
      </div>
    </div>
  );
}
