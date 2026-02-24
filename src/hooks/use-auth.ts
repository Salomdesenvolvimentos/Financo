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
      // Modo Supabase: buscar dados completos do usuário
      const fetchUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // Buscar dados do perfil na tabela public.users
          const { data: userData, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (userData && !error) {
            setUser(userData as User);
          } else {
            console.error('Erro ao buscar perfil:', error);
            setUser(null);
          }
        } else {
          setUser(null);
        }
        setLoading(false);
      };

      fetchUser();

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          const { data: userData } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          setUser(userData as User || null);
        } else {
          setUser(null);
        }
        setLoading(false);
      });

      return () => subscription.unsubscribe();
    }
  }, []);

  return { user, loading };
}
