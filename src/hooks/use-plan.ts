'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './use-auth';
import { supabase } from '@/lib/supabase';
import type { Plan, Subscription } from '@/types';

const CACHE_KEY = 'financo_plan';

export function usePlan() {
  const { user } = useAuth();

  // Inicializa do cache local para evitar flash de "free" antes da consulta
  const [plan, setPlan] = useState<Plan>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem(CACHE_KEY) as Plan) || 'free';
    }
    return 'free';
  });
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    async function fetchPlan() {
      try {
        // Busca o plano diretamente da tabela users (atualizado pelo webhook Stripe)
        const { data } = await supabase
          .from('users')
          .select('plan')
          .eq('id', user!.id)
          .single();

        const fetchedPlan: Plan = (data?.plan as Plan) || 'free';
        setPlan(fetchedPlan);
        if (typeof window !== 'undefined') {
          localStorage.setItem(CACHE_KEY, fetchedPlan);
        }

        // Busca detalhes da assinatura (opcional, para exibir na página)
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        setSubscription(sub as Subscription | null);
      } catch {
        // Em caso de erro, mantém o cache local
      } finally {
        setLoading(false);
      }
    }

    fetchPlan();
  }, [user?.id]);

  return {
    plan,
    isPremium: plan === 'premium',
    subscription,
    loading,
  };
}
