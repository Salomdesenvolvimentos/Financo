'use client';

// ============================================
// Hook global: solicitações de amizade pendentes
// Ativo em qualquer página do dashboard —
// mostra toast + badge no menu quando chega pedido.
// ============================================

import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { getMyFriendships } from '@/services/social';

export function useFriendRequests() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pendingCount, setPendingCount] = useState(0);
  // Guarda os IDs já vistos para detectar pedidos novos
  const knownIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    const ships = await getMyFriendships(user.id);
    const pending = ships.filter(
      f => f.status === 'pending' && f.addressee_id === user.id
    );
    setPendingCount(pending.length);

    // Na primeira carga só registra os IDs, não mostra toast
    if (!initialized.current) {
      pending.forEach(f => knownIds.current.add(f.id));
      initialized.current = true;
      return;
    }

    // Detecta pedidos novos e mostra toast
    pending.forEach(f => {
      if (!knownIds.current.has(f.id)) {
        knownIds.current.add(f.id);
        const senderName =
          (f as any).requester?.display_name ??
          (f as any).requester?.email ??
          'Alguém';
        toast({
          title: '👋 Nova solicitação de amizade!',
          description: `${senderName} quer ser seu amigo no Financo.`,
        });
      }
    });
  }, [user?.id, toast]);

  // Carga inicial
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Subscription em tempo real — ativa em qualquer página
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`friend-requests-global-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
          filter: `addressee_id=eq.${user.id}`,
        },
        () => { refresh(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, refresh]);

  return { pendingCount };
}
