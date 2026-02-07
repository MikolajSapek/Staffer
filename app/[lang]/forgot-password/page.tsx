import { getDictionary } from '@/app/[lang]/dictionaries';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';

export const dynamic = 'force-dynamic';

export default async function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang as 'en-US' | 'da');

  return (
    <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[calc(100vh-200px)]">
      <div className="w-full max-w-md">
        <ForgotPasswordForm 
          dict={{
            ...dict.authReset,
            email: dict.auth.email,
            emailPlaceholder: dict.auth.emailPlaceholder,
          }} 
          lang={lang} 
        />
      </div>
    </div>
  );
}
