import RegisterForm from '@/components/auth/RegisterForm';

export default function WorkerRegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6 text-center">Opret konto som Pracownik</h1>
        <RegisterForm defaultRole="worker" />
      </div>
    </div>
  );
}

