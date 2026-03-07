// ============================================
// FINACO - Serviços de Análises Financeiras
// Funções para cálculos e insights financeiros
// ============================================

'use client';

import { supabase } from '@/lib/supabase';
import type {
  FinancialSummary,
  CategorySummary,
  MonthlyTrend,
  FinancialScore,
  WeekdayExpense,
  DailyExpense,
  Transaction,
} from '@/types';
import { getMonthRange } from '@/lib/utils';

/**
 * Calcula o resumo financeiro do mês
 */
export async function getFinancialSummary(
  userId: string,
  month: Date
): Promise<FinancialSummary> {
  const { start, end } = getMonthRange(month);

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .gte('data_transacao', start.toISOString().split('T')[0])
    .lte('data_transacao', end.toISOString().split('T')[0]);

  if (!transactions) {
    return {
      receita_total: 0,
      despesa_total: 0,
      saldo: 0,
      economia_percentual: 0,
      contas_vencidas: 0,
      contas_pendentes: 0,
    };
  }

  const receita_total = transactions
    .filter((t) => t.tipo === 'receita')
    .reduce((sum, t) => sum + Number(t.valor), 0);

  const despesa_total = transactions
    .filter((t) => t.tipo === 'despesa')
    .reduce((sum, t) => sum + Number(t.valor), 0);

  const saldo = receita_total - despesa_total;

  const economia_percentual =
    receita_total > 0 ? ((saldo / receita_total) * 100) : 0;

  const contas_vencidas = transactions.filter((t) => t.status === 'vencido').length;

  const contas_pendentes = transactions.filter(
    (t) => t.status === 'andamento'
  ).length;

  return {
    receita_total,
    despesa_total,
    saldo,
    economia_percentual,
    contas_vencidas,
    contas_pendentes,
  };
}

/**
 * Calcula gastos por categoria
 */
export async function getCategoryExpenses(
  userId: string,
  month: Date,
  tipo: 'receita' | 'despesa'
): Promise<CategorySummary[]> {
  const { start, end } = getMonthRange(month);

  const { data: transactions } = await supabase
    .from('transactions')
    .select(
      `
      *,
      categoria:categories(*)
    `
    )
    .eq('user_id', userId)
    .eq('tipo', tipo)
    .gte('data_transacao', start.toISOString().split('T')[0])
    .lte('data_transacao', end.toISOString().split('T')[0]);

  if (!transactions) return [];

  // Agrupar por categoria
  const categoryMap = new Map<string, CategorySummary>();

  transactions.forEach((t: any) => {
    const catId = t.categoria_id || 'sem-categoria';
    const catName = t.categoria?.nome || 'Sem Categoria';
    const catColor = t.categoria?.cor || '#64748B';

    if (categoryMap.has(catId)) {
      const existing = categoryMap.get(catId)!;
      existing.total += Number(t.valor);
      existing.quantidade += 1;
    } else {
      categoryMap.set(catId, {
        categoria_id: catId,
        categoria_nome: catName,
        categoria_cor: catColor,
        total: Number(t.valor),
        percentual: 0,
        quantidade: 1,
      });
    }
  });

  const result = Array.from(categoryMap.values());
  const total = result.reduce((sum, c) => sum + c.total, 0);

  // Calcular percentuais
  result.forEach((c) => {
    c.percentual = total > 0 ? Math.round((c.total / total) * 100) : 0;
  });

  return result.sort((a, b) => b.total - a.total);
}

/**
 * Calcula gastos por dia do mês
 */
export async function getDailyExpenses(
  userId: string,
  month: Date
): Promise<DailyExpense[]> {
  const { start, end } = getMonthRange(month);
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('tipo', 'despesa')
    .gte('data_transacao', start.toISOString().split('T')[0])
    .lte('data_transacao', end.toISOString().split('T')[0]);

  // Criar mapa de dias do mês
  const dailyMap = new Map<number, number>();
  
  (transactions || []).forEach((t: Transaction) => {
    const date = new Date(t.data_transacao);
    const dayNumber = date.getDate();
    console.log('📊 Contabilizando transação no dia:', dayNumber, '| Data:', t.data_transacao, '| Descrição:', t.descricao.substring(0, 30));
    dailyMap.set(dayNumber, (dailyMap.get(dayNumber) || 0) + Number(t.valor));
  });

  // Criar array com todos os dias do mês
  const result: DailyExpense[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    result.push({
      dia: String(day).padStart(2, '0'),
      total: dailyMap.get(day) || 0,
      quantidade: 0
    });
  }

  return result;
}

/**
 * Calcula gastos por dia da semana
 */
