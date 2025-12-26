import React from 'react';
import RoleProtector from '@/components/auth/RoleProtector';
import AdminNav from '@/components/navigation/AdminNav';

// Dodajemy 'async', aby Next.js poprawnie czekał na komponenty serwerowe wewnątrz
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleProtector allowedRoles={['admin']}>
      <div className="min-h-screen bg-background">
        <AdminNav />
        <main className="container mx-auto py-6 px-4">
          {children}
        </main>
      </div>
    </RoleProtector>
  );
}

