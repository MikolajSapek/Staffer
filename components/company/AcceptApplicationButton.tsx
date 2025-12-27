'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { acceptApplication } from '@/app/actions/shifts';

interface AcceptApplicationButtonProps {
  applicationId: string;
}

export default function AcceptApplicationButton({ applicationId }: AcceptApplicationButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await acceptApplication(applicationId);
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error || 'Kunne ikke acceptere ansøgningen');
      }
    } catch (err: any) {
      setError(err.message || 'En fejl opstod');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Button onClick={handleAccept} disabled={loading} size="sm">
        {loading ? 'Accepterer...' : 'Accepter'}
      </Button>
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

