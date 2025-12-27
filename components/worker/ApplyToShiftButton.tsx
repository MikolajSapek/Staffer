'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { applyToShift } from '@/app/actions/shifts';

interface ApplyToShiftButtonProps {
  shiftId: string;
}

export default function ApplyToShiftButton({ shiftId }: ApplyToShiftButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApply = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await applyToShift(shiftId);
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error || 'Kunne ikke ansøge til skiftet');
      }
    } catch (err: any) {
      setError(err.message || 'En fejl opstod');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Button onClick={handleApply} disabled={loading} className="w-full">
        {loading ? 'Ansøger...' : 'Ansøg nu'}
      </Button>
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

