// ============================================
// Hook: useAuth
// Hook para gerenciar estado de autenticação
// ============================================

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { localDB } from '@/lib/local-storage';
import type { User } from '@/types';

const isLocalMode = () => {
  if (typeof window === 'undefined') return false;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  console.log('🔧 NEXT_PUBLIC_SUPABASE_URL:', url);
  const isLocal = url?.includes('localhost:54321') || false;
  console.log('🏠 Modo local ativo?', isLocal);
  return isLocal;
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (isLocalMode()) {
      // Modo local: usar localStorage
      console.log('🔍 Verificando usuário no localStorage...');
      const localUser = localDB.getUser();
      console.log('👤 Usuário encontrado:', localUser);
      setUser(localUser);
      setLoading(false);
    } else {
      // Modo Supabase: desbloqueia a tela imediatamente ao ter a sessão,
      // depois busca dados completos do perfil em background.
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (!session?.user) {
          setUser(null);
          setLoading(false);
          return;
        }

        // Libera o loading com dados básicos da sessão imediatamente
        const basicUser: User = {
          id: session.user.id,
          email: session.user.email || '',
          nome: session.user.user_metadata?.nome || session.user.email || 'Usuário',
        } as User;
        setUser(basicUser);
        setLoading(false);

        // Enriquece com dados completos da tabela users em background
        try {
          const { data: userData, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (userData && !error) {
            setUser(userData as User);
          }
        } catch (err) {
          console.error('Erro ao buscar perfil completo:', err);
          // basicUser já foi definido, não bloqueia nada
        }
      });

      return () => subscription.unsubscribe();
    }
  }, []);

  return { user, loading };
}
