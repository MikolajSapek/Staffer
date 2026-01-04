# Supabase RPC Function Calls Documentation

This document lists all RPC function calls found in the codebase with their parameters and calling context.

---

## 1. `get_my_finances_v2`

**Function Name:** `get_my_finances_v2`

**Parameters:** None

**Calling Context:**
- **File:** `app/[lang]/finances/page.tsx`
- **Function:** `FinancesPage` (default export, async server component)
- **Line:** 38

**Code:**
```typescript
const { data: finances, error: financesError } = await supabase
  .rpc('get_my_finances_v2');
```

**Notes:** 
- Called in server component
- No parameters passed
- Used to fetch approved timesheets/finances for worker role

---

## 2. `upsert_company_secure`

**Function Name:** `upsert_company_secure`

**Parameters:**
```typescript
{
  p_company_name: string;
  p_cvr_number: string;
  p_main_address: string | null;
  p_ean_number: string | null;
  p_invoice_email: string | null;
  p_description: string | null;
  p_logo_url: string | null;
  p_cover_photo_url: string | null;
}
```

**TypeScript Interface (from code):**
```typescript
const rpcParams: {
  p_company_name: string;
  p_cvr_number: string;
  p_main_address: string | null;
  p_ean_number: string | null;
  p_invoice_email: string | null;
  p_description: string | null;
  p_logo_url: string | null;
  p_cover_photo_url: string | null;
} = {
  p_company_name: validatedData.company_name.trim(),
  p_cvr_number: validatedData.cvr_number.trim(),
  p_main_address: validatedData.main_address?.trim() || null,
  p_ean_number: validatedData.ean_number?.trim() || null,
  p_invoice_email: validatedData.invoice_email?.trim() || null,
  p_description: validatedData.description?.trim() || null,
  p_logo_url: logoUrl || null,
  p_cover_photo_url: coverPhotoUrl || null,
};
```

**Calling Context:**
- **File:** `components/profile/CompanyProfileForm.tsx`
- **Function:** `handleSubmit` (inside `CompanyProfileForm` component)
- **Line:** 379

**Code:**
```typescript
const { error: rpcError } = await supabase.rpc('upsert_company_secure', rpcParams);
```

**Notes:**
- Called in client component
- All parameters prefixed with `p_`
- Used to create or update company profile details

---

## 3. `get_worker_profile_secure`

**Function Name:** `get_worker_profile_secure`

**Parameters:** None

**Calling Context:**
- **File:** `components/profile/WorkerProfileForm.tsx`
- **Function 1:** `fetchData` (inside `useEffect` hook)
- **Line 1:** 92
- **Function 2:** `setTimeout` callback (after successful save)
- **Line 2:** 396

**Code (first call):**
```typescript
const { data: workerData, error: workerError } = await supabase.rpc('get_worker_profile_secure');
```

**Code (second call):**
```typescript
const { data: refreshedData } = await supabase.rpc('get_worker_profile_secure');
```

**Notes:**
- Called in client component
- No parameters passed
- Returns worker profile with decrypted CPR number
- Called twice: once on mount to load data, once after saving to refresh

---

## 4. `upsert_worker_secure`

**Function Name:** `upsert_worker_secure`

**Parameters:**
```typescript
{
  p_first_name: string;
  p_last_name: string;
  p_phone_number: string;
  p_cpr_number: string | null;
  p_tax_card_type: 'Hovedkort' | 'Bikort' | 'Frikort';
  p_bank_reg_number: string;
  p_bank_account_number: string;
  p_description: string | null;
  p_experience: string | null;
  p_avatar_url: string | null;
  p_id_card_url: string | null;
}
```

