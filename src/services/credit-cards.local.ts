// ============================================
// FINACO - Services: Cartões de Crédito
// CRUD e lógica de faturas
// ============================================

import { supabase } from '@/lib/supabase';
import type { CreditCard, CreditCardFormData, Invoice, InvoiceItem } from '@/types';

// ============================================
// CRUD
// ============================================

export async function getCreditCards(userId: string): Promise<{ data: CreditCard[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('credit_cards')
      .select('*')
      .eq('user_id', userId)
      .eq('ativo', true)
      .order('nome');
    if (error) throw error;
    return { data: data as CreditCard[], error: null };
  } catch (e: any) {
    return { data: null, error: e.message };
  }
}

export async function createCreditCard(userId: string, formData: CreditCardFormData): Promise<{ data: CreditCard | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('credit_cards')
      .insert({ user_id: userId, ...formData })
      .select('*')
      .single();
    if (error) throw error;
    return { data: data as CreditCard, error: null };
  } catch (e: any) {
    return { data: null, error: e.message };
  }
}

export async function updateCreditCard(id: string, updates: Partial<CreditCardFormData>): Promise<{ data: CreditCard | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('credit_cards')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return { data: data as CreditCard, error: null };
  } catch (e: any) {
    return { data: null, error: e.message };
  }
}

export async function deleteCreditCard(id: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('credit_cards')
      .update({ ativo: false })
      .eq('id', id);
    if (error) throw error;
    return { error: null };
  } catch (e: any) {
    return { error: e.message };
  }
}

// ============================================
// Lógica de Faturas
// ============================================

/**
 * Calcula em qual mês de vencimento cai uma compra,
 * baseado no dia de fechamento do cartão.
 *
 * Regra: se a compra for DEPOIS do fechamento, vai para a próxima fatura.
 * Exemplo: fechamento dia 7, compra dia 8 → próxima fatura.
 */
export function getInvoiceMonth(
  purchaseDate: Date,
  diaFechamento: number,
  diaVencimento: number
): Date {
  const day = purchaseDate.getDate();
  let year = purchaseDate.getFullYear();
  let month = purchaseDate.getMonth(); // 0-indexed

  // Se a compra foi após o fechamento, vai para a fatura do mês seguinte
  if (day > diaFechamento) {
    month += 1;
    if (month > 11) { month = 0; year += 1; }
  }

  // O vencimento é no mês calculado, no dia de vencimento
  // Se o dia de vencimento for antes do fim do mês, usa ele; senão usa o último dia
  const lastDay = new Date(year, month + 1, 0).getDate();
  const effectiveDay = Math.min(diaVencimento, lastDay);
  return new Date(year, month, effectiveDay);
}

/**
 * Calcula o melhor dia para fazer compras no cartão
 * (dia após o fechamento, para ter mais prazo até o vencimento)
 */
export function getMelhorDiaCompra(diaFechamento: number): number {
  return diaFechamento === 31 ? 1 : diaFechamento + 1;
}

/**
 * Calcula quantos dias a mais o comprador ganha ao comprar no melhor dia
 */
export function getDiasExtraPrazo(diaFechamento: number, diaVencimento: number): number {
  // Dias do fechamento até o vencimento (aprox. dentro do próximo ciclo)
  // Exemplo: fecha dia 7, vence dia 15 → 8 dias após fechamento + ~30 dias = ~38 dias
  const diasAteVencimento = diaVencimento > diaFechamento
    ? diaVencimento - diaFechamento
    : 30 + diaVencimento - diaFechamento;
  return diasAteVencimento + 30; // aproximação
}

/**
 * Busca as transações de um cartão em um determinado mês de fatura
 */
export async function getInvoice(
  userId: string,
  cardId: string,
  invoiceYear: number,
  invoiceMonth: number // 1-indexed
): Promise<{ data: Invoice | null; error: string | null }> {
  try {
    // 1. Buscar o cartão
    const { data: cardData, error: cardError } = await supabase
      .from('credit_cards')
      .select('*')
      .eq('id', cardId)
      .single();

    if (cardError || !cardData) throw new Error('Cartão não encontrado');
    const card = cardData as CreditCard;

    // 2. Calcular o período da fatura
    //    A fatura vence em invoiceYear/invoiceMonth.
    //    As compras que entram nessa fatura vão de (fechamento+1 do mês anterior)
    //    até (fechamento do mês atual).
    const prevMonth = invoiceMonth === 1 ? 12 : invoiceMonth - 1;
    const prevYear = invoiceMonth === 1 ? invoiceYear - 1 : invoiceYear;
    const lastDayPrev = new Date(prevYear, prevMonth, 0).getDate();
    const closingDay = Math.min(card.dia_fechamento, lastDayPrev);

    const startDate = new Date(prevYear, prevMonth - 1, closingDay + 1);
    const endDate = new Date(invoiceYear, invoiceMonth - 1, Math.min(card.dia_fechamento, new Date(invoiceYear, invoiceMonth, 0).getDate()));

    const startISO = startDate.toISOString().split('T')[0];
    const endISO = endDate.toISOString().split('T')[0];

    // 3. Buscar transações do cartão no período
    //    Inclui: (a) cartao_id = cardId  OU  (b) forma_pagamento = card.nome E parcelado = true
    const { data: txById, error: txError } = await supabase
      .from('transactions')
      .select('id, descricao, valor, data_transacao, parcela_atual, total_parcelas, parcelado, forma_pagamento, categoria:categories(nome, cor)')
      .eq('user_id', userId)
      .eq('cartao_id', cardId)
      .eq('tipo', 'despesa')
      .gte('data_transacao', startISO)
      .lte('data_transacao', endISO)
      .order('data_transacao');

    if (txError) throw txError;

    // Transações sem cartao_id mas com forma_pagamento = nome do cartão E parcelado
    const { data: txByName } = await supabase
      .from('transactions')
      .select('id, descricao, valor, data_transacao, parcela_atual, total_parcelas, parcelado, forma_pagamento, categoria:categories(nome, cor)')
      .eq('user_id', userId)
      .is('cartao_id', null)
      .eq('forma_pagamento', card.nome)
      .eq('tipo', 'despesa')
      .eq('parcelado', true)
      .gte('data_transacao', startISO)
      .lte('data_transacao', endISO)
      .order('data_transacao');

    const allTx = [...(txById ?? []), ...(txByName ?? [])];
    // Deduplica por id (caso cartao_id e forma_pagamento coincidam)
    const seen = new Set<string>();
    const txData = allTx.filter((t: any) => { if (seen.has(t.id)) return false; seen.add(t.id); return true; });

    const itens: InvoiceItem[] = (txData ?? []).map((t: any) => ({
      id: t.id,
      descricao: t.descricao,
      valor: Number(t.valor),
      data_transacao: t.data_transacao,
      parcela_atual: t.parcela_atual,
      total_parcelas: t.total_parcelas,
      categoria: t.categoria,
    }));

    const total = itens.reduce((s, i) => s + i.valor, 0);
    const lastDay = new Date(invoiceYear, invoiceMonth, 0).getDate();
    const vencimentoDay = Math.min(card.dia_vencimento, lastDay);
    const vencimento = `${invoiceYear}-${String(invoiceMonth).padStart(2, '0')}-${String(vencimentoDay).padStart(2, '0')}`;

    return {
      data: {
        cartao: card,
        mes: `${invoiceYear}-${String(invoiceMonth).padStart(2, '0')}`,
        vencimento,
        itens,
        total,
      },
      error: null,
    };
  } catch (e: any) {
    return { data: null, error: e.message };
  }
}
