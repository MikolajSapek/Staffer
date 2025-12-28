'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/utils/supabase/client';

interface CreateShiftFormProps {
  companyId: string;
  locations: Array<{ id: string; name: string; address: string }>;
}

export default function CreateShiftForm({ companyId, locations }: CreateShiftFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    location_id: locations.length > 0 ? locations[0].id : '',
    start_time: '',
    end_time: '',
    hourly_rate: '',
    vacancies_total: '1',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Convert datetime-local strings to ISO strings
      const startDateTime = new Date(formData.start_time);
      const endDateTime = new Date(formData.end_time);

      const { error: insertError } = await supabase
        .from('shifts')
        .insert({
          company_id: companyId,
          location_id: formData.location_id,
          title: formData.title,
          description: formData.description || null,
          category: formData.category || 'general',
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          hourly_rate: parseFloat(formData.hourly_rate),
          vacancies_total: parseInt(formData.vacancies_total),
          vacancies_taken: 0,
          status: 'published',
        } as any);

      if (insertError) {
        throw insertError;
      }

      router.push('/company/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Der opstod en fejl');
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vagt detaljer</CardTitle>
        <CardDescription>
          Udfyld oplysningerne for din vagt
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Titel *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="F.eks. Vikar til lagerarbejde"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beskrivelse</Label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Beskriv jobbet..."
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="category">Kategori</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="F.eks. Lager, Produktion"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location_id">Lokation *</Label>
              {locations.length > 0 ? (
                <select
                  id="location_id"
                  value={formData.location_id}
                  onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Du skal først oprette en lokation.
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start_time">Starttid *</Label>
              <Input
                id="start_time"
                type="datetime-local"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time">Sluttid *</Label>
              <Input
                id="end_time"
                type="datetime-local"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="hourly_rate">Timeløn (DKK) *</Label>
              <Input
                id="hourly_rate"
                type="number"
                step="0.01"
                min="0"
                value={formData.hourly_rate}
                onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                required
                placeholder="150"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vacancies_total">Antal pladser *</Label>
              <Input
                id="vacancies_total"
                type="number"
                min="1"
                value={formData.vacancies_total}
                onChange={(e) => setFormData({ ...formData, vacancies_total: e.target.value })}
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading || locations.length === 0}>
            {loading ? 'Opretter...' : 'Opret vagt'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

