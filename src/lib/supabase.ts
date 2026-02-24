// ============================================
// FINACO - Cliente Supabase
// Configuração do cliente Supabase para uso no app
// ============================================

import { createClient } from '@supabase/supabase-js';

// Cliente singleton para todo o app
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'finaco-auth',
    },
  }
);

// Tipo para o cliente Supabase
export type SupabaseClient = typeof supabase;
