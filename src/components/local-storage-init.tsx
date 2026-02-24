/**
 * Componente que inicializa o armazenamento local
 * na primeira renderização
 */
'use client';

import { useEffect } from 'react';
import { localDB } from '@/lib/local-storage';

export function LocalStorageInit() {
  useEffect(() => {
    // Inicializa dados locais apenas se estiver em modo local
    if (typeof window !== 'undefined') {
      const isLocalMode = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('localhost:54321');
      if (isLocalMode) {
        localDB.init();
        console.log('✅ Modo local ativado - Dados de exemplo carregados');
      }
    }
  }, []);

  return null;
}
