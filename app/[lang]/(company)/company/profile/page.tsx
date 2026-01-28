import { getDictionary } from '@/app/[lang]/dictionaries';
import CompanyProfileForm from '@/components/profile/CompanyProfileForm';

export const dynamic = 'force-dynamic';

export default async function CompanyProfilePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang as 'en-US' | 'da');
  
  // Layout już sprawdza autoryzację i rolę 'company' - nie trzeba powtarzać tutaj

  // Render company profile form
  return (
    <CompanyProfileForm 
      dict={dict.companyProfile} 
      profileDict={{
        loading: dict.profile.loading,
        authError: dict.profile.authError,
        notLoggedIn: dict.profile.notLoggedIn,
        goToLogin: dict.profile.goToLogin,
        saveChanges: dict.profile.saveChanges,
        saving: dict.profile.saving,
        profileUpdated: dict.profile.profileUpdated,
      }}
      navigationDict={{
        login: dict.navigation.login,
      }}
      lang={lang} 
    />
  );
}
