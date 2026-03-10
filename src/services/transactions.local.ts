// ============================================
// FINACO - Serviços de Transações
// CRUD via Supabase para transações
// ============================================

'use client';

import { supabase } from '@/lib/supabase';
import type {
  Transaction,
  TransactionFormData,
  TransactionFilters,
} from '@/types';
import { addMonths, formatDateISO } from '@/lib/utils';

/**
 * Busca todas as transações do usuário com filtros
 */
export async function getTransactions(filters?: TransactionFilters) {
  try {
    let query = supabase
      .from('transactions')
      .select('*, categoria:categories(*)')
      .order('data_transacao', { ascending: false });

    if (filters?.tipo) {
      query = query.eq('tipo', filters.tipo);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.categoria_id) {
      query = query.eq('categoria_id', filters.categoria_id);
    }
    if (filters?.forma_pagamento) {
      query = query.eq('forma_pagamento', filters.forma_pagamento);
    }
    if (filters?.mes) {
      const [year, month] = filters.mes.split('-');
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate(); // Último dia do mês
      query = query.gte('data_transacao', `${year}-${month.padStart(2, '0')}-01`)
                   .lte('data_transacao', `${year}-${month.padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`);
    }
    if (filters?.data_inicio) {
      query = query.gte('data_transacao', filters.data_inicio);
    }
    if (filters?.data_fim) {
      query = query.lte('data_transacao', filters.data_fim);
    }
    if (filters?.busca) {
      query = query.ilike('descricao', `%${filters.busca}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    return { data: data as Transaction[], error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}

/**
 * Cria uma nova transação
 */
export async function createTransaction(transactionData: TransactionFormData) {
  try {
    // Limpar campos de data vazios (converter string vazia para undefined)
    const cleanedData = { ...transactionData };
    if (cleanedData.data_vencimento === '') {
      cleanedData.data_vencimento = undefined;
    }
    if (cleanedData.forma_pagamento === '') {
      cleanedData.forma_pagamento = undefined;
    }
    if (cleanedData.observacoes === '') {
      cleanedData.observacoes = undefined;
    }
    
    // Obter user_id do usuário autenticado
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    // Buscar o user_id da tabela public.users
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!userData) {
      throw new Error('Perfil de usuário não encontrado');
    }

    const { data, error } = await supabase
      .from('transactions')
      .insert([{
        ...cleanedData,
        user_id: userData.id,
      }])
      .select()
      .single();

    if (error) throw error;

    return { data: data as Transaction, error: null };
  } catch (error: any) {
    console.error('Erro ao criar transação:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Atualiza uma transação
 */
export async function updateTransaction(transactionId: string, transactionData: Partial<TransactionFormData>) {
  try {
    // Limpar campos de data vazios (converter string vazia para null)
    const cleanedData = { ...transactionData };
    if (cleanedData.data_vencimento === '') {
      cleanedData.data_vencimento = undefined;
    }
    if (cleanedData.forma_pagamento === '') {
      cleanedData.forma_pagamento = undefined;
    }
    if (cleanedData.observacoes === '') {
      cleanedData.observacoes = undefined;
    }
    
    const { data, error } = await supabase
      .from('transactions')
      .update(cleanedData)
      .eq('id', transactionId)
      .select()
      .single();

    if (error) throw error;

    return { data: data as Transaction, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}

/**
 * Deleta uma transação
 */
export async function deleteTransaction(transactionId: string) {
  try {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', transactionId);

    if (error) throw error;

    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * Cria parcelas de uma transação
 */
export async function createInstallments(transactionData: TransactionFormData, parcelas: number) {
  try {
    const valorParcela = transactionData.valor / parcelas;
    const grupoId = crypto.randomUUID();
    const transacoesParceladas = [];

    for (let i = 0; i < parcelas; i++) {
      const dataTransacao = addMonths(new Date(transactionData.data_transacao), i);
      transacoesParceladas.push({
        ...transactionData,
        valor: valorParcela,
        data_transacao: formatDateISO(dataTransacao),
        descricao: `${transactionData.descricao} (${i + 1}/${parcelas})`,
        grupo_parcela_id: grupoId,
        parcelado: true,
        parcela_atual: i + 1,
        total_parcelas: parcelas,
      });
    }

    const { data, error } = await supabase
      .from('transactions')
      .insert(transacoesParceladas)
      .select();

    if (error) throw error;

    return { data: data as Transaction[], error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}

/**
 * Deleta grupo de parcelamento
 */
export async function deleteInstallmentGroup(grupoId: string) {
  try {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('grupo_parcela_id', grupoId);

    if (error) throw error;

    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
}
