// ============================================
// FINACO - Services: Gastos Fixos
// Operações CRUD para gastos fixos mensais
// ============================================

import { supabase } from '@/lib/supabase';
import type { FixedExpense, FixedExpenseFormData } from '@/types';

// ============================================
// CRUD Operations
// ============================================

// Buscar todos os gastos fixos do usuário
export async function getFixedExpenses(userId: string): Promise<{ data: FixedExpense[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('fixed_expenses')
      .select(`
        *,
        categoria:categories(*)
      `)
      .eq('user_id', userId)
      .eq('ativo', true)
      .order('dia_vencimento', { ascending: true });

    if (error) throw error;

    return { data: data as FixedExpense[], error: null };
  } catch (error: any) {
    console.error('Erro ao buscar gastos fixos:', error);
    return { data: null, error: error.message };
  }
}

// Buscar gasto fixo por ID
export async function getFixedExpenseById(id: string): Promise<{ data: FixedExpense | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('fixed_expenses')
      .select(`
        *,
        categoria:categories(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    return { data: data as FixedExpense, error: null };
  } catch (error: any) {
    console.error('Erro ao buscar gasto fixo:', error);
    return { data: null, error: error.message };
  }
}

// Criar novo gasto fixo
export async function createFixedExpense(userId: string, expense: FixedExpenseFormData): Promise<{ data: FixedExpense | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('fixed_expenses')
      .insert({
        user_id: userId,
        ...expense
      })
      .select(`
        *,
        categoria:categories(*)
      `)
      .single();

    if (error) throw error;

    return { data: data as FixedExpense, error: null };
  } catch (error: any) {
    console.error('Erro ao criar gasto fixo:', error);
    return { data: null, error: error.message };
  }
}

// Atualizar gasto fixo
export async function updateFixedExpense(id: string, expense: Partial<FixedExpenseFormData>): Promise<{ data: FixedExpense | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('fixed_expenses')
      .update(expense)
      .eq('id', id)
      .select(`
        *,
        categoria:categories(*)
      `)
      .single();

    if (error) throw error;

    return { data: data as FixedExpense, error: null };
  } catch (error: any) {
    console.error('Erro ao atualizar gasto fixo:', error);
    return { data: null, error: error.message };
  }
}

// Excluir (desativar) gasto fixo
export async function deleteFixedExpense(id: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('fixed_expenses')
      .update({ ativo: false })
      .eq('id', id);

    if (error) throw error;

    return { error: null };
  } catch (error: any) {
    console.error('Erro ao excluir gasto fixo:', error);
    return { error: error.message };
  }
}

// Excluir permanentemente gasto fixo
export async function hardDeleteFixedExpense(id: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('fixed_expenses')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { error: null };
  } catch (error: any) {
    console.error('Erro ao excluir permanentemente gasto fixo:', error);
    return { error: error.message };
  }
}

// ============================================
// Operações Específicas
// ============================================

// Buscar gastos fixos por período (vencimento no mês)
export async function getFixedExpensesByMonth(userId: string, year: number, month: number): Promise<{ data: FixedExpense[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('fixed_expenses')
      .select(`
        *,
        categoria:categories(*)
      `)
      .eq('user_id', userId)
      .eq('ativo', true)
      .order('dia_vencimento', { ascending: true });

    if (error) throw error;

    // Filtrar gastos que vencem no mês especificado
    const expenses = data as FixedExpense[];
    const filteredExpenses = expenses.filter(expense => {
      // Se o dia de vencimento for maior que 28, verificar se o mês tem esse dia
      const lastDayOfMonth = new Date(year, month, 0).getDate();
      return expense.dia_vencimento <= lastDayOfMonth;
    });

    return { data: filteredExpenses, error: null };
  } catch (error: any) {
    console.error('Erro ao buscar gastos fixos do mês:', error);
    return { data: null, error: error.message };
  }
}

// Buscar gastos fixos vencendo nos próximos X dias
export async function getFixedExpensesDueSoon(userId: string, days: number = 5): Promise<{ data: FixedExpense[] | null; error: string | null }> {
  try {
    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + days);

    const currentDay = today.getDate();
    const targetDay = targetDate.getDate();

    const { data, error } = await supabase
      .from('fixed_expenses')
      .select(`
        *,
        categoria:categories(*)
      `)
      .eq('user_id', userId)
      .eq('ativo', true)
      .gte('dia_vencimento', currentDay)
      .lte('dia_vencimento', targetDay)
      .order('dia_vencimento', { ascending: true });

    if (error) throw error;

    return { data: data as FixedExpense[], error: null };
  } catch (error: any) {
    console.error('Erro ao buscar gastos vencendo em breve:', error);
    return { data: null, error: error.message };
  }
}

// Calcular total de gastos fixos do mês
export async function getFixedExpensesTotal(userId: string, year: number, month: number): Promise<{ data: number | null; error: string | null }> {
  try {
    const { data: expenses, error } = await getFixedExpensesByMonth(userId, year, month);
    
    if (error) throw error;
    if (!expenses) return { data: 0, error: null };

    const total = expenses.reduce((sum, expense) => sum + expense.valor, 0);
    return { data: total, error: null };
  } catch (error: any) {
    console.error('Erro ao calcular total de gastos fixos:', error);
    return { data: null, error: error.message };
  }
}

// ============================================
// Validações
// ============================================

// Validar dados do formulário
export function validateFixedExpenseForm(data: FixedExpenseFormData): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (!data.descricao || data.descricao.trim().length < 3) {
    errors.descricao = 'Descrição deve ter pelo menos 3 caracteres';
  }

  if (!data.valor || data.valor <= 0) {
    errors.valor = 'Valor deve ser maior que zero';
  }

  if (!data.dia_vencimento || data.dia_vencimento < 1 || data.dia_vencimento > 31) {
    errors.dia_vencimento = 'Dia de vencimento deve estar entre 1 e 31';
  }

  if (!data.categoria_id) {
    errors.categoria_id = 'Categoria é obrigatória';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
