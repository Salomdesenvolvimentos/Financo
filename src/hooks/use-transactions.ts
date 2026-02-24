// ============================================
// Hook: useTransactions
// Hook para gerenciar transações
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { getTransactions } from '@/services/transactions.local';
import type { Transaction, TransactionFilters } from '@/types';

export function useTransactions(userId: string, filters?: TransactionFilters) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    async function fetchTransactions() {
      setLoading(true);
      const { data, error } = await getTransactions(filters);

      if (error) {
        setError(error);
      } else {
        setTransactions(data || []);
      }

      setLoading(false);
    }

    fetchTransactions();
  }, [userId, JSON.stringify(filters)]);

  const refresh = async () => {
    setLoading(true);
    const { data, error } = await getTransactions(filters);

    if (error) {
      setError(error);
    } else {
      setTransactions(data || []);
    }

    setLoading(false);
  };

  return { transactions, loading, error, refresh };
}
