// @ts-nocheck
// Supabase Edge Function for CPR encryption
// Deploy with: supabase functions deploy encrypt-cpr
// This file uses Deno runtime, not Node.js

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { cpr, encryptionKey } = await req.json();

    if (!cpr || !encryptionKey) {
      throw new Error('Missing required parameters');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Call the encrypt_cpr function in the database
    const { data, error } = await supabaseClient.rpc('encrypt_cpr', {
      cpr_text: cpr,
      encryption_key: encryptionKey,
    });

    if (error) throw error;

    return new Response(
      JSON.stringify({ encrypted: data }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

