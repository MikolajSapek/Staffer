'use client';

import { useActionState, useEffect, useState } from 'react';
import { submitSupportForm, type SupportFormState } from '@/app/actions/support';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';

interface SupportFormProps {
  dict: {
    form_title: string;
    form_email: string;
    form_subject: string;
    form_message: string;
    submit_btn: string;
    success_title: string;
    success_desc: string;
  };
}

const initialState: SupportFormState = {
  success: false,
  error: undefined,
  message: undefined,
};

export default function SupportForm({ dict }: SupportFormProps) {
  const [state, formAction, isPending] = useActionState(
    submitSupportForm,
    initialState
  );
  const [charCount, setCharCount] = useState(0);

  // Reset form on success
  useEffect(() => {
    if (state.success) {
      // Find the form and reset it
      const form = document.getElementById('support-form') as HTMLFormElement;
      if (form) {
        form.reset();
        setCharCount(0);
      }
    }
  }, [state.success]);

  // Show success state
  if (state.success) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <CheckCircle2 className="h-16 w-16 text-green-600" />
          </div>
          <CardTitle className="text-center text-2xl">
            {dict.success_title}
          </CardTitle>
          <CardDescription className="text-center">
            {dict.success_desc}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            className="w-full"
            onClick={() => window.location.reload()}
          >
            Send Another Message
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.form_title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form id="support-form" action={formAction} className="space-y-4">
          {state.error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              <strong>Error:</strong> {state.error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">{dict.form_email}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="your@email.com"
              required
              disabled={isPending}
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">{dict.form_subject}</Label>
            <Input
              id="subject"
              name="subject"
              type="text"
              placeholder="Brief description of your issue"
              required
              disabled={isPending}
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">{dict.form_message}</Label>
            <Textarea
              id="message"
              name="message"
              placeholder="Please describe your issue in detail..."
              required
              disabled={isPending}
              rows={6}
              maxLength={1000}
              onChange={(e) => setCharCount(e.target.value.length)}
            />
            <div className="flex justify-end">
              <span
                className={`text-xs ${
                  charCount > 900
                    ? 'text-orange-500'
                    : 'text-gray-500'
                }`}
              >
                {charCount}/1000
              </span>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Sending...' : dict.submit_btn}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
