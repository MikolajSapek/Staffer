import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Enhanced error checking with console logging for debugging
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase ENV variables are MISSING!', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseAnonKey,
      urlLength: supabaseUrl?.length || 0,
      keyLength: supabaseAnonKey?.length || 0,
    });
    throw new Error(
      'Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel Settings → Environment Variables.'
    );
  }

  // Validate URL format
  try {
    new URL(supabaseUrl);
  } catch (error) {
    console.error('Invalid Supabase URL format:', supabaseUrl);
    throw new Error('Invalid NEXT_PUBLIC_SUPABASE_URL format. Must be a valid URL.');
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
    realtime: {
      // Wymuś ping co 10-15 sekund (Eduroam często ubija połączenia po 30-60s bezczynności)
      heartbeatIntervalMs: 15000,
      params: {
        // Zwiększ limit zdarzeń, aby uniknąć dławienia przy reconnectach
        eventsPerSecond: 10,
      },
    },
    global: {
      fetch: (url, options) => {
        return fetch(url, {
          ...options,
          // Wymusza tryb cors, co czasem pomaga przeglądarce w negocjacji TCP
          mode: 'cors',
        });
      },
    },
  });
}

