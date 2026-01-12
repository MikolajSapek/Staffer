import { getDictionary } from '@/app/[lang]/dictionaries';
import UpdatePasswordForm from '@/components/auth/UpdatePasswordForm';

export default async function UpdatePasswordPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang as 'en-US' | 'da');

  return (
    <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[calc(100vh-200px)]">
      <div className="w-full max-w-md">
        <UpdatePasswordForm dict={dict.authReset} lang={lang} />
      </div>
    </div>
  );
}