export async function getWeekdayExpenses(
  userId: string,
  month: Date
): Promise<WeekdayExpense[]> {
  const { start, end } = getMonthRange(month);

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('tipo', 'despesa')
    .gte('data_transacao', start.toISOString().split('T')[0])
    .lte('data_transacao', end.toISOString().split('T')[0]);

  if (!transactions) return [];

  const weekdayMap = new Map<number, { total: number; count: number }>();

  transactions.forEach((t) => {
    const date = new Date(t.data_transacao);
    const dayOfWeek = date.getDay();

    if (weekdayMap.has(dayOfWeek)) {
      const existing = weekdayMap.get(dayOfWeek)!;
      existing.total += Number(t.valor);
      existing.count += 1;
    } else {
      weekdayMap.set(dayOfWeek, {
        total: Number(t.valor),
        count: 1,
      });
    }
  });

  const weekdays = [
    'Domingo',
    'Segunda',
    'Terça',
    'Quarta',
    'Quinta',
    'Sexta',
    'Sábado',
  ];

  return Array.from(weekdayMap.entries())
    .map(([day, data]) => ({
      dia_semana: weekdays[day],
      dia_numero: day,
      total: data.total,
      media: data.total / data.count,
    }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Calcula tendência mensal (últimos 6 meses)
 */
export async function getMonthlyTrend(
  userId: string
): Promise<MonthlyTrend[]> {
  const now = new Date();
  const trends: MonthlyTrend[] = [];

  for (let i = 5; i >= 0; i--) {
    const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const { start, end } = getMonthRange(month);

    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('data_transacao', start.toISOString().split('T')[0])
      .lte('data_transacao', end.toISOString().split('T')[0]);

    const receita = transactions
      ?.filter((t) => t.tipo === 'receita')
      .reduce((sum, t) => sum + Number(t.valor), 0) || 0;

    const despesa = transactions
      ?.filter((t) => t.tipo === 'despesa')
      .reduce((sum, t) => sum + Number(t.valor), 0) || 0;

    trends.push({
      mes: month.toLocaleString('pt-BR', { month: 'short' }),
      ano: month.getFullYear(),
      receita,
      despesa,
      saldo: receita - despesa,
    });
  }

  return trends;
}

/**
 * Calcula o score financeiro
 */
export async function calculateFinancialScore(
  userId: string,
  month: Date
): Promise<FinancialScore> {
  const summary = await getFinancialSummary(userId, month);
  const trends = await getMonthlyTrend(userId);

  let score = 0;

  // Fator 1: Saldo positivo (30 pontos)
  const saldo_positivo = summary.saldo > 0;
  if (saldo_positivo) score += 30;

  // Fator 2: Economia adequada (>20%) (30 pontos)
  const economia_adequada = summary.economia_percentual >= 20;
  if (economia_adequada) score += 30;
  else if (summary.economia_percentual > 0) score += 15;

  // Fator 3: Sem contas vencidas (20 pontos)
  const sem_vencidos = summary.contas_vencidas === 0;
  if (sem_vencidos) score += 20;

  // Fator 4: Tendência positiva (20 pontos)
  const tendencia_positiva =
    trends.length >= 2 &&
    trends[trends.length - 1].saldo > trends[trends.length - 2].saldo;
  if (tendencia_positiva) score += 20;

  // Determinar nível
  let nivel: FinancialScore['nivel'];
  let mensagem: string;

  if (score >= 80) {
    nivel = 'excelente';
    mensagem = 'Sua saúde financeira está excelente! Continue assim!';
  } else if (score >= 60) {
    nivel = 'bom';
    mensagem = 'Sua saúde financeira está boa, mas pode melhorar.';
  } else if (score >= 40) {
    nivel = 'atencao';
    mensagem = 'Atenção! Sua saúde financeira precisa de cuidados.';
  } else {
    nivel = 'risco';
    mensagem = 'Cuidado! Você está em risco financeiro.';
  }

  return {
    score,
    nivel,
    mensagem,
    fatores: {
      saldo_positivo,
      economia_adequada,
      sem_vencidos,
      tendencia_positiva,
    },
  };
}

/**
 * Gera insights automáticos
 */
export async function generateInsights(userId: string, month: Date) {
  const summary = await getFinancialSummary(userId, month);
  const categoryExpenses = await getCategoryExpenses(userId, month, 'despesa');
  const weekdayExpenses = await getWeekdayExpenses(userId, month);

  const insights = [];

  // Insight: Categoria com maior gasto
  if (categoryExpenses.length > 0) {
    const topCategory = categoryExpenses[0];
    insights.push({
      user_id: userId,
      mensagem: `Seu maior gasto este mês foi em ${topCategory.categoria_nome} (${topCategory.percentual}% do total)`,
      nivel: 'info' as const,
      tipo: 'categoria',
      valor_referencia: topCategory.total,
    });
  }

  // Insight: Dia da semana com maior gasto
  if (weekdayExpenses.length > 0) {
    const topWeekday = weekdayExpenses[0];
    insights.push({
      user_id: userId,
      mensagem: `Você gasta mais às ${topWeekday.dia_semana}s`,
      nivel: 'info' as const,
      tipo: 'comportamento',
      valor_referencia: topWeekday.total,
    });
  }

  // Insight: Contas vencidas
  if (summary.contas_vencidas > 0) {
    insights.push({
      user_id: userId,
      mensagem: `Você tem ${summary.contas_vencidas} conta(s) vencida(s)`,
      nivel: 'alerta' as const,
      tipo: 'vencimento',
      valor_referencia: summary.contas_vencidas,
    });
  }

  // Insight: Saldo negativo
  if (summary.saldo < 0) {
    insights.push({
      user_id: userId,
      mensagem: `Atenção! Suas despesas superaram suas receitas em ${Math.abs(
        summary.saldo
      ).toFixed(2)}`,
      nivel: 'risco' as const,
      tipo: 'saldo',
      valor_referencia: summary.saldo,
    });
  }

  // Salvar insights no banco
  for (const insight of insights) {
    await supabase.from('insights').insert([insight]);
  }

  return insights;
}
