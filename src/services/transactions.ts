// ============================================
// FINACO - Serviços de Transações
// Funções para gerenciamento de transações financeiras
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
      .select(
        `
        *,
        categoria:categories(*)
      `
      )
      .order('data_transacao', { ascending: false });

    // Aplicar filtros
    if (filters?.tipo) {
      query = query.eq('tipo', filters.tipo);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.categoria_id) {
      query = query.eq('categoria_id', filters.categoria_id);
    }
    if (filters?.data_inicio) {
      query = query.gte('data_transacao', filters.data_inicio);
    }
    if (filters?.data_fim) {
      query = query.lte('data_transacao', filters.data_fim);
    }
    if (filters?.responsavel) {
      query = query.eq('responsavel', filters.responsavel);
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
 * Busca uma transação específica por ID
 */
export async function getTransaction(id: string) {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select(
        `
        *,
        categoria:categories(*)
      `
      )
      .eq('id', id)
      .single();

    if (error) throw error;

    return { data: data as Transaction, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}

/**
 * Cria uma nova transação
 */
export async function createTransaction(
  userId: string,
  formData: TransactionFormData
) {
  try {
    const transactionData = {
      user_id: userId,
      descricao: formData.descricao,
      tipo: formData.tipo,
      categoria_id: formData.categoria_id,
      responsavel: formData.responsavel,
      status: formData.status,
      valor: formData.valor,
      data_transacao: formData.data_transacao,
      data_vencimento: formData.data_vencimento,
      forma_pagamento: formData.forma_pagamento,
      parcelado: formData.parcelado,
      total_parcelas: formData.total_parcelas || 1,
      parcela_atual: 1,
      observacoes: formData.observacoes,
    };

    // Se for parcelado, criar grupo de parcelas
    if (formData.parcelado && formData.total_parcelas && formData.total_parcelas > 1) {
      return await createInstallments(userId, formData);
    }

    const { data, error } = await supabase
      .from('transactions')
      .insert([transactionData])
      .select()
      .single();

    if (error) throw error;

    return { data: data as Transaction, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}

/**
 * Cria transações parceladas
 */
async function createInstallments(
  userId: string,
  formData: TransactionFormData
) {
  try {
    const grupoParcelaId = crypto.randomUUID();
    const valorParcela = formData.valor / (formData.total_parcelas || 1);
    const dataInicial = new Date(formData.data_transacao);

    const parcelas = [];

    for (let i = 0; i < (formData.total_parcelas || 1); i++) {
      const dataParcela = addMonths(dataInicial, i);
      const dataVencimentoParcela = formData.data_vencimento
        ? addMonths(new Date(formData.data_vencimento), i)
        : undefined;

      parcelas.push({
        user_id: userId,
        descricao: `${formData.descricao} (${i + 1}/${formData.total_parcelas})`,
        tipo: formData.tipo,
        categoria_id: formData.categoria_id,
        responsavel: formData.responsavel,
        status: i === 0 ? formData.status : 'andamento',
        valor: valorParcela,
        data_transacao: formatDateISO(dataParcela),
        data_vencimento: dataVencimentoParcela
          ? formatDateISO(dataVencimentoParcela)
          : undefined,
        forma_pagamento: formData.forma_pagamento,
        parcelado: true,
        total_parcelas: formData.total_parcelas,
        parcela_atual: i + 1,
        grupo_parcela_id: grupoParcelaId,
        observacoes: formData.observacoes,
      });
    }

    const { data, error } = await supabase
      .from('transactions')
      .insert(parcelas)
      .select();

    if (error) throw error;

    return { data: data as Transaction[], error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}

/**
 * Atualiza uma transação existente
 */
export async function updateTransaction(
  id: string,
  formData: Partial<TransactionFormData>
) {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .update(formData)
      .eq('id', id)
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
export async function deleteTransaction(id: string) {
  try {
    const { error } = await supabase.from('transactions').delete().eq('id', id);

    if (error) throw error;

    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * Deleta todas as parcelas de um grupo
 */
export async function deleteInstallmentGroup(grupoParcelaId: string) {
  try {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('grupo_parcela_id', grupoParcelaId);

    if (error) throw error;

    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
}
