// ============================================
// FINACO - Cliente Supabase
// Configuração do cliente Supabase para uso no app
// ============================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

// Aviso em runtime se as variáveis estiverem faltando.
// O fallback mantido apenas para não quebrar o build Next.js quando as env vars
// não estão disponíveis em tempo de build (ex.: CI sem segredos configurados).
if (
  typeof window !== 'undefined' &&
  (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
) {
  console.error(
    '[Financo] Configuração Supabase ausente. ' +
    'Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no arquivo .env.local'
  );
}

// Cliente singleton para todo o app
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'finaco-auth',
  },
});

export type SupabaseClient = typeof supabase;
