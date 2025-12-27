'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createWorkerDetails } from '@/app/actions/onboarding';

export default function WorkerOnboardingForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const result = await createWorkerDetails(formData);

      if (result.success) {
        router.push('/worker/dashboard');
        router.refresh();
      } else {
        setError(result.error || 'Kunne ikke oprette profil');
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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first_name">Fornavn *</Label>
          <Input id="first_name" name="first_name" required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="last_name">Efternavn *</Label>
          <Input id="last_name" name="last_name" required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone_number">Telefonnummer *</Label>
        <Input id="phone_number" name="phone_number" type="tel" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cpr_number">CPR-nummer *</Label>
        <Input id="cpr_number" name="cpr_number" placeholder="DDMMYY-XXXX" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tax_card_type">Skattekorttype *</Label>
        <select
          id="tax_card_type"
          name="tax_card_type"
          required
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">Vælg skattekorttype</option>
          <option value="Hovedkort">Hovedkort</option>
          <option value="Bikort">Bikort</option>
          <option value="Frikort">Frikort</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="bank_reg_number">Bankreg.nr *</Label>
          <Input id="bank_reg_number" name="bank_reg_number" required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bank_account_number">Kontonummer *</Label>
          <Input id="bank_account_number" name="bank_account_number" required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="su_limit_amount">SU-grænse (valgfri)</Label>
        <Input
          id="su_limit_amount"
          name="su_limit_amount"
          type="number"
          step="0.01"
          placeholder="0.00"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="shirt_size">T-shirt størrelse (valgfri)</Label>
          <Input id="shirt_size" name="shirt_size" placeholder="XS, S, M, L, XL, etc." />
        </div>

        <div className="space-y-2">
          <Label htmlFor="shoe_size">Sko størrelse (valgfri)</Label>
          <Input id="shoe_size" name="shoe_size" placeholder="40, 41, 42, etc." />
        </div>
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Gemmer...' : 'Gem profil'}
      </Button>
    </form>
  );
}

