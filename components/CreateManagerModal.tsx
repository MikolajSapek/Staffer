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
import { createManager, type Manager } from '@/app/actions/managers';
import { Loader2 } from 'lucide-react';

interface CreateManagerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (newManager: Manager) => void;
}

export default function CreateManagerModal({
  open,
  onOpenChange,
  onSuccess,
}: CreateManagerModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (!formData.first_name.trim()) {
        setError('First name is required');
        setSubmitting(false);
        return;
      }

      const result = await createManager({
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim(),
        phone_number: formData.phone_number.trim() || null,
      });

      if (!result.success || !result.manager) {
        setError(result.error || result.message || 'Failed to create manager');
        setSubmitting(false);
        return;
      }

      // Reset form and close dialog
      setFormData({ first_name: '', last_name: '', email: '', phone_number: '' });
      setError(null);
      onOpenChange(false);

      // Call onSuccess with the new manager data
      onSuccess(result.manager);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData({ first_name: '', last_name: '', email: '', phone_number: '' });
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Manager</DialogTitle>
          <DialogDescription>
            Add a new shift manager to assign to shifts.
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
              <Label htmlFor="manager-first-name">
                First Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="manager-first-name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                placeholder="John"
                required
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manager-last-name">
                Last Name
              </Label>
              <Input
                id="manager-last-name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                placeholder="Doe"
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manager-email">
                Email
              </Label>
              <Input
                id="manager-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john.doe@example.com"
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manager-phone">
                Phone Number
              </Label>
              <Input
                id="manager-phone"
                type="tel"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                placeholder="+45 12 34 56 78"
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
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
