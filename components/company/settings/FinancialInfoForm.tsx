'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

const financialSchema = z.object({
  company_name: z.string().min(1, 'Company name is required'),
  cvr_number: z.string().min(1, 'CVR/VAT number is required'),
  invoice_email: z.string().email('Invalid email address').optional().or(z.literal('')),
  main_address: z.string().optional(),
  ean_number: z.string().optional(),
});

type FinancialFormData = z.infer<typeof financialSchema>;

interface FinancialInfoFormProps {
  userId: string;
}

export default function FinancialInfoForm({ userId }: FinancialInfoFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FinancialFormData>({
    resolver: zodResolver(financialSchema),
    defaultValues: {
      company_name: '',
      cvr_number: '',
      invoice_email: '',
      main_address: '',
      ean_number: '',
    },
  });

  // Fetch company financial data
  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = createClient();
        
        const { data: companyData, error } = await supabase
          .from('company_details')
          .select('company_name, cvr_number, invoice_email, main_address, ean_number')
          .eq('profile_id', userId)
          .maybeSingle();

        if (!error && companyData) {
          reset({
            company_name: companyData.company_name || '',
            cvr_number: companyData.cvr_number || '',
            invoice_email: companyData.invoice_email || '',
            main_address: companyData.main_address || '',
            ean_number: companyData.ean_number || '',
          });
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching financial data:', err);
        setIsLoading(false);
      }
    }

    fetchData();
  }, [userId, reset]);

  const onSubmit = async (data: FinancialFormData) => {
    setSubmitLoading(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      const supabase = createClient();

      // Update company_details
      const { error: updateError } = await supabase
        .from('company_details')
        .update({
          company_name: data.company_name.trim(),
          cvr_number: data.cvr_number.trim(),
          invoice_email: data.invoice_email?.trim() || null,
          main_address: data.main_address?.trim() || null,
          ean_number: data.ean_number?.trim() || null,
        })
        .eq('profile_id', userId);

      if (updateError) {
        setSubmitError(updateError.message || 'Could not save financial information');
        setSubmitLoading(false);
        return;
      }

      setSubmitSuccess(true);
      router.refresh();

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Error saving financial information:', err);
      setSubmitError('An unexpected error occurred');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial Information</CardTitle>
        <CardDescription>
          Manage your company's financial and billing details
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {submitError && (
            <div className="p-4 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
              {submitError}
            </div>
          )}
          {submitSuccess && (
            <div className="p-4 text-sm text-green-600 bg-green-50 rounded-md border border-green-200">
              Financial information saved successfully
            </div>
          )}

          {/* Company Name - Read Only */}
          <div className="space-y-2">
            <Label htmlFor="company_name">Company Name *</Label>
            <Input
              id="company_name"
              {...register('company_name')}
              disabled
              className="bg-muted cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground">
              Company name is read-only. Contact support to change it.
            </p>
            {errors.company_name && (
              <p className="text-sm text-red-600">{errors.company_name.message}</p>
            )}
          </div>

          {/* CVR/VAT Number */}
          <div className="space-y-2">
            <Label htmlFor="cvr_number">CVR/VAT Number *</Label>
            <Input
              id="cvr_number"
              {...register('cvr_number')}
              placeholder="12345678"
              disabled={submitLoading}
            />
            <p className="text-xs text-muted-foreground">
              Your company's CVR or VAT registration number
            </p>
            {errors.cvr_number && (
              <p className="text-sm text-red-600">{errors.cvr_number.message}</p>
            )}
          </div>

          {/* Invoice Email */}
          <div className="space-y-2">
            <Label htmlFor="invoice_email">Invoice Email</Label>
            <Input
              id="invoice_email"
              type="email"
              {...register('invoice_email')}
              placeholder="invoices@company.com"
              disabled={submitLoading}
            />
            <p className="text-xs text-muted-foreground">
              Email address for receiving invoices and billing notifications
            </p>
            {errors.invoice_email && (
              <p className="text-sm text-red-600">{errors.invoice_email.message}</p>
            )}
          </div>

          {/* Main Address */}
          <div className="space-y-2">
            <Label htmlFor="main_address">Main Address</Label>
            <Input
              id="main_address"
              {...register('main_address')}
              placeholder="123 Main Street, Copenhagen"
              disabled={submitLoading}
            />
            <p className="text-xs text-muted-foreground">
              Your company's primary business address
            </p>
            {errors.main_address && (
              <p className="text-sm text-red-600">{errors.main_address.message}</p>
            )}
          </div>

          {/* EAN Number - Optional */}
          <div className="space-y-2">
            <Label htmlFor="ean_number">EAN Number (Optional)</Label>
            <Input
              id="ean_number"
              {...register('ean_number')}
              placeholder="5798000000000"
              disabled={submitLoading}
            />
            <p className="text-xs text-muted-foreground">
              Electronic invoicing number (EAN) for automated billing
            </p>
            {errors.ean_number && (
              <p className="text-sm text-red-600">{errors.ean_number.message}</p>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button type="submit" disabled={submitLoading} size="lg">
              {submitLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
