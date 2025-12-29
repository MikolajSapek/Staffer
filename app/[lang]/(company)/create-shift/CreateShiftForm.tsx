'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/utils/supabase/client';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

interface CreateShiftFormProps {
  companyId: string;
  locations: Array<{ id: string; name: string; address: string }>;
  dict: {
    formTitle: string;
    formDescription: string;
    jobTitle: string;
    jobTitlePlaceholder: string;
    description: string;
    descriptionPlaceholder: string;
    descriptionHint: string;
    startTime: string;
    endTime: string;
    hourlyRate: string;
    hourlyRatePlaceholder: string;
    hourlyRateHint: string;
    vacancies: string;
    vacanciesHint: string;
    location: string;
    category: string;
    selectLocation: string;
    selectCategory: string;
    noLocations: string;
    goToLocations: string;
    submit: string;
    creating: string;
    cancel: string;
    successTitle: string;
    successMessage: string;
    redirecting: string;
    validation: {
      titleRequired: string;
      locationRequired: string;
      categoryRequired: string;
      startTimeRequired: string;
      endTimeRequired: string;
      hourlyRateRequired: string;
      vacanciesRequired: string;
      endTimeAfterStart: string;
    };
  };
  lang: string;
}

// Predefined job categories
const JOB_CATEGORIES = [
  { value: 'gastronomy', label: 'Gastronomi' },
  { value: 'warehouse', label: 'Lager' },
  { value: 'production', label: 'Produktion' },
  { value: 'retail', label: 'Detailhandel' },
  { value: 'hospitality', label: 'Hotel & Service' },
  { value: 'cleaning', label: 'Rengøring' },
  { value: 'construction', label: 'Bygge & Anlæg' },
  { value: 'logistics', label: 'Logistik & Transport' },
  { value: 'office', label: 'Kontor & Administration' },
  { value: 'healthcare', label: 'Sundhed & Pleje' },
  { value: 'other', label: 'Andet' },
];

export default function CreateShiftForm({ companyId, locations, dict, lang }: CreateShiftFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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

  const validateForm = (): string | null => {
    if (!formData.title.trim()) {
      return dict.validation.titleRequired;
    }
    if (!formData.location_id) {
      return dict.validation.locationRequired;
    }
    if (!formData.category) {
      return dict.validation.categoryRequired;
    }
    if (!formData.start_time) {
      return dict.validation.startTimeRequired;
    }
    if (!formData.end_time) {
      return dict.validation.endTimeRequired;
    }
    if (!formData.hourly_rate || parseFloat(formData.hourly_rate) <= 0) {
      return dict.validation.hourlyRateRequired;
    }
    if (!formData.vacancies_total || parseInt(formData.vacancies_total) < 1) {
      return dict.validation.vacanciesRequired;
    }

    // Validate that end time is after start time
    if (formData.start_time && formData.end_time) {
      const start = new Date(formData.start_time);
      const end = new Date(formData.end_time);
      if (end <= start) {
        return dict.validation.endTimeAfterStart;
      }
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validate form
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const { error: insertError } = await supabase
        .from('shifts')
        .insert({
          company_id: companyId,
          location_id: formData.location_id,
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          category: formData.category,
          start_time: formData.start_time,
          end_time: formData.end_time,
          hourly_rate: parseFloat(formData.hourly_rate),
          vacancies_total: parseInt(formData.vacancies_total),
          vacancies_taken: 0,
          status: 'published',
        });

      if (insertError) {
        throw insertError;
      }

      // Show success message
      setSuccess(true);

      // Redirect to dashboard after 1.5 seconds
      setTimeout(() => {
        router.push(`/${lang}/dashboard`);
        router.refresh();
      }, 1500);
    } catch (err: any) {
      console.error('Error creating shift:', err);
      setError(err.message || dict.validation.titleRequired);
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.formTitle}</CardTitle>
        <CardDescription>
          {dict.formDescription}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {success ? (
          <div className="py-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1">{dict.successTitle}</h3>
                <div className="text-sm text-muted-foreground">
                  {dict.successMessage}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {dict.redirecting}
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 text-sm text-red-600 bg-red-50 rounded-md border border-red-200 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div className="flex-1">{error}</div>
              </div>
            )}

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">
                {dict.jobTitle} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={dict.jobTitlePlaceholder}
                required
                disabled={loading}
                className="w-full"
              />
            </div>

            {/* Location and Category */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="location_id">
                  {dict.location} <span className="text-red-500">*</span>
                </Label>
                {locations.length > 0 ? (
                  <Select
                    value={formData.location_id}
                    onValueChange={(value) => setFormData({ ...formData, location_id: value })}
                    disabled={loading}
                    required
                  >
                    <SelectTrigger id="location_id" className="w-full">
                      <SelectValue placeholder={dict.selectLocation} />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {dict.noLocations}
                    </p>
                    <Button type="button" variant="outline" asChild>
                      <Link href={`/${lang}/locations`}>
                        {dict.goToLocations}
                      </Link>
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">
                  {dict.category} <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                  disabled={loading}
                  required
                >
                  <SelectTrigger id="category" className="w-full">
                    <SelectValue placeholder={dict.selectCategory} />
                  </SelectTrigger>
                  <SelectContent>
                    {JOB_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date & Time */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="start_time">
                  {dict.startTime} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="start_time"
                  type="datetime-local"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  required
                  disabled={loading}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_time">
                  {dict.endTime} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="end_time"
                  type="datetime-local"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  required
                  disabled={loading}
                  className="w-full"
                />
              </div>
            </div>

            {/* Hourly Rate and Vacancies */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="hourly_rate">
                  {dict.hourlyRate} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="hourly_rate"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.hourly_rate}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Only allow positive numbers
                    if (value === '' || (parseFloat(value) > 0)) {
                      setFormData({ ...formData, hourly_rate: value });
                    }
                  }}
                  placeholder={dict.hourlyRatePlaceholder}
                  required
                  disabled={loading}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  {dict.hourlyRateHint}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vacancies_total">
                  {dict.vacancies} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="vacancies_total"
                  type="number"
                  min="1"
                  value={formData.vacancies_total}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Only allow positive integers
                    if (value === '' || (parseInt(value) >= 1)) {
                      setFormData({ ...formData, vacancies_total: value });
                    }
                  }}
                  required
                  disabled={loading}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  {dict.vacanciesHint}
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">{dict.description}</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder={dict.descriptionPlaceholder}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                {dict.descriptionHint}
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
                className="flex-1 md:flex-initial"
              >
                {dict.cancel}
              </Button>
              <Button
                type="submit"
                disabled={loading || locations.length === 0}
                className="flex-1 md:flex-initial"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {dict.creating}
                  </>
                ) : (
                  dict.submit
                )}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

