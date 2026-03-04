// ============================================
// FINACO - Services: Rendas Fixas
// Operações CRUD para rendas fixas mensais
// ============================================

import { supabase } from '@/lib/supabase';
import type { FixedIncome, FixedIncomeFormData } from '@/types';

// ============================================
// CRUD Operations
// ============================================

// Buscar todas as rendas fixas do usuário
export async function getFixedIncome(userId: string): Promise<{ data: FixedIncome[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('fixed_income')
      .select('*')
      .eq('user_id', userId)
      .eq('ativo', true)
      .order('dia_recebimento', { ascending: true });

    if (error) throw error;

    return { data: data as FixedIncome[], error: null };
  } catch (error: any) {
    console.error('Erro ao buscar rendas fixas:', error);
    return { data: null, error: error.message };
  }
}

// Buscar renda fixa por ID
export async function getFixedIncomeById(id: string): Promise<{ data: FixedIncome | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('fixed_income')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    return { data: data as FixedIncome, error: null };
  } catch (error: any) {
    console.error('Erro ao buscar renda fixa:', error);
    return { data: null, error: error.message };
  }
}

// Criar nova renda fixa
export async function createFixedIncome(userId: string, income: FixedIncomeFormData): Promise<{ data: FixedIncome | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('fixed_income')
      .insert({
        user_id: userId,
        ...income
      })
      .select('*')
      .single();

    if (error) throw error;

    return { data: data as FixedIncome, error: null };
  } catch (error: any) {
    console.error('Erro ao criar renda fixa:', error);
    return { data: null, error: error.message };
  }
}

// Atualizar renda fixa
export async function updateFixedIncome(id: string, income: Partial<FixedIncomeFormData>): Promise<{ data: FixedIncome | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('fixed_income')
      .update(income)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    return { data: data as FixedIncome, error: null };
  } catch (error: any) {
    console.error('Erro ao atualizar renda fixa:', error);
    return { data: null, error: error.message };
  }
}

// Excluir (desativar) renda fixa
export async function deleteFixedIncome(id: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('fixed_income')
      .update({ ativo: false })
      .eq('id', id);

    if (error) throw error;

    return { error: null };
  } catch (error: any) {
    console.error('Erro ao excluir renda fixa:', error);
    return { error: error.message };
  }
}

// Excluir permanentemente renda fixa
export async function hardDeleteFixedIncome(id: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('fixed_income')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { error: null };
  } catch (error: any) {
    console.error('Erro ao excluir permanentemente renda fixa:', error);
    return { error: error.message };
  }
}

// ============================================
// Operações Específicas
// ============================================

// Buscar rendas fixas por período (recebimento no mês)
export async function getFixedIncomeByMonth(userId: string, year: number, month: number): Promise<{ data: FixedIncome[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('fixed_income')
      .select('*')
      .eq('user_id', userId)
      .eq('ativo', true)
      .order('dia_recebimento', { ascending: true });

    if (error) throw error;

    // Filtrar rendas que são recebidas no mês especificado
    const incomes = data as FixedIncome[];
    const filteredIncomes = incomes.filter(income => {
      // Se o dia de recebimento for maior que 28, verificar se o mês tem esse dia
      const lastDayOfMonth = new Date(year, month, 0).getDate();
      return income.dia_recebimento <= lastDayOfMonth;
    });

    return { data: filteredIncomes, error: null };
  } catch (error: any) {
    console.error('Erro ao buscar rendas fixas do mês:', error);
    return { data: null, error: error.message };
  }
}

// Buscar rendas fixas a receber nos próximos X dias
export async function getFixedIncomeReceivingSoon(userId: string, days: number = 5): Promise<{ data: FixedIncome[] | null; error: string | null }> {
  try {
    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + days);

    const currentDay = today.getDate();
    const targetDay = targetDate.getDate();

    const { data, error } = await supabase
      .from('fixed_income')
      .select('*')
      .eq('user_id', userId)
      .eq('ativo', true)
      .gte('dia_recebimento', currentDay)
      .lte('dia_recebimento', targetDay)
      .order('dia_recebimento', { ascending: true });

    if (error) throw error;

    return { data: data as FixedIncome[], error: null };
  } catch (error: any) {
    console.error('Erro ao buscar rendas a receber em breve:', error);
    return { data: null, error: error.message };
  }
}

// Calcular total de rendas fixas do mês
export async function getFixedIncomeTotal(userId: string, year: number, month: number): Promise<{ data: number | null; error: string | null }> {
  try {
    const { data: incomes, error } = await getFixedIncomeByMonth(userId, year, month);
    
    if (error) throw error;
    if (!incomes) return { data: 0, error: null };

    const total = incomes.reduce((sum, income) => sum + income.valor, 0);
    return { data: total, error: null };
  } catch (error: any) {
    console.error('Erro ao calcular total de rendas fixas:', error);
    return { data: null, error: error.message };
  }
}

// Buscar rendas fixas por tipo
export async function getFixedIncomeByType(userId: string, tipo: 'salario' | 'adiantamento' | 'outro'): Promise<{ data: FixedIncome[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('fixed_income')
      .select('*')
      .eq('user_id', userId)
      .eq('ativo', true)
      .eq('tipo', tipo)
      .order('dia_recebimento', { ascending: true });

    if (error) throw error;

    return { data: data as FixedIncome[], error: null };
  } catch (error: any) {
    console.error('Erro ao buscar rendas fixas por tipo:', error);
    return { data: null, error: error.message };
  }
}

// ============================================
// Validações
// ============================================

// Validar dados do formulário
export function validateFixedIncomeForm(data: FixedIncomeFormData): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (!data.descricao || data.descricao.trim().length < 3) {
    errors.descricao = 'Descrição deve ter pelo menos 3 caracteres';
  }

  if (!data.valor || data.valor <= 0) {
    errors.valor = 'Valor deve ser maior que zero';
  }

  if (!data.dia_recebimento || data.dia_recebimento < 1 || data.dia_recebimento > 31) {
    errors.dia_recebimento = 'Dia de recebimento deve estar entre 1 e 31';
  }

  if (!data.tipo || !['salario', 'adiantamento', 'outro'].includes(data.tipo)) {
    errors.tipo = 'Tipo é inválido';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

// ============================================
// Utilitários
// ============================================

// Verificar se renda já foi recebida no mês
export async function checkIncomeReceivedThisMonth(userId: string, incomeId: string, year: number, month: number): Promise<{ data: boolean | null; error: string | null }> {
  try {
    // Buscar a renda fixa
    const { data: income, error: incomeError } = await getFixedIncomeById(incomeId);
    if (incomeError || !income) {
      return { data: null, error: incomeError || 'Renda não encontrada' };
    }

    // Buscar transações do mês para ver se já foi recebida
    const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
    const monthEnd = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;

    const { data: transactions, error: transError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('tipo', 'receita')
      .ilike('descricao', `%${income.descricao}%`)
      .gte('data_transacao', monthStart)
      .lte('data_transacao', monthEnd);

    if (transError) throw transError;

    const wasReceived = transactions && transactions.length > 0;
    return { data: wasReceived, error: null };
  } catch (error: any) {
    console.error('Erro ao verificar se renda foi recebida:', error);
    return { data: null, error: error.message };
  }
}
