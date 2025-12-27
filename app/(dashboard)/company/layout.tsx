import RoleProtector from '@/components/auth/RoleProtector';
import CompanyNav from '@/components/navigation/CompanyNav';

export default function CompanyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleProtector allowedRoles={['company', 'admin']}>
      <div className="min-h-screen bg-background">
        <CompanyNav />
        <main className="container mx-auto py-6 px-4">{children}</main>
      </div>
    </RoleProtector>
  );
}

