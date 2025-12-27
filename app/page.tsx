import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-4 text-center">Vikar System</h1>
        <p className="text-lg text-center mb-8">Danish Staffing Platform</p>
        <div className="flex gap-4 justify-center">
          <Link href="/login">
            <Button>Log ind</Button>
          </Link>
          <Link href="/register">
            <Button variant="outline">Opret konto</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