**TypeScript Interface (from code):**
```typescript
const rpcParams: {
  p_first_name: string;
  p_last_name: string;
  p_phone_number: string;
  p_cpr_number: string | null;
  p_tax_card_type: TaxCardType; // where TaxCardType = 'Hovedkort' | 'Bikort' | 'Frikort'
  p_bank_reg_number: string;
  p_bank_account_number: string;
  p_description: string | null;
  p_experience: string | null;
  p_avatar_url: string | null;
  p_id_card_url: string | null;
} = {
  p_first_name: formData.first_name.trim(),
  p_last_name: formData.last_name.trim(),
  p_phone_number: formData.phone_number.trim(),
  p_cpr_number: cprNumber || null, // Send plain text, DB handles encryption
  p_tax_card_type: formData.tax_card_type,
  p_bank_reg_number: formData.bank_reg_number.trim(),
  p_bank_account_number: formData.bank_account_number.trim(),
  p_description: formData.description.trim() || null,
  p_experience: formData.experience.trim() || null,
  p_avatar_url: avatarUrl || null,
  p_id_card_url: idCardUrl || null,
};
```

**Calling Context:**
- **File:** `components/profile/WorkerProfileForm.tsx`
- **Function:** `handleSubmit` (inside `WorkerProfileForm` component)
- **Line:** 377

**Code:**
```typescript
const { error: rpcError } = await supabase.rpc('upsert_worker_secure', rpcParams);
```

**Notes:**
- Called in client component
- All parameters prefixed with `p_`
- `p_cpr_number` is sent as plain text; database handles encryption
- `p_tax_card_type` is an enum with values: 'Hovedkort' | 'Bikort' | 'Frikort'
- Used to create or update worker profile details

---

## 5. `decrypt_cpr`

**Function Name:** `decrypt_cpr`

**Parameters:**
```typescript
{
  cpr_encrypted: string;
  encryption_key: string;
}
```

**Calling Context:**
- **File:** `supabase/edge-functions/decrypt-cpr/index.ts`
- **Function:** Anonymous async function inside `serve()` handler
- **Line:** 32

**Code:**
```typescript
const { data, error } = await supabaseClient.rpc('decrypt_cpr', {
  cpr_encrypted: encryptedCPR,
  encryption_key: encryptionKey,
});
```

**Full Context:**
```typescript
serve(async (req) => {
  // ... CORS handling ...
  
  const { encryptedCPR, encryptionKey } = await req.json();
  
  // ...
  
  const { data, error } = await supabaseClient.rpc('decrypt_cpr', {
    cpr_encrypted: encryptedCPR,
    encryption_key: encryptionKey,
  });
});
```

**Notes:**
- Called from Supabase Edge Function (Deno runtime)
- Uses service role key for authentication
- Parameters: `cpr_encrypted` (string), `encryption_key` (string)
- Used to decrypt CPR numbers

---

## 6. `encrypt_cpr`

**Function Name:** `encrypt_cpr`

**Parameters:**
```typescript
{
  cpr_text: string;
  encryption_key: string;
}
```

**Calling Context:**
- **File:** `supabase/edge-functions/encrypt-cpr/index.ts`
- **Function:** Anonymous async function inside `serve()` handler
- **Line:** 32

**Code:**
```typescript
const { data, error } = await supabaseClient.rpc('encrypt_cpr', {
  cpr_text: cpr,
  encryption_key: encryptionKey,
});
```

**Full Context:**
```typescript
serve(async (req) => {
  // ... CORS handling ...
  
  const { cpr, encryptionKey } = await req.json();
  
  // ...
  
  const { data, error } = await supabaseClient.rpc('encrypt_cpr', {
    cpr_text: cpr,
    encryption_key: encryptionKey,
  });
});
```

**Notes:**
- Called from Supabase Edge Function (Deno runtime)
- Uses service role key for authentication
- Parameters: `cpr_text` (string), `encryption_key` (string)
- Used to encrypt CPR numbers

---

## Summary

Total unique RPC functions found: **6**

1. `get_my_finances_v2` - No parameters
2. `upsert_company_secure` - 8 parameters (all prefixed with `p_`)
3. `get_worker_profile_secure` - No parameters
4. `upsert_worker_secure` - 11 parameters (all prefixed with `p_`)
5. `decrypt_cpr` - 2 parameters
6. `encrypt_cpr` - 2 parameters

All RPC calls use the standard Supabase client `.rpc()` method pattern.

