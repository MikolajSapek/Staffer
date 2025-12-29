import { getDictionary } from '@/app/[lang]/dictionaries';
import ProfileForm from './ProfileForm';

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang as 'en-US' | 'da');
  
  return <ProfileForm dict={dict} lang={lang} />;
}
