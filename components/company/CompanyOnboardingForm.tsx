'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createCompanyDetails } from '@/app/actions/onboarding';

export default function CompanyOnboardingForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const result = await createCompanyDetails(formData);

      if (result.success) {
        router.push('/company/dashboard');
        router.refresh();
      } else {
        setError(result.error || 'Kunne ikke oprette firma');
      }
    } catch (err: any) {
      setError(err.message || 'En fejl opstod');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="company_name">Firmanavn *</Label>
        <Input id="company_name" name="company_name" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cvr_number">CVR-nummer *</Label>
        <Input id="cvr_number" name="cvr_number" placeholder="12345678" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ean_number">EAN-nummer (valgfri)</Label>
        <Input id="ean_number" name="ean_number" placeholder="5790000123457" />
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Gemmer...' : 'Gem firma'}
      </Button>
    </form>
  );
}

