'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Database } from '@/types/database';

type Location = Database['public']['Tables']['locations']['Row'];

interface CreateShiftFormProps {
  locations: Location[];
  createShiftAction: (formData: FormData) => Promise<{ success: boolean; error?: string }>;
}

export default function CreateShiftForm({ locations, createShiftAction }: CreateShiftFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const result = await createShiftAction(formData);

      if (result.success) {
        router.push('/company/dashboard');
        router.refresh();
      } else {
        setError(result.error || 'Kunne ikke oprette skift');
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
        <Label htmlFor="location_id">Lokation *</Label>
        <select
          id="location_id"
          name="location_id"
          required
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">Vælg en lokation</option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name} - {location.address}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Titel *</Label>
        <Input
          id="title"
          name="title"
          placeholder="F.eks. Lagerarbejde"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Beskrivelse</Label>
        <Input
          id="description"
          name="description"
          placeholder="Yderligere detaljer om skiftet"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Kategori *</Label>
        <Input
          id="category"
          name="category"
          placeholder="F.eks. Lager, Produktion, etc."
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start_time">Starttid *</Label>
          <Input
            id="start_time"
            name="start_time"
            type="datetime-local"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="end_time">Sluttid *</Label>
          <Input
            id="end_time"
            name="end_time"
            type="datetime-local"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="hourly_rate">Timeløn (DKK) *</Label>
          <Input
            id="hourly_rate"
            name="hourly_rate"
            type="number"
            step="0.01"
            min="0"
            placeholder="150.00"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="vacancies_total">Antal pladser *</Label>
          <Input
            id="vacancies_total"
            name="vacancies_total"
            type="number"
            min="1"
            placeholder="5"
            required
          />
        </div>
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Opretter...' : 'Opret skift'}
      </Button>
    </form>
  );
}

