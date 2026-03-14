// ============================================
// Hook: useAuth
// Hook para gerenciar estado de autenticação
// ============================================

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { localDB } from '@/lib/local-storage';
import { isLocalMode } from '@/lib/config';
import type { User } from '@/types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (isLocalMode()) {
      const localUser = localDB.getUser();
      setUser(localUser);
      setLoading(false);
    } else {
      let mounted = true;

      // Timeout de segurança: se nada responder em 4s, desbloqueia a tela
      const safetyTimeout = setTimeout(() => {
        if (mounted) setLoading(false);
      }, 4000);

      const initAuth = async () => {
        try {
          // getSession() lê do localStorage — instantâneo, sem depender de rede
          const { data: { session } } = await supabase.auth.getSession();
          if (!mounted) return;

          if (session?.user) {
            // Libera a tela imediatamente com dados básicos
            const basicUser: User = {
              id: session.user.id,
              email: session.user.email || '',
              nome: session.user.user_metadata?.nome || session.user.email || 'Usuário',
            } as User;
            setUser(basicUser);
            setLoading(false);
            clearTimeout(safetyTimeout);

            // Busca perfil completo em background sem bloquear
            const { data: userData, error } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (mounted && userData && !error) {
              setUser(userData as User);
            }
          } else {
            setUser(null);
            setLoading(false);
            clearTimeout(safetyTimeout);
          }
        } catch (err) {
          console.error('Erro no initAuth:', err);
          if (mounted) {
            setLoading(false);
            clearTimeout(safetyTimeout);
          }
        }
      };

      initAuth();

      // Mantém listener para sign-in/sign-out após o carregamento inicial
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!mounted) return;
        if (!session?.user) {
          setUser(null);
        } else {
          setUser((prev) => prev ?? {
            id: session.user!.id,
            email: session.user!.email || '',
            nome: session.user!.user_metadata?.nome || session.user!.email || 'Usuário',
          } as User);
        }
        setLoading(false);
        clearTimeout(safetyTimeout);
      });

      return () => {
        mounted = false;
        clearTimeout(safetyTimeout);
        subscription.unsubscribe();
      };
    }
  }, []);

  return { user, loading };
}
