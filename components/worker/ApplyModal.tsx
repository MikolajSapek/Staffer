'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { createClient } from '@/utils/supabase/client';
import { Loader2 } from 'lucide-react';

interface Shift {
  id: string;
  title: string;
  company_id: string;
}

interface ApplyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift: Shift | null;
  dict: {
    title: string;
    confirmText: string;
    messageLabel: string;
    messagePlaceholder: string;
    cancel: string;
    confirm: string;
    applying: string;
    success: string;
    alreadyApplied: string;
    error: string;
  };
  lang: string;
  onSuccess?: (shift: Shift) => void;
}

export default function ApplyModal({
  open,
  onOpenChange,
  shift,
  dict,
  lang,
  onSuccess,
}: ApplyModalProps) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!shift) return;

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      // Handle network/auth errors
      if (authError) {
        if (authError.message?.includes('Failed to fetch') || authError.message?.includes('NetworkError')) {
          console.error('Supabase connection error in ApplyModal:', authError.message);
          setError('Connection error. Please check your internet connection and try again.');
          setLoading(false);
          return;
        }
        router.push(`/${lang}/login`);
        return;
      }

      if (!user) {
        router.push(`/${lang}/login`);
        return;
      }

      // Insert application
      const { error: insertError } = await supabase
        .from('shift_applications')
        .insert({
          shift_id: shift.id,
          worker_id: user.id,
          company_id: shift.company_id,
          status: 'pending',
          worker_message: message.trim() || null,
        });

      if (insertError) {
        // Check if it's a unique constraint violation (already applied)
        if (insertError.code === '23505') {
          setError(dict.alreadyApplied);
        } else if (
          insertError.code === '42501' ||
          insertError.message?.toLowerCase().includes('row-level security') ||
          insertError.message?.toLowerCase().includes('policy')
        ) {
          setError('You must verify your identity first.');
        } else {
          setError(dict.error);
        }
        setLoading(false);
        return;
      }

      // Success - close modal and reset
      setMessage('');
      setError(null);
      onOpenChange(false);
      setLoading(false);
      
      if (onSuccess) {
        onSuccess(shift);
      }
    } catch (err: unknown) {
      setError(dict.error);
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!loading) {
      onOpenChange(newOpen);
      if (!newOpen) {
        // Reset state when closing
        setMessage('');
        setError(null);
      }
    }
  };

  if (!shift) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dict.title.replace('{shift.title}', shift.title)}</DialogTitle>
          <DialogDescription>{dict.confirmText}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="message">{dict.messageLabel}</Label>
            <Textarea
              id="message"
              placeholder={dict.messagePlaceholder}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={loading}
              rows={4}
              maxLength={100}
            />
            <div className="text-xs text-muted-foreground text-right">
              {message.length}/100
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={loading}
          >
            {dict.cancel}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {dict.applying}
              </>
            ) : (
              dict.confirm
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

