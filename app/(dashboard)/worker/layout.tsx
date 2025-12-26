import RoleProtector from '@/components/auth/RoleProtector';
import WorkerNav from '@/components/navigation/WorkerNav';

export default function WorkerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleProtector allowedRoles={['worker', 'admin']}>
      <div className="min-h-screen bg-background">
        <WorkerNav />
        <main className="container mx-auto py-6 px-4">{children}</main>
      </div>
    </RoleProtector>
  );
}

