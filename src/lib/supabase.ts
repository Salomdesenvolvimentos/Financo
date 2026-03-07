// ============================================
// FINACO - Cliente Supabase
// Configuração do cliente Supabase para uso no app
// ============================================

import { createClient } from '@supabase/supabase-js';

// Cliente singleton para todo o app
// Fallbacks vazios evitam throw em build (SSG) quando env vars não estão configuradas
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key',
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
