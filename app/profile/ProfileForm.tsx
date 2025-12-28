'use client';

import { useState, useEffect } from 'react';
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
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

interface ProfileFormProps {
  initialData: any;
  userId: string;
}

type TaxCardType = 'Hovedkort' | 'Bikort' | 'Frikort';

export default function ProfileForm({ initialData, userId }: ProfileFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    first_name: initialData?.first_name || '',
    last_name: initialData?.last_name || '',
    phone_number: initialData?.phone_number || '',
    tax_card_type: (initialData?.tax_card_type || 'Hovedkort') as TaxCardType,
    bank_reg_number: initialData?.bank_reg_number || '',
    bank_account_number: initialData?.bank_account_number || '',
    su_limit_amount: initialData?.su_limit_amount?.toString() || '',
    shirt_size: initialData?.shirt_size || '',
    shoe_size: initialData?.shoe_size || '',
    avatar_url: initialData?.avatar_url || '',
    cpr_number: '', // Never stored in plain text - always empty on load
  });

  // Update form data when initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData({
        first_name: initialData?.first_name || '',
        last_name: initialData?.last_name || '',
        phone_number: initialData?.phone_number || '',
        tax_card_type: (initialData?.tax_card_type || 'Hovedkort') as TaxCardType,
        bank_reg_number: initialData?.bank_reg_number || '',
        bank_account_number: initialData?.bank_account_number || '',
        su_limit_amount: initialData?.su_limit_amount?.toString() || '',
        shirt_size: initialData?.shirt_size || '',
        shoe_size: initialData?.shoe_size || '',
        avatar_url: initialData?.avatar_url || '',
        cpr_number: '', // Never stored in plain text
      });
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const supabase = createClient();

      // Validate required fields
      if (!formData.first_name.trim() || !formData.last_name.trim()) {
        throw new Error('Fornavn og efternavn er påkrævet');
      }

      if (!formData.phone_number.trim()) {
        throw new Error('Telefonnummer er påkrævet');
      }

      if (!formData.bank_reg_number.trim() || !formData.bank_account_number.trim()) {
        throw new Error('Bankoplysninger er påkrævet');
      }

      // Handle CPR encryption if provided
      let cprEncrypted = initialData?.cpr_number_encrypted;
      if (formData.cpr_number.trim()) {
        // Validate CPR format (DDMMYY-XXXX)
        const cprRegex = /^\d{6}-?\d{4}$/;
        if (!cprRegex.test(formData.cpr_number.replace(/-/g, ''))) {
          throw new Error('CPR-nummer skal være i formatet DDMMÅÅ-XXXX');
        }

        // Try to encrypt via edge function
        try {
        const { data: encryptedData, error: encryptError } = await supabase.functions.invoke(
          'encrypt-cpr',
          {
            body: { cpr: formData.cpr_number },
          }
        );

        if (encryptError || !encryptedData?.encrypted) {
            console.warn('CPR encryption failed, but continuing without it:', encryptError);
            // Don't throw - allow form submission without CPR if encryption fails
            // The user can add it later
          } else {
            cprEncrypted = encryptedData.encrypted;
          }
        } catch (encryptErr: any) {
          console.warn('CPR encryption error:', encryptErr);
          // Continue without CPR encryption - user can add it later
        }
      }

      // If no CPR encrypted value exists (neither from initial data nor newly entered), we can't save
      // The database requires cpr_number_encrypted to be NOT NULL
      if (!cprEncrypted && !initialData?.cpr_number_encrypted) {
        throw new Error('CPR-nummer er påkrævet. Indtast dit CPR-nummer for at fortsætte.');
      }

      // Use existing encrypted CPR if no new one was provided
      if (!cprEncrypted && initialData?.cpr_number_encrypted) {
        cprEncrypted = initialData.cpr_number_encrypted;
      }

      // Prepare update data
      const updateData: any = {
        profile_id: userId,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        phone_number: formData.phone_number.trim(),
        tax_card_type: formData.tax_card_type,
        bank_reg_number: formData.bank_reg_number.trim(),
        bank_account_number: formData.bank_account_number.trim(),
      };

      // Add optional fields if provided
      if (formData.su_limit_amount.trim()) {
        const suAmount = parseFloat(formData.su_limit_amount);
        if (!isNaN(suAmount) && suAmount >= 0) {
          updateData.su_limit_amount = suAmount;
        }
      }

      if (formData.shirt_size.trim()) {
        updateData.shirt_size = formData.shirt_size.trim();
      }

      if (formData.shoe_size.trim()) {
        updateData.shoe_size = formData.shoe_size.trim();
      }

      if (formData.avatar_url.trim()) {
        updateData.avatar_url = formData.avatar_url.trim();
      }

      // Add encrypted CPR if available
      if (cprEncrypted) {
        updateData.cpr_number_encrypted = cprEncrypted;
      }

      // Upsert worker details
      const { error: upsertError } = await supabase
        .from('worker_details')
        .upsert(updateData, { onConflict: 'profile_id' });

      if (upsertError) {
        console.error('Upsert error:', upsertError);
        throw new Error(upsertError.message || 'Kunne ikke gemme oplysninger');
      }

      setSuccess(true);
      setTimeout(() => {
      router.refresh();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Der opstod en fejl ved gemning af oplysninger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 text-sm text-green-600 bg-green-50 rounded-md border border-green-200">
          Profil opdateret! Opdaterer siden...
        </div>
      )}

      {/* Personal Information Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Personlige oplysninger</h3>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
            <Label htmlFor="first_name">Fornavn *</Label>
          <Input
            id="first_name"
            value={formData.first_name}
            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            required
              placeholder="Indtast dit fornavn"
          />
        </div>
        <div className="space-y-2">
            <Label htmlFor="last_name">Efternavn *</Label>
          <Input
            id="last_name"
            value={formData.last_name}
            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            required
              placeholder="Indtast dit efternavn"
          />
        </div>
      </div>

      <div className="space-y-2">
          <Label htmlFor="phone_number">Telefonnummer *</Label>
        <Input
          id="phone_number"
          type="tel"
          value={formData.phone_number}
          onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
          required
            placeholder="+45 12 34 56 78"
        />
      </div>

      <div className="space-y-2">
          <Label htmlFor="cpr_number">
            CPR-nummer {!initialData?.cpr_number_encrypted && '*'}
          </Label>
        <Input
          id="cpr_number"
          type="text"
            placeholder={initialData?.cpr_number_encrypted ? "Indtast nyt CPR-nummer for at opdatere" : "DDMMÅÅ-XXXX"}
          value={formData.cpr_number}
          onChange={(e) => setFormData({ ...formData, cpr_number: e.target.value })}
            required={!initialData?.cpr_number_encrypted}
            maxLength={11}
        />
        <p className="text-xs text-muted-foreground">
            {initialData?.cpr_number_encrypted 
              ? "CPR-nummer er allerede gemt. Indtast kun hvis du vil opdatere det."
              : "CPR-nummeret bliver krypteret og gemt sikkert. Påkrævet ved første oprettelse."}
        </p>
        </div>
      </div>

      {/* Tax and Bank Information Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Skatte- og bankoplysninger</h3>
        
        <div className="space-y-2">
          <Label htmlFor="tax_card_type">Skattekort type *</Label>
          <Select
            value={formData.tax_card_type}
            onValueChange={(value) => setFormData({ ...formData, tax_card_type: value as TaxCardType })}
            required
          >
            <SelectTrigger id="tax_card_type">
              <SelectValue placeholder="Vælg skattekort type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Hovedkort">Hovedkort</SelectItem>
              <SelectItem value="Bikort">Bikort</SelectItem>
              <SelectItem value="Frikort">Frikort</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="bank_reg_number">Registreringsnummer *</Label>
          <Input
            id="bank_reg_number"
            value={formData.bank_reg_number}
            onChange={(e) => setFormData({ ...formData, bank_reg_number: e.target.value })}
            required
              placeholder="1234"
              maxLength={4}
          />
        </div>
        <div className="space-y-2">
            <Label htmlFor="bank_account_number">Kontonummer *</Label>
          <Input
            id="bank_account_number"
            value={formData.bank_account_number}
            onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })}
            required
              placeholder="1234567890"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="su_limit_amount">SU-grænse (valgfrit)</Label>
          <Input
            id="su_limit_amount"
            type="number"
            step="0.01"
            min="0"
            value={formData.su_limit_amount}
            onChange={(e) => setFormData({ ...formData, su_limit_amount: e.target.value })}
            placeholder="0.00"
          />
          <p className="text-xs text-muted-foreground">
            Maksimalt beløb du kan tjene uden at påvirke din SU
          </p>
        </div>
      </div>

      {/* Additional Information Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Yderligere oplysninger (valgfrit)</h3>
        
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="shirt_size">T-shirt størrelse</Label>
            <Input
              id="shirt_size"
              value={formData.shirt_size}
              onChange={(e) => setFormData({ ...formData, shirt_size: e.target.value })}
              placeholder="S, M, L, XL, etc."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shoe_size">Sko størrelse</Label>
            <Input
              id="shoe_size"
              value={formData.shoe_size}
              onChange={(e) => setFormData({ ...formData, shoe_size: e.target.value })}
              placeholder="38, 39, 40, etc."
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="avatar_url">Profilbillede URL (valgfrit)</Label>
          <Input
            id="avatar_url"
            type="url"
            value={formData.avatar_url}
            onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
            placeholder="https://example.com/avatar.jpg"
          />
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t">
        <Button type="submit" disabled={loading} size="lg">
        {loading ? 'Gemmer...' : 'Gem oplysninger'}
      </Button>
      </div>
    </form>
  );
}
