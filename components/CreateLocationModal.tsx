'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { createClient } from '@/utils/supabase/client';
import { Loader2 } from 'lucide-react';

interface Location {
  id: string;
  name: string;
  address: string;
}

interface CreateLocationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dict: {
    addTitle: string;
    addDescription: string;
    nameLabel: string;
    namePlaceholder: string;
    addressLabel: string;
    addressPlaceholder: string;
    save: string;
    creating: string;
    cancel: string;
    nameRequired: string;
    notLoggedIn: string;
    createError: string;
  };
  onSuccess: (newLocation: Location) => void;
}

export default function CreateLocationModal({
  open,
  onOpenChange,
  dict,
  onSuccess,
}: CreateLocationModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (!formData.name.trim() || !formData.address.trim()) {
        setError(dict.nameRequired);
        setSubmitting(false);
        return;
      }

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError(dict.notLoggedIn);
        setSubmitting(false);
        return;
      }

      // Insert and return the created record
      const { data, error: insertError } = await supabase
        .from('locations')
        .insert({
          company_id: user.id,
          name: formData.name.trim(),
          address: formData.address.trim(),
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      if (!data) {
        throw new Error('Failed to create location');
      }

      // Reset form and close dialog
      setFormData({ name: '', address: '' });
      setError(null);
      onOpenChange(false);

      // Call onSuccess with the new location data
      onSuccess(data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : dict.createError;
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', address: '' });
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dict.addTitle}</DialogTitle>
          <DialogDescription>
            {dict.addDescription}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
              {error}
            </div>
          )}
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="location-name">
                {dict.nameLabel} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="location-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={dict.namePlaceholder}
                required
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location-address">
                {dict.addressLabel} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="location-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder={dict.addressPlaceholder}
                required
                disabled={submitting}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={submitting}
            >
              {dict.cancel}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {dict.creating}
                </>
              ) : (
                dict.save
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

