import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Ingen adgang</h1>
        <p className="text-muted-foreground mb-6">
          Du har ikke adgang til denne side.
        </p>
        <Link href="/">
          <Button>Gå til forsiden</Button>
        </Link>
      </div>
    </div>
  );
}

