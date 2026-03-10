// ============================================
// FINACO - Services: Investimentos
// CRUD via Supabase para carteira de investimentos
// ============================================

import { supabase } from '@/lib/supabase';
import type { Investment, InvestmentFormData } from '@/types';

export async function getInvestments(
  userId: string
): Promise<{ data: Investment[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('investments')
      .select('*')
      .eq('user_id', userId)
      .eq('ativo', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: data as Investment[], error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

export async function createInvestment(
  userId: string,
  form: InvestmentFormData
): Promise<{ data: Investment | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('investments')
      .insert({ user_id: userId, ...form })
      .select()
      .single();

    if (error) throw error;
    return { data: data as Investment, error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

export async function updateInvestment(
  id: string,
  form: Partial<InvestmentFormData>
): Promise<{ data: Investment | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('investments')
      .update({ ...form, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data: data as Investment, error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

/**
 * Upsert por nome+tipo+instituicao: se já existir, atualiza; senão cria.
 * Evita duplicatas em reimportações do Pluggy.
 */
export async function upsertInvestment(
  userId: string,
  form: InvestmentFormData
): Promise<{ data: Investment | null; error: string | null }> {
  try {
    const { data: existing } = await supabase
      .from('investments')
      .select('id')
      .eq('user_id', userId)
      .eq('ativo', true)
      .ilike('nome', form.nome.trim())
      .eq('tipo', form.tipo)
      .ilike('instituicao', form.instituicao.trim())
      .maybeSingle();

    if (existing) {
      return updateInvestment(existing.id, form);
    }
    return createInvestment(userId, form);
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

export async function deleteInvestment(
  id: string
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('investments')
      .update({ ativo: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    return { error: null };
  } catch (err: any) {
    return { error: err.message };
  }
}

